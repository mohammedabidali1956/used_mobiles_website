/**
 * CategoryRepository — database access layer for the categories table.
 */

import type { Category, Prisma, PrismaClient } from "@prisma/client";

export class CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<Category | null> {
    return this.db.category.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.db.category.findUnique({ where: { slug } });
  }

  /** Returns all active, non-deleted top-level categories with their children. */
  async findAllActive(): Promise<(Category & { children: Category[] })[]> {
    return this.db.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        parentId: null,
      },
      include: {
        children: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** Admin: all categories regardless of active/deleted state. */
  async findManyAdmin(params: {
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Category[]> {
    return this.db.category.findMany(params);
  }

  async count(where?: Prisma.CategoryWhereInput): Promise<number> {
    return this.db.category.count({ where });
  }

  /** Check whether any non-deleted products exist under this category. */
  async hasActiveProducts(id: string): Promise<boolean> {
    const count = await this.db.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.db.category.create({ data });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.db.category.update({ where: { id }, data });
  }

  /** Soft delete — sets deletedAt to now. */
  async softDelete(id: string): Promise<Category> {
    return this.db.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
