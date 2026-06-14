/**
 * UserRepository — database access layer for the users table.
 *
 * Responsibilities:
 * - All Prisma queries for the `users` model.
 * - No business logic. No password hashing. No session management.
 * - Returns raw Prisma objects; mapping to domain types is done in the service layer.
 */

import type { Prisma, PrismaClient, User } from "@prisma/client";

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  async findMany(params: {
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<User[]> {
    return this.db.user.findMany(params);
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.db.user.count({ where });
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
