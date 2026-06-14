import { z } from "zod";
import { requireRole, hasRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/AppError";
import {
  phoneUnitRepo,
  productRepo,
  stockMovementRepo,
  auditLogRepo,
} from "@/lib/repositories";
import prisma from "@/lib/prisma";
import { Prisma, PhoneUnitStatus, Role, Grade, Condition } from "@prisma/client";
import {
  zCreatePhoneUnitBody,
  zUpdatePhoneUnitBody,
  zChangeUnitStatusBody,
  zListUnitsAdminQuery,
} from "@/lib/validators/phoneUnit";
import type { SessionPayload } from "@/lib/auth/session";
import type {
  AdminPhoneUnitDetail,
  PublicPhoneUnitSummary,
} from "@/lib/types/domain.types";

export class PhoneUnitService {
  /**
   * Helper to write a standardized audit log entry for unit mutations.
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
        entityType: "PHONE_UNIT",
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
   * Helper to write a stock movement log entry.
   */
  private static async logStockMovement(
    tx: Prisma.TransactionClient,
    userId: string,
    productId: string,
    phoneUnitId: string,
    movementType: "UNIT_ADDED" | "UNIT_SOLD" | "UNIT_STATUS_CHANGED" | "UNIT_DELETED",
    quantityChange: number,
    statusBefore: string | null,
    statusAfter: string | null,
    notes?: string
  ): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });
    if (!product) return;

    const quantityBefore = product.availableUnitCount;
    const quantityAfter = quantityBefore + quantityChange;

    await stockMovementRepo.create(
      {
        product: { connect: { id: productId } },
        phoneUnit: { connect: { id: phoneUnitId } },
        movementType,
        quantityChange,
        quantityBefore,
        quantityAfter,
        unitStatusBefore: statusBefore,
        unitStatusAfter: statusAfter,
        notes: notes ?? null,
        creator: { connect: { id: userId } },
      },
      tx
    );
  }

  /**
   * Helper to automatically update parent product counts and visibility inside a transaction.
   */
  private static async syncProductStock(
    tx: Prisma.TransactionClient,
    productId: string
  ): Promise<void> {
    const availableCount = await tx.phoneUnit.count({
      where: { productId, status: "AVAILABLE", deletedAt: null },
    });
    const totalStock = await tx.phoneUnit.count({
      where: { productId, status: { not: "SOLD" }, deletedAt: null },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        availableUnitCount: availableCount,
        stockQuantity: totalStock,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Helper to auto-generate a unique SKU in the format PU-YYYYMMDD-XXXX.
   */
  private static async generateUniqueSku(tx: Prisma.TransactionClient): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const count = await tx.phoneUnit.count({
      where: {
        sku: { startsWith: `PU-${dateStr}-` },
      },
    });

    let seq = count + 1;
    let sku = `PU-${dateStr}-${String(seq).padStart(4, "0")}`;

    let attempts = 0;
    while (attempts < 100) {
      const existing = await tx.phoneUnit.findUnique({ where: { sku } });
      if (!existing) return sku;
      seq++;
      sku = `PU-${dateStr}-${String(seq).padStart(4, "0")}`;
      attempts++;
    }

    throw new AppError("INTERNAL_ERROR", "Failed to generate a unique SKU after multiple attempts.");
  }

  /**
   * Helper to check status transitions.
   */
  private static validateStatusTransition(
    from: PhoneUnitStatus,
    to: PhoneUnitStatus,
    userRole: Role
  ): void {
    if (from === to) return;

    // SOLD can only be modified by SUPER_ADMIN
    if (from === "SOLD" && userRole !== "SUPER_ADMIN") {
      throw new AppError(
        "INVALID_STATUS_TRANSITION",
        "Changing the status of a SOLD unit is restricted to SUPER_ADMIN only."
      );
    }
  }

  /**
   * Create a new phone unit.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async createUnit(
    user: SessionPayload,
    productId: string,
    data: z.input<typeof zCreatePhoneUnitBody>,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Validate data
    const validated = zCreatePhoneUnitBody.parse(data);

    // 3. Find parent product
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with id "${productId}" was not found.`);
    }

    // 4. Validate unique constraints (SKU and IMEI if provided)
    if (validated.sku) {
      const existingSku = await phoneUnitRepo.findBySku(validated.sku);
      if (existingSku) {
        throw new AppError("CONFLICT", `Phone unit SKU "${validated.sku}" already exists.`);
      }
    }

    if (validated.imei) {
      const existingImei = await prisma.phoneUnit.findFirst({
        where: { imei: validated.imei },
      });
      if (existingImei) {
        throw new AppError("CONFLICT", `Phone unit with IMEI "${validated.imei}" already exists.`);
      }
    }

    // 5. Run in a transaction
    return prisma.$transaction(async (tx) => {
      // Auto-generate SKU if not provided
      const sku = validated.sku || (await this.generateUniqueSku(tx));

      const unitInput: Prisma.PhoneUnitUncheckedCreateInput = {
        productId,
        sku,
        imei: validated.imei ?? null,
        storage: validated.storage ?? null,
        color: validated.color ?? null,
        batteryHealth: validated.batteryHealth ?? null,
        grade: (validated.grade as Grade) ?? null,
        condition: validated.condition as Condition,
        hasBox: validated.hasBox ?? false,
        hasCharger: validated.hasCharger ?? false,
        hasEarphones: validated.hasEarphones ?? false,
        hasOriginalAccessories: validated.hasOriginalAccessories ?? false,
        warrantyInfo: validated.warrantyInfo ?? null,
        sellingPrice: validated.sellingPrice !== undefined ? new Prisma.Decimal(validated.sellingPrice) : null,
        purchasePrice: validated.purchasePrice !== undefined ? new Prisma.Decimal(validated.purchasePrice) : null,
        status: "AVAILABLE",
        adminNotes: validated.adminNotes ?? null,
        createdBy: user.sub,
        updatedBy: user.sub,
      };

      const unit = await tx.phoneUnit.create({ data: unitInput });

      // Synchronize product counts
      await this.syncProductStock(tx, productId);

      // Create Stock Movement log
      await this.logStockMovement(
        tx,
        user.sub,
        productId,
        unit.id,
        "UNIT_ADDED",
        1,
        null,
        "AVAILABLE"
      );

      // Create Audit Log entry
      await this.logAuditEvent(
        tx,
        user.sub,
        "UNIT_ADDED",
        unit.id,
        null,
        {
          id: unit.id,
          sku: unit.sku,
          productId: unit.productId,
          status: unit.status,
          condition: unit.condition,
          sellingPrice: unit.sellingPrice ? unit.sellingPrice.toNumber() : null,
        },
        ipAddress,
        userAgent
      );

      return unit;
    });
  }

  /**
   * Update details of an existing phone unit.
   * Access role: ADMIN or SUPER_ADMIN (Note: IMEI is excluded here per design rules).
   */
  static async updateUnit(
    user: SessionPayload,
    id: string,
    data: z.input<typeof zUpdatePhoneUnitBody>,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Validate data
    const validated = zUpdatePhoneUnitBody.parse(data);

    // 3. Find existing unit
    const unit = await phoneUnitRepo.findById(id);
    if (!unit) {
      throw new AppError("NOT_FOUND", `Phone unit with id "${id}" was not found.`);
    }

    // 4. Update inside transaction
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.PhoneUnitUncheckedUpdateInput = {
        storage: validated.storage,
        color: validated.color,
        batteryHealth: validated.batteryHealth,
        grade: (validated.grade as Grade) ?? undefined,
        condition: (validated.condition as Condition) ?? undefined,
        hasBox: validated.hasBox,
        hasCharger: validated.hasCharger,
        hasEarphones: validated.hasEarphones,
        hasOriginalAccessories: validated.hasOriginalAccessories,
        warrantyInfo: validated.warrantyInfo,
        sellingPrice: validated.sellingPrice !== undefined ? new Prisma.Decimal(validated.sellingPrice) : undefined,
        purchasePrice: validated.purchasePrice !== undefined ? new Prisma.Decimal(validated.purchasePrice) : undefined,
        adminNotes: validated.adminNotes,
        updatedBy: user.sub,
      };

      const updated = await tx.phoneUnit.update({
        where: { id },
        data: updateData,
      });

      // Synchronize product stock (prices or grades changing might trigger adjustments or version bumps)
      await this.syncProductStock(tx, unit.productId);

      // Audit Log
      await this.logAuditEvent(
        tx,
        user.sub,
        "UNIT_UPDATED",
        unit.id,
        {
          storage: unit.storage,
          color: unit.color,
          batteryHealth: unit.batteryHealth,
          grade: unit.grade,
          condition: unit.condition,
          sellingPrice: unit.sellingPrice ? unit.sellingPrice.toNumber() : null,
        },
        {
          storage: updated.storage,
          color: updated.color,
          batteryHealth: updated.batteryHealth,
          grade: updated.grade,
          condition: updated.condition,
          sellingPrice: updated.sellingPrice ? updated.sellingPrice.toNumber() : null,
        },
        ipAddress,
        userAgent
      );

      return updated;
    });
  }

  /**
   * Soft delete a unit.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async softDeleteUnit(
    user: SessionPayload,
    id: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Find unit
    const unit = await phoneUnitRepo.findById(id);
    if (!unit) {
      throw new AppError("NOT_FOUND", `Phone unit with id "${id}" was not found.`);
    }
    if (unit.deletedAt) {
      throw new AppError("CONFLICT", "Phone unit is already soft-deleted.");
    }

    // 3. Delete inside transaction
    return prisma.$transaction(async (tx) => {
      const deleted = await phoneUnitRepo.softDelete(id, tx);

      // Synchronize parent product counts
      await this.syncProductStock(tx, unit.productId);

      // Calculate quantity change for stock movement
      const qtyChange = unit.status === "AVAILABLE" ? -1 : 0;

      // Stock movement log
      await this.logStockMovement(
        tx,
        user.sub,
        unit.productId,
        unit.id,
        "UNIT_DELETED",
        qtyChange,
        unit.status,
        null
      );

      // Audit Log
      await this.logAuditEvent(
        tx,
        user.sub,
        "UNIT_DELETED",
        unit.id,
        { deletedAt: null, status: unit.status },
        { deletedAt: deleted.deletedAt, status: unit.status },
        ipAddress,
        userAgent
      );

      return deleted;
    });
  }

  /**
   * Restore a soft-deleted unit.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async restoreUnit(
    user: SessionPayload,
    id: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Find unit
    const unit = await prisma.phoneUnit.findUnique({ where: { id } });
    if (!unit) {
      throw new AppError("NOT_FOUND", `Phone unit with id "${id}" was not found.`);
    }
    if (!unit.deletedAt) {
      throw new AppError("CONFLICT", "Phone unit is not deleted.");
    }

    // 3. Restore in transaction
    return prisma.$transaction(async (tx) => {
      const restored = await phoneUnitRepo.restore(id, tx);

      // Synchronize parent product counts
      await this.syncProductStock(tx, unit.productId);

      const qtyChange = unit.status === "AVAILABLE" ? 1 : 0;

      // Stock movement log
      await this.logStockMovement(
        tx,
        user.sub,
        unit.productId,
        unit.id,
        "UNIT_ADDED",
        qtyChange,
        null,
        unit.status
      );

      // Audit Log
      await this.logAuditEvent(
        tx,
        user.sub,
        "UNIT_RESTORED",
        unit.id,
        { deletedAt: unit.deletedAt, status: unit.status },
        { deletedAt: null, status: unit.status },
        ipAddress,
        userAgent
      );

      return restored;
    });
  }

  /**
   * Change status of a phone unit.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async changeStatus(
    user: SessionPayload,
    id: string,
    toStatus: PhoneUnitStatus,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Find unit
    const unit = await phoneUnitRepo.findById(id);
    if (!unit) {
      throw new AppError("NOT_FOUND", `Phone unit with id "${id}" was not found.`);
    }

    const fromStatus = unit.status;

    // 3. Validate transition
    this.validateStatusTransition(fromStatus, toStatus, user.role);

    if (fromStatus === toStatus) {
      return unit;
    }

    // 4. Update in transaction
    return prisma.$transaction(async (tx) => {
      const updated = await tx.phoneUnit.update({
        where: { id },
        data: { status: toStatus, updatedBy: user.sub },
      });

      // Synchronize product counts
      await this.syncProductStock(tx, unit.productId);

      // Calculate stock movement quantity changes
      let qtyChange = 0;
      if (fromStatus === "AVAILABLE" && toStatus !== "AVAILABLE") {
        qtyChange = -1;
      } else if (fromStatus !== "AVAILABLE" && toStatus === "AVAILABLE") {
        qtyChange = 1;
      }

      const movementType = toStatus === "SOLD" ? "UNIT_SOLD" : "UNIT_STATUS_CHANGED";

      await this.logStockMovement(
        tx,
        user.sub,
        unit.productId,
        unit.id,
        movementType,
        qtyChange,
        fromStatus,
        toStatus,
        reason
      );

      // Audit log
      await this.logAuditEvent(
        tx,
        user.sub,
        "UNIT_STATUS_CHANGED",
        unit.id,
        { status: fromStatus },
        { status: toStatus, reason },
        ipAddress,
        userAgent
      );

      return updated;
    });
  }

  /**
   * Get detail of a specific unit.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   * Security rules: nullify IMEI and purchasePrice for STAFF.
   */
  static async getUnitDetails(
    user: SessionPayload,
    id: string
  ): Promise<AdminPhoneUnitDetail> {
    // 1. Check access
    requireRole(user.role, "STAFF");

    // 2. Fetch unit
    const unit = await prisma.phoneUnit.findUnique({ where: { id } });
    if (!unit) {
      throw new AppError("NOT_FOUND", `Phone unit with id "${id}" was not found.`);
    }

    const isStaff = !hasRole(user.role, "ADMIN");

    return {
      id: unit.id,
      productId: unit.productId,
      sku: unit.sku,
      imei: isStaff ? null : unit.imei,
      storage: unit.storage,
      color: unit.color,
      batteryHealth: unit.batteryHealth,
      grade: unit.grade,
      condition: unit.condition,
      hasBox: unit.hasBox,
      hasCharger: unit.hasCharger,
      hasEarphones: unit.hasEarphones,
      hasOriginalAccessories: unit.hasOriginalAccessories,
      warrantyInfo: unit.warrantyInfo,
      sellingPrice: unit.sellingPrice ? unit.sellingPrice.toNumber() : null,
      purchasePrice: isStaff ? null : (unit.purchasePrice ? unit.purchasePrice.toNumber() : null),
      status: unit.status,
      adminNotes: unit.adminNotes,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      deletedAt: unit.deletedAt,
      createdBy: unit.createdBy,
      updatedBy: unit.updatedBy,
    };
  }

  /**
   * Search and filter phone units.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   * Security rules: nullify IMEI and purchasePrice for STAFF.
   */
  static async listUnits(
    user: SessionPayload,
    query: z.input<typeof zListUnitsAdminQuery>
  ) {
    // 1. Check access
    requireRole(user.role, "STAFF");

    // 2. Validate query
    const validated = zListUnitsAdminQuery.parse(query);

    const { page, pageSize, q, status, productId, grade, storage, isDeleted, condition, minBatteryHealth } = validated;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.PhoneUnitWhereInput = {};

    // 1. Text search by unit SKU or IMEI (IMEI search restricted to ADMIN/SUPER_ADMIN)
    if (q && q.trim().length > 0) {
      const qClean = q.trim();
      const isStaff = !hasRole(user.role, "ADMIN");

      if (isStaff) {
        // Staff can only search by unit SKU
        where.sku = { contains: qClean, mode: "insensitive" };
      } else {
        // Admin can search by unit SKU or IMEI
        where.OR = [
          { sku: { contains: qClean, mode: "insensitive" } },
          { imei: { contains: qClean, mode: "insensitive" } },
        ];
      }
    }

    // 2. Status filter
    if (status) {
      where.status = status;
    }

    // 3. Product filter
    if (productId) {
      where.productId = productId;
    }

    // 4. Grade filter
    if (grade) {
      where.grade = grade;
    }

    // 5. Storage filter
    if (storage) {
      where.storage = { contains: storage, mode: "insensitive" };
    }

    // 6. Deletion filter
    if (isDeleted !== undefined) {
      if (isDeleted) {
        where.deletedAt = { not: null };
      } else {
        where.deletedAt = null;
      }
    }

    // 7. Condition filter
    if (condition) {
      where.condition = condition;
    }

    // 8. Battery health filter
    if (minBatteryHealth !== undefined) {
      where.batteryHealth = { gte: minBatteryHealth };
    }

    const [items, total] = await Promise.all([
      phoneUnitRepo.findManyAdmin({
        where,
        skip,
        take,
      }),
      phoneUnitRepo.countAdmin(where),
    ]);

    const isStaff = !hasRole(user.role, "ADMIN");

    const mappedItems: AdminPhoneUnitDetail[] = items.map((unit) => ({
      id: unit.id,
      productId: unit.productId,
      sku: unit.sku,
      imei: isStaff ? null : unit.imei,
      storage: unit.storage,
      color: unit.color,
      batteryHealth: unit.batteryHealth,
      grade: unit.grade,
      condition: unit.condition,
      hasBox: unit.hasBox,
      hasCharger: unit.hasCharger,
      hasEarphones: unit.hasEarphones,
      hasOriginalAccessories: unit.hasOriginalAccessories,
      warrantyInfo: unit.warrantyInfo,
      sellingPrice: unit.sellingPrice ? unit.sellingPrice.toNumber() : null,
      purchasePrice: isStaff ? null : (unit.purchasePrice ? unit.purchasePrice.toNumber() : null),
      status: unit.status,
      adminNotes: unit.adminNotes,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      deletedAt: unit.deletedAt,
      createdBy: unit.createdBy,
      updatedBy: unit.updatedBy,
    }));

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get stock movement history for a phone unit.
   * Access role: STAFF, ADMIN, SUPER_ADMIN.
   */
  static async getUnitMovementHistory(user: SessionPayload, phoneUnitId: string) {
    requireRole(user.role, "STAFF");
    return prisma.stockMovement.findMany({
      where: { phoneUnitId },
      include: {
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

