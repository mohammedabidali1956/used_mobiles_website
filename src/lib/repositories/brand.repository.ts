/**
 * BrandRepository — database access layer for the brands table.
 */

import type { Brand, Prisma, PrismaClient } from "@prisma/client";

export class BrandRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<Brand | null> {
    return this.db.brand.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    return this.db.brand.findUnique({ where: { slug } });
  }

  /** All active, non-deleted brands — for public storefront navigation. */
  async findAllActive(): Promise<Brand[]> {
    return this.db.brand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  /** Admin: all brands including inactive and soft-deleted. */
  async findManyAdmin(params: {
    where?: Prisma.BrandWhereInput;
    orderBy?: Prisma.BrandOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Brand[]> {
    return this.db.brand.findMany(params);
  }

  async count(where?: Prisma.BrandWhereInput): Promise<number> {
    return this.db.brand.count({ where });
  }

  /** Check whether any non-deleted products reference this brand. */
  async hasActiveProducts(id: string): Promise<boolean> {
    const count = await this.db.product.count({
      where: { brandId: id, deletedAt: null },
    });
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(data: Prisma.BrandCreateInput): Promise<Brand> {
    return this.db.brand.create({ data });
  }

  async update(id: string, data: Prisma.BrandUpdateInput): Promise<Brand> {
    return this.db.brand.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Brand> {
    return this.db.brand.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
