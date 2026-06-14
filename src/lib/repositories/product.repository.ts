/**
 * ProductRepository — database access layer for the products table.
 *
 * This is the most complex repository. It handles:
 * - Public catalog queries (with visibility filter)
 * - Admin queries (no visibility filter)
 * - Full-text search via Prisma $queryRaw
 * - Optimistic-locking version check on updates
 */

import type { Prisma, PrismaClient, Product, ProductImage } from "@prisma/client";

// ---------------------------------------------------------------------------
// Reusable public-visibility filter
// ---------------------------------------------------------------------------

/**
 * The canonical public-visibility WHERE clause.
 * Matches docs/08-product-inventory-logic.md exactly.
 */
export const PUBLIC_VISIBILITY_FILTER: Prisma.ProductWhereInput = {
  deletedAt: null,
  isListed: true,
  OR: [
    {
      isUnitTracked: true,
      availableUnitCount: { gt: 0 },
    },
    {
      isUnitTracked: false,
      stockQuantity: { gt: 0 },
    },
    {
      visibilityOverride: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Include presets
// ---------------------------------------------------------------------------

/** Minimal includes for public catalog list items. */
const PUBLIC_LIST_INCLUDE = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

/** Full includes for public product detail page. */
const PUBLIC_DETAIL_INCLUDE = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ProductRepository {
  constructor(private readonly db: PrismaClient) {}

  // ---------------------------------------------------------------------------
  // Public reads
  // ---------------------------------------------------------------------------

  async findPublicBySlug(slug: string) {
    return this.db.product.findFirst({
      where: { slug, ...PUBLIC_VISIBILITY_FILTER },
      include: PUBLIC_DETAIL_INCLUDE,
    });
  }

  async findPublicMany(params: {
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ProductWhereInput = {
      ...PUBLIC_VISIBILITY_FILTER,
      ...params.where,
    };
    return this.db.product.findMany({
      where,
      include: PUBLIC_LIST_INCLUDE,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async countPublic(where?: Prisma.ProductWhereInput): Promise<number> {
    return this.db.product.count({
      where: { ...PUBLIC_VISIBILITY_FILTER, ...where },
    });
  }

  /** Related products — same brand or category, different product, publicly visible. */
  async findRelated(
    productId: string,
    brandId: string,
    categoryId: string,
    limit = 4
  ) {
    return this.db.product.findMany({
      where: {
        id: { not: productId },
        OR: [{ brandId }, { categoryId }],
        ...PUBLIC_VISIBILITY_FILTER,
      },
      include: PUBLIC_LIST_INCLUDE,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Admin reads
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { id } });
  }

  async findBySlugAdmin(slug: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { slug } });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { sku } });
  }

  async findAdminById(id: string) {
    return this.db.product.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async findManyAdmin(params: {
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }) {
    return this.db.product.findMany({
      where: params.where,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where?: Prisma.ProductWhereInput): Promise<number> {
    return this.db.product.count({ where });
  }

  /** Lock a product row for update inside a transaction. */
  async lockForUpdate(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<{ id: string; stockQuantity: number } | null> {
    const rows = await tx.$queryRaw<
      { id: string; stock_quantity: number }[]
    >`
      SELECT id, stock_quantity
      FROM products
      WHERE id = ${id}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return { id: row.id, stockQuantity: row.stock_quantity };
  }

  // ---------------------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------------------

  async findImageById(imageId: string): Promise<ProductImage | null> {
    return this.db.productImage.findUnique({ where: { id: imageId } });
  }

  async createImage(data: Prisma.ProductImageCreateInput): Promise<ProductImage> {
    return this.db.productImage.create({ data });
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.db.productImage.delete({ where: { id: imageId } });
  }

  /**
   * Reorder images by setting sortOrder to the array index.
   * Uses a transaction to atomically update all sortOrder values.
   */
  async reorderImages(
    productId: string,
    orderedImageIds: string[]
  ): Promise<void> {
    await this.db.$transaction(
      orderedImageIds.map((imageId, index) =>
        this.db.productImage.update({
          where: { id: imageId, productId },
          data: { sortOrder: index, isPrimary: index === 0 },
        })
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(
    data: Prisma.ProductCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx ?? this.db;
    return client.product.create({ data });
  }

  /**
   * Update with optimistic locking.
   * Prisma's `update` throws `PrismaClientKnownRequestError` (P2025) if the
   * record is not found — callers should translate that to a CONFLICT or NOT_FOUND.
   */
  async update(
    id: string,
    expectedVersion: number,
    data: Prisma.ProductUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx ?? this.db;
    return client.product.update({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async softDelete(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx ?? this.db;
    return client.product.update({
      where: { id },
      data: { deletedAt: new Date(), isListed: false },
    });
  }

  async restore(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Product> {
    const client = tx ?? this.db;
    return client.product.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.product.delete({ where: { id } });
  }

  /** Check whether any bill_items reference units of this product — blocks hard delete. */
  async hasBillingHistory(productId: string): Promise<boolean> {
    const count = await this.db.billItem.count({
      where: { productId },
    });
    return count > 0;
  }

  // ---------------------------------------------------------------------------
  // Atomic counters (called inside transactions by services)
  // ---------------------------------------------------------------------------

  async incrementAvailableUnitCount(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.product.update({
      where: { id },
      data: {
        availableUnitCount: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  async decrementAvailableUnitCount(
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.product.update({
      where: { id },
      data: {
        availableUnitCount: { decrement: 1 },
        version: { increment: 1 },
      },
    });
  }

  async decrementStockQuantity(
    id: string,
    quantity: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    await tx.product.update({
      where: { id },
      data: { stockQuantity: { decrement: quantity } },
    });
  }

  /**
   * Recomputes availableUnitCount from actual phone_unit records.
   * Admin-only reconciliation — runs outside a long transaction.
   */
  async reconcileAvailableUnitCount(id: string): Promise<number> {
    const count = await this.db.phoneUnit.count({
      where: { productId: id, status: "AVAILABLE", deletedAt: null },
    });
    await this.db.product.update({
      where: { id },
      data: { availableUnitCount: count },
    });
    return count;
  }
}
