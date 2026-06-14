/**
 * StockMovementRepository — append-only log of inventory changes.
 */

import type { Prisma, PrismaClient, StockMovement } from "@prisma/client";

export class StockMovementRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findMany(params: {
    where?: Prisma.StockMovementWhereInput;
    orderBy?: Prisma.StockMovementOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<StockMovement[]> {
    return this.db.stockMovement.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: Prisma.StockMovementWhereInput): Promise<number> {
    return this.db.stockMovement.count({ where });
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Inserts a stock movement record.
   * Must always be called inside a transaction to guarantee that the movement
   * and the corresponding product/unit update are atomic.
   */
  async create(
    data: Prisma.StockMovementCreateInput,
    tx: Prisma.TransactionClient
  ): Promise<StockMovement> {
    return tx.stockMovement.create({ data });
  }
}
