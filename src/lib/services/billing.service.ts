import { Prisma, PaymentMethod, StockMovementType, PhoneUnitStatus } from "@prisma/client";
import { z } from "zod";
import { requireRole, hasRole } from "@/lib/auth/permissions";
import { AppError, unitNotAvailable, insufficientStock, notFound } from "@/lib/errors/AppError";
import { zCreateBillBody, zListBillsQuery } from "@/lib/validators/bill";
import {
  billRepo,
  productRepo,
  phoneUnitRepo,
  stockMovementRepo,
  auditLogRepo,
  systemConfigRepo,
} from "@/lib/repositories";
import prisma from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";

export interface ReceiptItemData {
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  unitSku: string | null;
  unitGrade: string | null;
  unitStorage: string | null;
  unitColor: string | null;
  unitCondition: string | null;
  unitHasBox: boolean | null;
  unitHasCharger: boolean | null;
}

export interface ReceiptData {
  billId: string;
  billNumber: string;
  createdAt: Date;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  staffName: string;
  items: ReceiptItemData[];
  shop: {
    name: string;
    address: string;
    phone: string;
    whatsapp: string;
    currencySymbol: string;
    receiptFooter: string;
  };
}

export class BillingService {
  /**
   * Helper to write a standardized audit log entry for billing mutations.
   */
  private static async logAuditEvent(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    entityId: string,
    oldData: any = null,
    newData: any = null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await auditLogRepo.create(
      {
        userId,
        action,
        entityType: "BILL",
        entityId,
        oldData: oldData ?? Prisma.JsonNull,
        newData: newData ?? Prisma.JsonNull,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      tx
    );
  }

  /**
   * Create a new bill in a single, concurrency-safe database transaction.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   */
  static async createBill(
    user: SessionPayload,
    data: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization: STAFF role or higher
    requireRole(user.role, "STAFF");

    // 2. Validate request body
    const validated = zCreateBillBody.parse(data);

    // 3. Execute billing workflow inside a transaction
    return prisma.$transaction(async (tx) => {
      // Keep track of products and units to update/validate
      const billItemsToCreate: Prisma.BillItemCreateManyBillInput[] = [];
      const stockMovementsToCreate: Prisma.StockMovementUncheckedCreateInput[] = [];
      const affectedProductIds: string[] = [];

      let calculatedSubtotal = new Prisma.Decimal(0);

      // A. Process each item in the bill
      for (const item of validated.items) {
        // Find parent product model
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw notFound("Product", item.productId);
        }

        // Validate item pricing
        if (item.unitPrice < 0) {
          throw new AppError("VALIDATION_ERROR", "Item unit price cannot be negative.");
        }
        if (item.discount < 0) {
          throw new AppError("VALIDATION_ERROR", "Item discount cannot be negative.");
        }
        if (item.discount > item.unitPrice) {
          throw new AppError("VALIDATION_ERROR", "Item discount cannot exceed unit price.");
        }

        const quantity = item.quantity;
        const unitPrice = new Prisma.Decimal(item.unitPrice);
        const discount = new Prisma.Decimal(item.discount ?? 0);
        const lineTotal = unitPrice.minus(discount).times(quantity);

        calculatedSubtotal = calculatedSubtotal.plus(lineTotal);

        if (item.phoneUnitId) {
          // UNIT-TRACKED ITEM
          if (quantity !== 1) {
            throw new AppError(
              "VALIDATION_ERROR",
              "Quantity must be exactly 1 for unit-tracked physical items."
            );
          }

          // 1. Lock the active phone_unit row to prevent double selling
          const unit = await tx.phoneUnit.findUnique({
            where: { id: item.phoneUnitId },
          });
          if (!unit) {
            throw notFound("Phone unit", item.phoneUnitId);
          }

          // Issue raw FOR UPDATE query to acquire row lock
          const locked = await phoneUnitRepo.lockForUpdate(item.phoneUnitId, tx);
          if (!locked || locked.status !== "AVAILABLE" || locked.deletedAt !== null) {
            throw unitNotAvailable(
              item.phoneUnitId,
              unit.sku,
              locked?.status ?? "DELETED"
            );
          }

          // 2. Prepare denormalized fields
          billItemsToCreate.push({
            productId: item.productId,
            phoneUnitId: item.phoneUnitId,
            quantity: 1,
            unitPrice,
            discount,
            lineTotal,
            productName: product.name,
            productSku: product.sku,
            unitSku: unit.sku,
            unitGrade: unit.grade ?? null,
            unitStorage: unit.storage ?? null,
            unitColor: unit.color ?? null,
            unitCondition: unit.condition,
            unitHasBox: unit.hasBox,
            unitHasCharger: unit.hasCharger,
            unitImei: unit.imei ?? null,
          });

          // 3. Mark unit status = 'SOLD'
          await tx.phoneUnit.update({
            where: { id: item.phoneUnitId },
            data: { status: "SOLD", updatedBy: user.sub },
          });

          // 4. Update parent product stock counts
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              availableUnitCount: { decrement: 1 },
              stockQuantity: { decrement: 1 },
              version: { increment: 1 },
            },
          });

          // 5. Build stock movement payload
          stockMovementsToCreate.push({
            productId: item.productId,
            phoneUnitId: item.phoneUnitId,
            movementType: "UNIT_SOLD" as StockMovementType,
            quantityChange: -1,
            quantityBefore: product.availableUnitCount,
            quantityAfter: updatedProduct.availableUnitCount,
            unitStatusBefore: "AVAILABLE",
            unitStatusAfter: "SOLD",
            referenceType: "BILL",
            notes: `Sold via POS Bill`,
            createdBy: user.sub,
          });

          affectedProductIds.push(item.productId);
        } else {
          // GENERIC (NON-UNIT-TRACKED) ITEM
          // 1. Lock the parent product row to avoid race conditions
          const lockedProduct = await productRepo.lockForUpdate(item.productId, tx);
          if (!lockedProduct) {
            throw notFound("Product", item.productId);
          }

          if (lockedProduct.stockQuantity < quantity) {
            throw insufficientStock(item.productId, quantity, lockedProduct.stockQuantity);
          }

          // 2. Prepare bill item payload
          billItemsToCreate.push({
            productId: item.productId,
            phoneUnitId: null,
            quantity,
            unitPrice,
            discount,
            lineTotal,
            productName: product.name,
            productSku: product.sku,
            unitSku: null,
            unitGrade: null,
            unitStorage: null,
            unitColor: null,
            unitCondition: null,
            unitHasBox: null,
            unitHasCharger: null,
            unitImei: null,
          });

          // 3. Update stock quantity
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { decrement: quantity },
              version: { increment: 1 },
            },
          });

          // 4. Build stock movement payload
          stockMovementsToCreate.push({
            productId: item.productId,
            phoneUnitId: null,
            movementType: "GENERIC_SALE" as StockMovementType,
            quantityChange: -quantity,
            quantityBefore: lockedProduct.stockQuantity,
            quantityAfter: updatedProduct.stockQuantity,
            unitStatusBefore: null,
            unitStatusAfter: null,
            referenceType: "BILL",
            notes: `Sold generic stock via POS Bill`,
            createdBy: user.sub,
          });

          affectedProductIds.push(item.productId);
        }
      }

      // B. Validate header discount and calculate final total
      const headerDiscount = new Prisma.Decimal(validated.discount ?? 0);
      if (headerDiscount.lessThan(0)) {
        throw new AppError("VALIDATION_ERROR", "Header discount cannot be negative.");
      }
      if (headerDiscount.greaterThan(calculatedSubtotal)) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Header discount cannot be greater than the items subtotal."
        );
      }

      const calculatedTotal = calculatedSubtotal.minus(headerDiscount);

      // C. Generate bill number (BILL-YYYYMMDD-XXXX)
      const billNumber = await billRepo.generateBillNumber(tx);

      // D. Insert bill header
      const bill = await tx.bill.create({
        data: {
          billNumber,
          staffId: user.sub,
          customerName: validated.customerName ?? null,
          customerPhone: validated.customerPhone ?? null,
          subtotal: calculatedSubtotal,
          discount: headerDiscount,
          total: calculatedTotal,
          paymentMethod: validated.paymentMethod as PaymentMethod,
          notes: validated.notes ?? null,
        },
      });

      // E. Insert bill items and link to the created bill
      for (const billItem of billItemsToCreate) {
        await tx.billItem.create({
          data: {
            ...billItem,
            billId: bill.id,
          },
        });
      }

      // F. Create stock movement records linked to the bill ID
      for (const sm of stockMovementsToCreate) {
        await tx.stockMovement.create({
          data: {
            ...sm,
            referenceId: bill.id,
          },
        });
      }

      // G. Log audit event
      await this.logAuditEvent(
        tx,
        user.sub,
        "BILL_CREATED",
        bill.id,
        null,
        {
          billId: bill.id,
          billNumber: bill.billNumber,
          total: bill.total.toNumber(),
          itemsCount: validated.items.length,
        },
        ipAddress,
        userAgent
      );

      return {
        id: bill.id,
        billNumber: bill.billNumber,
        total: bill.total.toNumber(),
        affectedProductIds,
      };
    });
  }

  /**
   * Generates Receipt JSON data for a specific bill, excluding sensitive data (IMEI).
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   */
  static async generateReceipt(user: SessionPayload, billId: string): Promise<ReceiptData> {
    requireRole(user.role, "STAFF");

    // 1. Fetch bill with items and creator (staff) details
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        staff: { select: { name: true } },
        billItems: true,
      },
    });

    if (!bill) {
      throw notFound("Bill", billId);
    }

    // 2. Fetch all system configuration properties
    const configs = await prisma.systemConfig.findMany();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    const shopName = configMap.get("shop_name") ?? "Mobile Shop";
    const shopAddress = configMap.get("shop_address") ?? "";
    const shopPhone = configMap.get("shop_phone") ?? "";
    const whatsappNumber = configMap.get("whatsapp_number") ?? "";
    const currencySymbol = configMap.get("currency_symbol") ?? "₹";
    const receiptFooter = configMap.get("receipt_footer") ?? "Thank you for your purchase!";

    // 3. Format items (carefully excluding IMEI code)
    const formattedItems: ReceiptItemData[] = bill.billItems.map((item) => ({
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      discount: item.discount.toNumber(),
      lineTotal: item.lineTotal.toNumber(),
      unitSku: item.unitSku,
      unitGrade: item.unitGrade,
      unitStorage: item.unitStorage,
      unitColor: item.unitColor,
      unitCondition: item.unitCondition,
      unitHasBox: item.unitHasBox,
      unitHasCharger: item.unitHasCharger,
    }));

    // 4. Assemble and return receipt object
    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      createdAt: bill.createdAt,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      paymentMethod: bill.paymentMethod,
      subtotal: bill.subtotal.toNumber(),
      discount: bill.discount.toNumber(),
      total: bill.total.toNumber(),
      notes: bill.notes,
      staffName: bill.staff.name,
      items: formattedItems,
      shop: {
        name: shopName,
        address: shopAddress,
        phone: shopPhone,
        whatsapp: whatsappNumber,
        currencySymbol,
        receiptFooter,
      },
    };
  }

  /**
   * Fetch complete bill details with related items.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   * Enforces staff view boundary (Staff can only view bills they created).
   * Masks IMEI for Staff role.
   */
  static async getBillDetails(user: SessionPayload, id: string) {
    requireRole(user.role, "STAFF");

    const bill = await billRepo.findById(id);
    if (!bill) {
      throw notFound("Bill", id);
    }

    // RBAC: Staff is restricted to viewing bills they created personally
    if (user.role === "STAFF" && bill.staffId !== user.sub) {
      throw new AppError("FORBIDDEN", "You do not have permission to view this bill.");
    }

    const hideImei = !hasRole(user.role, "ADMIN");

    return {
      id: bill.id,
      billNumber: bill.billNumber,
      staffId: bill.staffId,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      subtotal: bill.subtotal.toNumber(),
      discount: bill.discount.toNumber(),
      total: bill.total.toNumber(),
      paymentMethod: bill.paymentMethod,
      notes: bill.notes,
      createdAt: bill.createdAt,
      staff: {
        name: bill.staff.name,
        email: bill.staff.email,
      },
      billItems: bill.billItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        phoneUnitId: item.phoneUnitId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        discount: item.discount.toNumber(),
        lineTotal: item.lineTotal.toNumber(),
        productName: item.productName,
        productSku: item.productSku,
        unitSku: item.unitSku,
        unitGrade: item.unitGrade,
        unitStorage: item.unitStorage,
        unitColor: item.unitColor,
        unitCondition: item.unitCondition,
        unitHasBox: item.unitHasBox,
        unitHasCharger: item.unitHasCharger,
        unitImei: hideImei ? null : item.unitImei,
      })),
    };
  }

  /**
   * Search and list billing records with pagination and filters.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   * Enforces staff view boundary (Staff can only view their own bills).
   */
  static async listBills(user: SessionPayload, query: z.input<typeof zListBillsQuery>) {
    requireRole(user.role, "STAFF");

    const validated = zListBillsQuery.parse(query);
    const { page, pageSize, from, to, staffId, q } = validated;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.BillWhereInput = {};

    // RBAC: Staff is restricted to viewing only their own bills
    if (user.role === "STAFF") {
      where.staffId = user.sub;
    } else if (staffId) {
      where.staffId = staffId;
    }

    // Time-range filter
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    // Text search query
    if (q && q.trim().length > 0) {
      const cleanQ = q.trim();
      where.OR = [
        { billNumber: { contains: cleanQ, mode: "insensitive" } },
        { customerName: { contains: cleanQ, mode: "insensitive" } },
        { customerPhone: { contains: cleanQ, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      billRepo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      billRepo.count(where),
    ]);

    const mappedItems = items.map((bill) => ({
      id: bill.id,
      billNumber: bill.billNumber,
      staffId: bill.staffId,
      staffName: bill.staff.name,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      subtotal: bill.subtotal.toNumber(),
      discount: bill.discount.toNumber(),
      total: bill.total.toNumber(),
      paymentMethod: bill.paymentMethod,
      notes: bill.notes,
      createdAt: bill.createdAt,
    }));

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }

  /**
   * List all staff members for filters (Admin/Super-Admin only).
   * Access role: ADMIN, SUPER_ADMIN.
   */
  static async listStaffMembers(user: SessionPayload) {
    requireRole(user.role, "ADMIN");
    return prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }
}
