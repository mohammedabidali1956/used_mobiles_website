import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/permissions";
import type { SessionPayload } from "@/lib/auth/session";

export interface DashboardMetrics {
  todaySales: {
    revenue: number;
    billsCount: number;
  };
  weekSales: {
    revenue: number;
    billsCount: number;
  };
  monthSales: {
    revenue: number;
    billsCount: number;
  };
  overallSales: {
    revenue: number;
    billsCount: number;
  };
  availableInventoryCount: number;
  soldInventoryCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    brandName: string;
    categoryName: string;
    isUnitTracked: boolean;
    availableUnitCount: number;
    stockQuantity: number;
  }>;
}

export interface PaymentBreakdown {
  paymentMethod: string;
  revenue: number;
  billsCount: number;
}

export interface SalesReportData {
  fromDate: string;
  toDate: string;
  revenue: number;
  billsCount: number;
  paymentBreakdown: PaymentBreakdown[];
  bills: Array<{
    id: string;
    billNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    total: number;
    staffName: string;
    createdAt: Date;
  }>;
}

export interface InventoryReportData {
  statusCounts: {
    AVAILABLE: number;
    RESERVED: number;
    SOLD: number;
    DEFECTIVE: number;
    IN_REPAIR: number;
  };
  genericAvailableStock: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    brandName: string;
    categoryName: string;
    isUnitTracked: boolean;
    availableUnitCount: number;
    stockQuantity: number;
  }>;
}

export interface ProductPerformanceData {
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    brandName: string;
    categoryName: string;
    quantitySold: number;
    revenue: number;
  }>;
  topBrands: Array<{
    brandId: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
}

export class ReportService {
  /**
   * Retrieves summary business overview metrics.
   * Access role: STAFF or higher.
   */
  static async getDashboardMetrics(user: SessionPayload): Promise<DashboardMetrics> {
    requireRole(user.role, "STAFF");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Start of current week (Sunday)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [todayAgg, weekAgg, monthAgg, totalAgg, availableUnits, genericStockObj, soldUnits, genericSoldObj] = await Promise.all([
      prisma.bill.aggregate({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.bill.aggregate({
        where: { createdAt: { gte: startOfWeek } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.bill.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.bill.aggregate({
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.phoneUnit.count({
        where: { status: "AVAILABLE", deletedAt: null },
      }),
      prisma.product.aggregate({
        where: { isUnitTracked: false, deletedAt: null },
        _sum: { stockQuantity: true },
      }),
      prisma.phoneUnit.count({
        where: { status: "SOLD", deletedAt: null },
      }),
      prisma.billItem.aggregate({
        where: { phoneUnitId: null },
        _sum: { quantity: true },
      }),
    ]);

    const genericAvailable = genericStockObj._sum.stockQuantity || 0;
    const genericSold = genericSoldObj._sum.quantity || 0;

    const lowStock = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isUnitTracked: true, availableUnitCount: { lt: 3 } },
          { isUnitTracked: false, stockQuantity: { lt: 3 } },
        ],
      },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [
        { availableUnitCount: "asc" },
        { stockQuantity: "asc" },
      ],
      take: 10,
    });

    return {
      todaySales: {
        revenue: todayAgg._sum.total?.toNumber() || 0,
        billsCount: todayAgg._count.id || 0,
      },
      weekSales: {
        revenue: weekAgg._sum.total?.toNumber() || 0,
        billsCount: weekAgg._count.id || 0,
      },
      monthSales: {
        revenue: monthAgg._sum.total?.toNumber() || 0,
        billsCount: monthAgg._count.id || 0,
      },
      overallSales: {
        revenue: totalAgg._sum.total?.toNumber() || 0,
        billsCount: totalAgg._count.id || 0,
      },
      availableInventoryCount: availableUnits + genericAvailable,
      soldInventoryCount: soldUnits + genericSold,
      lowStockProducts: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        brandName: p.brand.name,
        categoryName: p.category.name,
        isUnitTracked: p.isUnitTracked,
        availableUnitCount: p.availableUnitCount,
        stockQuantity: p.stockQuantity,
      })),
    };
  }

  /**
   * Generates a date-range filtered invoice sales audit.
   * Access role: ADMIN or higher.
   */
  static async getSalesReport(
    user: SessionPayload,
    from?: string,
    to?: string
  ): Promise<SalesReportData> {
    requireRole(user.role, "ADMIN");

    const now = new Date();
    // Default fromDate to 30 days ago, toDate to now
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;

    // Adjust toDate to end of that day (23:59:59) if it was supplied manually
    if (to) {
      toDate.setHours(23, 59, 59, 999);
    }

    const [agg, rawBreakdown, items] = await Promise.all([
      prisma.bill.aggregate({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.bill.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.bill.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { staff: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Build default payment breakdown mapping all enum options
    const methods = ["CASH", "CARD", "TRANSFER", "OTHER"];
    const breakdownMap = new Map(rawBreakdown.map((b) => [b.paymentMethod, b]));

    const paymentBreakdown: PaymentBreakdown[] = methods.map((m) => {
      const match = breakdownMap.get(m as any);
      return {
        paymentMethod: m,
        revenue: match?._sum?.total?.toNumber() || 0,
        billsCount: match?._count?.id || 0,
      };
    });

    return {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      revenue: agg._sum.total?.toNumber() || 0,
      billsCount: agg._count.id || 0,
      paymentBreakdown,
      bills: items.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        paymentMethod: b.paymentMethod,
        subtotal: b.subtotal.toNumber(),
        discount: b.discount.toNumber(),
        total: b.total.toNumber(),
        staffName: b.staff.name,
        createdAt: b.createdAt,
      })),
    };
  }

  /**
   * Evaluates inventory status and flags low stock items.
   * Access role: ADMIN or higher.
   */
  static async getInventoryReport(user: SessionPayload): Promise<InventoryReportData> {
    requireRole(user.role, "ADMIN");

    const [statusGroups, genericStockObj, lowStock] = await Promise.all([
      prisma.phoneUnit.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.product.aggregate({
        where: { isUnitTracked: false, deletedAt: null },
        _sum: { stockQuantity: true },
      }),
      prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { isUnitTracked: true, availableUnitCount: { lt: 3 } },
            { isUnitTracked: false, stockQuantity: { lt: 3 } },
          ],
        },
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: [
          { availableUnitCount: "asc" },
          { stockQuantity: "asc" },
        ],
      }),
    ]);

    const statusCounts = {
      AVAILABLE: 0,
      RESERVED: 0,
      SOLD: 0,
      DEFECTIVE: 0,
      IN_REPAIR: 0,
    };

    for (const group of statusGroups) {
      if (group.status in statusCounts) {
        statusCounts[group.status as keyof typeof statusCounts] = group._count.id;
      }
    }

    return {
      statusCounts,
      genericAvailableStock: genericStockObj._sum.stockQuantity || 0,
      lowStockProducts: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        brandName: p.brand.name,
        categoryName: p.category.name,
        isUnitTracked: p.isUnitTracked,
        availableUnitCount: p.availableUnitCount,
        stockQuantity: p.stockQuantity,
      })),
    };
  }

  /**
   * Resolves top selling products and brand metrics.
   * Access role: ADMIN or higher.
   */
  static async getProductPerformanceReport(user: SessionPayload): Promise<ProductPerformanceData> {
    requireRole(user.role, "ADMIN");

    const [itemPerformance, allBillItems] = await Promise.all([
      prisma.billItem.groupBy({
        by: ["productId", "productName", "productSku"],
        _sum: {
          quantity: true,
          lineTotal: true,
        },
        orderBy: {
          _sum: {
            lineTotal: "desc",
          },
        },
        take: 20,
      }),
      prisma.billItem.findMany({
        select: {
          quantity: true,
          lineTotal: true,
          product: {
            select: {
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const productIds = itemPerformance.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const topProducts = itemPerformance.map((p) => {
      const meta = productMap.get(p.productId);
      return {
        productId: p.productId,
        name: p.productName,
        sku: p.productSku,
        brandName: meta?.brand?.name || "Generic",
        categoryName: meta?.category?.name || "Generic",
        quantitySold: p._sum.quantity || 0,
        revenue: p._sum.lineTotal ? p._sum.lineTotal.toNumber() : 0,
      };
    });

    const brandStatsMap = new Map<string, { brandId: string; name: string; quantitySold: number; revenue: number }>();
    for (const item of allBillItems) {
      const brand = item.product?.brand;
      if (!brand) continue;

      const qty = item.quantity;
      const rev = item.lineTotal.toNumber();

      const existing = brandStatsMap.get(brand.id) || {
        brandId: brand.id,
        name: brand.name,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += qty;
      existing.revenue += rev;
      brandStatsMap.set(brand.id, existing);
    }

    const topBrands = Array.from(brandStatsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      topProducts,
      topBrands,
    };
  }
}
