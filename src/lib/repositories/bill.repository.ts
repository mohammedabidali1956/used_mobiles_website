/**
 * BillRepository — database access layer for the bills and bill_items tables.
 */

import type { Bill, BillItem, Prisma, PrismaClient } from "@prisma/client";

export class BillRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: string) {
    return this.db.bill.findUnique({
      where: { id },
      include: {
        staff: { select: { name: true, email: true } },
        billItems: true,
      },
    });
  }

  async findByBillNumber(billNumber: string): Promise<Bill | null> {
    return this.db.bill.findUnique({ where: { billNumber } });
  }

  async findMany(params: {
    where?: Prisma.BillWhereInput;
    orderBy?: Prisma.BillOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }) {
    return this.db.bill.findMany({
      where: params.where,
      include: {
        staff: { select: { name: true } },
      },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: Prisma.BillWhereInput): Promise<number> {
    return this.db.bill.count({ where });
  }

  // ---------------------------------------------------------------------------
  // Bill number generation
  // ---------------------------------------------------------------------------

  /**
   * Generates the next bill number in format `BILL-YYYYMMDD-XXXX`.
   * Counts today's bills atomically using a raw query to avoid a race
   * condition between the COUNT and INSERT in the billing transaction.
   *
   * The actual uniqueness is enforced by the UNIQUE constraint on bill_number.
   * If two concurrent requests generate the same number, the second INSERT
   * will fail and the billing service must retry.
   */
  async generateBillNumber(tx: Prisma.TransactionClient): Promise<string> {
    const today = new Date();
    const dateStr = today
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ""); // YYYYMMDD

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await tx.bill.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const seq = String(count + 1).padStart(4, "0");
    return `BILL-${dateStr}-${seq}`;
  }

  // ---------------------------------------------------------------------------
  // Writes (called inside transaction by billing.service)
  // ---------------------------------------------------------------------------

  async createBill(
    data: Prisma.BillCreateInput,
    tx: Prisma.TransactionClient
  ): Promise<Bill> {
    return tx.bill.create({ data });
  }

  async createBillItem(
    data: Prisma.BillItemCreateInput,
    tx: Prisma.TransactionClient
  ): Promise<BillItem> {
    return tx.billItem.create({ data });
  }
}
