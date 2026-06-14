/**
 * AuditLogRepository — append-only security audit trail.
 */

import type { AuditLog, Prisma, PrismaClient } from "@prisma/client";

export class AuditLogRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findMany(params: {
    where?: Prisma.AuditLogWhereInput;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<AuditLog[]> {
    return this.db.auditLog.findMany({
      where: params.where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
    return this.db.auditLog.count({ where });
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Creates an audit log entry.
   *
   * Pass `tx` when this needs to be atomic with the business operation being
   * logged (e.g. BILL_CREATED). For read-based admin actions, calling without
   * `tx` is fine.
   *
   * Callers should construct `data` using `Prisma.AuditLogUncheckedCreateInput`
   * so JSON fields (oldData/newData) satisfy Prisma's NullableJsonNullValueInput
   * constraint. Use `Prisma.JsonNull` to store an explicit JSON null value.
   */
  async create(
    data: Prisma.AuditLogUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<AuditLog> {
    const client = tx ?? this.db;
    return client.auditLog.create({ data });
  }
}
