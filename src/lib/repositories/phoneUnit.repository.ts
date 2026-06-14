/**
 * PhoneUnitRepository — database access layer for the phone_units table.
 *
 * Critical invariant: every method that changes available_unit_count on the
 * parent product MUST be called inside a Prisma $transaction by the service
 * layer. The repository accepts a `tx` (TransactionClient) parameter for those
 * operations so the service stays in full control of the transaction boundary.
 */

import type { PhoneUnit, Prisma, PrismaClient } from "@prisma/client";

export class PhoneUnitRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<PhoneUnit | null> {
    return this.db.phoneUnit.findUnique({ where: { id } });
  }

  async findBySku(sku: string): Promise<PhoneUnit | null> {
    return this.db.phoneUnit.findUnique({ where: { sku } });
  }

  /** Public: available, non-deleted units for a product. */
  async findPublicByProduct(productId: string): Promise<PhoneUnit[]> {
    return this.db.phoneUnit.findMany({
      where: { productId, status: "AVAILABLE", deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Admin: all units for a product (including deleted), with optional filters. */
  async findByProductAdmin(params: {
    productId: string;
    where?: Prisma.PhoneUnitWhereInput;
    skip?: number;
    take?: number;
  }): Promise<PhoneUnit[]> {
    return this.db.phoneUnit.findMany({
      where: { productId: params.productId, ...params.where },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async countByProduct(
    productId: string,
    where?: Prisma.PhoneUnitWhereInput
  ): Promise<number> {
    return this.db.phoneUnit.count({ where: { productId, ...where } });
  }

  /** Admin: cross-product unit search (by SKU or IMEI). */
  async findManyAdmin(params: {
    where?: Prisma.PhoneUnitWhereInput;
    skip?: number;
    take?: number;
  }): Promise<PhoneUnit[]> {
    return this.db.phoneUnit.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async countAdmin(where?: Prisma.PhoneUnitWhereInput): Promise<number> {
    return this.db.phoneUnit.count({ where });
  }

  /**
   * Lock a unit row for update inside a transaction.
   * Uses a raw query to issue `SELECT ... FOR UPDATE` for concurrency safety
   * during the billing transaction (docs/08-product-inventory-logic.md step 1).
   */
  async lockForUpdate(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<{ id: string; status: string; deletedAt: Date | null } | null> {
    const rows = await tx.$queryRaw<
      { id: string; status: string; deleted_at: Date | null }[]
    >`
      SELECT id, status, deleted_at
      FROM phone_units
      WHERE id = ${id}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return { id: row.id, status: row.status, deletedAt: row.deleted_at };
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(
    data: Prisma.PhoneUnitCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<PhoneUnit> {
    const client = tx ?? this.db;
    return client.phoneUnit.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PhoneUnitUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<PhoneUnit> {
    const client = tx ?? this.db;
    return client.phoneUnit.update({ where: { id }, data });
  }

  /**
   * Mark a unit as SOLD inside a transaction.
   * Uses a conditional WHERE to guard against a race condition where the status
   * changed between the lock acquisition (lockForUpdate) and this update.
   */
  async markAsSold(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<PhoneUnit> {
    return tx.phoneUnit.update({
      where: { id, status: "AVAILABLE", deletedAt: null },
      data: { status: "SOLD" },
    });
  }

  async softDelete(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<PhoneUnit> {
    const client = tx ?? this.db;
    return client.phoneUnit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<PhoneUnit> {
    const client = tx ?? this.db;
    return client.phoneUnit.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /** Count units by status for the admin product detail view. */
  async countByStatus(
    productId: string
  ): Promise<Record<string, number>> {
    const rows = await this.db.phoneUnit.groupBy({
      by: ["status"],
      where: { productId, deletedAt: null },
      _count: { status: true },
    });

    const result: Record<string, number> = {
      AVAILABLE: 0,
      SOLD: 0,
      IN_REPAIR: 0,
      DEFECTIVE: 0,
    };

    for (const row of rows) {
      result[row.status] = row._count.status;
    }

    return result;
  }
}
