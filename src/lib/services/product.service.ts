import { z } from "zod";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/AppError";
import {
  productRepo,
  categoryRepo,
  brandRepo,
  auditLogRepo,
  phoneUnitRepo,
  systemConfigRepo,
} from "@/lib/repositories";
import prisma from "@/lib/prisma";
import { Prisma, PhoneUnitStatus } from "@prisma/client";
import {
  zCreateProductBody,
  zUpdateProductBody,
  zUpdateProductVisibilityBody,
  zPublicProductsQuery,
  zAdminProductsQuery,
  type CreateProductBody,
  type UpdateProductBody,
  type UpdateProductVisibilityBody,
  type PublicProductsQuery,
  type AdminProductsQuery,
} from "@/lib/validators/product";
import type { SessionPayload } from "@/lib/auth/session";
import type {
  PublicProductDetail,
  PublicProductSummary,
  AdminProductDetail,
  AdminProductSummary,
} from "@/lib/types/domain.types";

export class ProductService {
  /**
   * Helper to write a standardized audit log entry for product mutations.
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
        entityType: "PRODUCT",
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
   * Create a new product.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async createProduct(
    user: SessionPayload,
    data: CreateProductBody,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization: Admin or higher
    requireRole(user.role, "ADMIN");

    // 2. Validate request body
    const validated = zCreateProductBody.parse(data);

    // 3. Verify relations exist
    const [category, brand] = await Promise.all([
      categoryRepo.findById(validated.categoryId),
      brandRepo.findById(validated.brandId),
    ]);

    if (!category) {
      throw new AppError("NOT_FOUND", `Category with id "${validated.categoryId}" was not found.`);
    }
    if (!brand) {
      throw new AppError("NOT_FOUND", `Brand with id "${validated.brandId}" was not found.`);
    }

    // 4. Check for conflicts on unique fields (SKU and Slug)
    const [existingSku, existingSlug] = await Promise.all([
      productRepo.findBySku(validated.sku),
      productRepo.findBySlugAdmin(validated.slug),
    ]);

    if (existingSku) {
      throw new AppError("CONFLICT", `Product with SKU "${validated.sku}" already exists.`);
    }
    if (existingSlug) {
      throw new AppError("CONFLICT", `Product with slug "${validated.slug}" already exists.`);
    }

    // 5. Execute creation and audit logging within a transaction
    return prisma.$transaction(async (tx) => {
      const productInput: Prisma.ProductCreateInput = {
        sku: validated.sku,
        name: validated.name,
        slug: validated.slug,
        description: validated.description ?? null,
        baseCondition: validated.baseCondition,
        basePrice: new Prisma.Decimal(validated.basePrice),
        compareAtPrice: validated.compareAtPrice !== undefined && validated.compareAtPrice !== null
          ? new Prisma.Decimal(validated.compareAtPrice)
          : null,
        specifications: (validated.specifications as Prisma.InputJsonValue) ?? {},
        isUnitTracked: validated.isUnitTracked ?? true,
        isFeatured: validated.isFeatured ?? false,
        internalNotes: validated.internalNotes ?? null,
        brand: { connect: { id: validated.brandId } },
        category: { connect: { id: validated.categoryId } },
        creator: { connect: { id: user.sub } },
        updater: { connect: { id: user.sub } },
      };

      const product = await productRepo.create(productInput, tx);

      // Format audit snapshot
      const auditPayload = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        brandId: product.brandId,
        categoryId: product.categoryId,
        baseCondition: product.baseCondition,
        basePrice: product.basePrice.toNumber(),
        isUnitTracked: product.isUnitTracked,
        isFeatured: product.isFeatured,
      };

      await this.logAuditEvent(
        tx,
        user.sub,
        "PRODUCT_CREATED",
        product.id,
        null,
        auditPayload,
        ipAddress,
        userAgent
      );

      return product;
    });
  }

  /**
   * Update an existing product.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async updateProduct(
    user: SessionPayload,
    id: string,
    data: z.input<typeof zUpdateProductBody>,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization: Admin or higher
    requireRole(user.role, "ADMIN");

    // 2. Validate request body
    const validated = zUpdateProductBody.parse(data);

    // 3. Find existing product
    const product = await productRepo.findById(id);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with id "${id}" was not found.`);
    }

    // 4. Optimistic locking check
    if (product.version !== validated.version) {
      throw new AppError(
        "CONFLICT",
        "Product has been modified by another user. Please reload the page."
      );
    }

    // 5. Verify relations exist if changing
    if (validated.categoryId && validated.categoryId !== product.categoryId) {
      const category = await categoryRepo.findById(validated.categoryId);
      if (!category) {
        throw new AppError("NOT_FOUND", `Category with id "${validated.categoryId}" was not found.`);
      }
    }
    if (validated.brandId && validated.brandId !== product.brandId) {
      const brand = await brandRepo.findById(validated.brandId);
      if (!brand) {
        throw new AppError("NOT_FOUND", `Brand with id "${validated.brandId}" was not found.`);
      }
    }

    // 6. Check for slug conflict if changing
    if (validated.slug && validated.slug !== product.slug) {
      const existingSlug = await productRepo.findBySlugAdmin(validated.slug);
      if (existingSlug) {
        throw new AppError("CONFLICT", `Product with slug "${validated.slug}" already exists.`);
      }
    }

    // 7. Execute update and audit log within a transaction
    return prisma.$transaction(async (tx) => {
      const updateInput: Prisma.ProductUpdateInput = {
        name: validated.name,
        slug: validated.slug,
        description: validated.description !== undefined ? validated.description : undefined,
        baseCondition: validated.baseCondition,
        basePrice: validated.basePrice !== undefined ? new Prisma.Decimal(validated.basePrice) : undefined,
        compareAtPrice: validated.compareAtPrice !== undefined
          ? (validated.compareAtPrice !== null ? new Prisma.Decimal(validated.compareAtPrice) : null)
          : undefined,
        specifications: validated.specifications as Prisma.InputJsonValue | undefined,
        isUnitTracked: validated.isUnitTracked,
        isFeatured: validated.isFeatured,
        internalNotes: validated.internalNotes !== undefined ? validated.internalNotes : undefined,
        updater: { connect: { id: user.sub } },
      };

      if (validated.brandId) {
        updateInput.brand = { connect: { id: validated.brandId } };
      }
      if (validated.categoryId) {
        updateInput.category = { connect: { id: validated.categoryId } };
      }

      const updatedProduct = await productRepo.update(id, validated.version, updateInput, tx);

      // Audit logs snapshots
      const oldAudit = {
        name: product.name,
        slug: product.slug,
        description: product.description,
        brandId: product.brandId,
        categoryId: product.categoryId,
        baseCondition: product.baseCondition,
        basePrice: product.basePrice.toNumber(),
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
        specifications: product.specifications,
        isUnitTracked: product.isUnitTracked,
        isFeatured: product.isFeatured,
        internalNotes: product.internalNotes,
        version: product.version,
      };

      const newAudit = {
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        description: updatedProduct.description,
        brandId: updatedProduct.brandId,
        categoryId: updatedProduct.categoryId,
        baseCondition: updatedProduct.baseCondition,
        basePrice: updatedProduct.basePrice.toNumber(),
        compareAtPrice: updatedProduct.compareAtPrice ? updatedProduct.compareAtPrice.toNumber() : null,
        specifications: updatedProduct.specifications,
        isUnitTracked: updatedProduct.isUnitTracked,
        isFeatured: updatedProduct.isFeatured,
        internalNotes: updatedProduct.internalNotes,
        version: updatedProduct.version,
      };

      await this.logAuditEvent(
        tx,
        user.sub,
        "PRODUCT_UPDATED",
        updatedProduct.id,
        oldAudit,
        newAudit,
        ipAddress,
        userAgent
      );

      return updatedProduct;
    });
  }

  /**
   * Soft delete a product.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async softDeleteProduct(
    user: SessionPayload,
    id: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization: Admin or higher
    requireRole(user.role, "ADMIN");

    // 2. Find product
    const product = await productRepo.findById(id);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with id "${id}" was not found.`);
    }
    if (product.deletedAt) {
      throw new AppError("CONFLICT", "Product is already deleted.");
    }

    // 3. Execute soft delete and log event inside a transaction
    return prisma.$transaction(async (tx) => {
      const deletedProduct = await productRepo.softDelete(id, tx);

      await this.logAuditEvent(
        tx,
        user.sub,
        "PRODUCT_DELETED",
        deletedProduct.id,
        { deletedAt: null, isListed: product.isListed },
        { deletedAt: deletedProduct.deletedAt, isListed: false },
        ipAddress,
        userAgent
      );

      return deletedProduct;
    });
  }

  /**
   * Update product visibility toggles (list/unlist).
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async updateProductVisibility(
    user: SessionPayload,
    id: string,
    data: UpdateProductVisibilityBody,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. Enforce authorization: Admin or higher
    requireRole(user.role, "ADMIN");

    // 2. Validate request
    const validated = zUpdateProductVisibilityBody.parse(data);

    // 3. Find product
    const product = await productRepo.findById(id);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with id "${id}" was not found.`);
    }

    // 4. Execute visibility update and log event inside a transaction
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProductUpdateInput = {
        isListed: validated.isListed,
        visibilityOverride: validated.visibilityOverride,
        updater: { connect: { id: user.sub } },
      };

      const updatedProduct = await productRepo.update(id, product.version, updateData, tx);

      await this.logAuditEvent(
        tx,
        user.sub,
        "PRODUCT_VISIBILITY_CHANGED",
        updatedProduct.id,
        { isListed: product.isListed, visibilityOverride: product.visibilityOverride },
        { isListed: updatedProduct.isListed, visibilityOverride: updatedProduct.visibilityOverride },
        ipAddress,
        userAgent
      );

      return updatedProduct;
    });
  }

  /**
   * Get product details for the public website.
   * No auth required.
   */
  static async getProductDetailsForPublic(slug: string): Promise<PublicProductDetail> {
    // 1. Find product
    const product = await productRepo.findPublicBySlug(slug);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with slug "${slug}" not found.`);
    }

    // 2. Fetch active units and related products
    const [units, related, batteryConfig] = await Promise.all([
      phoneUnitRepo.findPublicByProduct(product.id),
      productRepo.findRelated(product.id, product.brandId, product.categoryId),
      systemConfigRepo.findByKey("show_battery_health_public"),
    ]);

    const showBatteryHealth = batteryConfig?.value === "true";

    // 3. Map values
    const mappedUnits = units.map((u) => ({
      id: u.id,
      sku: u.sku,
      grade: u.grade,
      storage: u.storage,
      color: u.color,
      condition: u.condition,
      hasBox: u.hasBox,
      hasCharger: u.hasCharger,
      hasEarphones: u.hasEarphones,
      hasOriginalAccessories: u.hasOriginalAccessories,
      warrantyInfo: u.warrantyInfo,
      sellingPrice: u.sellingPrice ? u.sellingPrice.toNumber() : null,
      batteryHealth: showBatteryHealth ? u.batteryHealth : null,
    }));

    const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;

    const mappedRelated = related.map((r) => {
      const rPrimary = r.images[0] ?? null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        brandName: r.brand.name,
        brandSlug: r.brand.slug,
        categoryName: r.category.name,
        categorySlug: r.category.slug,
        baseCondition: r.baseCondition,
        basePrice: r.basePrice.toNumber(),
        compareAtPrice: r.compareAtPrice ? r.compareAtPrice.toNumber() : null,
        availableUnitCount: r.availableUnitCount,
        isUnitTracked: r.isUnitTracked,
        primaryImageUrl: rPrimary ? rPrimary.url : null,
      };
    });

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brand.name,
      brandSlug: product.brand.slug,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      baseCondition: product.baseCondition,
      basePrice: product.basePrice.toNumber(),
      compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
      availableUnitCount: product.availableUnitCount,
      isUnitTracked: product.isUnitTracked,
      primaryImageUrl: primaryImage ? primaryImage.url : null,
      description: product.description,
      specifications: (product.specifications as Record<string, unknown>) ?? {},
      images: product.images.map((img) => ({
        id: img.id,
        productId: img.productId,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt,
      })),
      units: mappedUnits,
      relatedProducts: mappedRelated,
    };
  }

  /**
   * Get product details for the admin console.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async getProductDetailsForAdmin(
    user: SessionPayload,
    id: string
  ): Promise<AdminProductDetail> {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    // 2. Fetch admin product details
    const product = await productRepo.findAdminById(id);
    if (!product) {
      throw new AppError("NOT_FOUND", `Product with id "${id}" was not found.`);
    }

    // 3. Count units by status
    const statusCounts = await phoneUnitRepo.countByStatus(id);

    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      brandId: product.brandId,
      brandName: product.brand.name,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      baseCondition: product.baseCondition,
      basePrice: product.basePrice.toNumber(),
      compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
      availableUnitCount: product.availableUnitCount,
      stockQuantity: product.stockQuantity,
      isUnitTracked: product.isUnitTracked,
      isListed: product.isListed,
      visibilityOverride: product.visibilityOverride,
      isFeatured: product.isFeatured,
      internalNotes: product.internalNotes,
      version: product.version,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      description: product.description,
      specifications: (product.specifications as Record<string, unknown>) ?? {},
      images: product.images.map((img) => ({
        id: img.id,
        productId: img.productId,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt,
      })),
      unitCountByStatus: statusCounts as Record<PhoneUnitStatus, number>,
    };
  }

  /**
   * Search and filter products for the public storefront.
   * No auth required.
   */
  static async listProductsForPublic(query: z.input<typeof zPublicProductsQuery>) {
    const validated = zPublicProductsQuery.parse(query);

    const { page, pageSize, category, brand, condition, minPrice, maxPrice, storage, sort } = validated;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.ProductWhereInput = {};

    // 1. Text search q
    if (validated.q && validated.q.trim().length >= 2) {
      const q = validated.q.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // 2. Category filter
    if (category) {
      where.category = { slug: category };
    }

    // 3. Brand filter
    if (brand) {
      where.brand = { slug: brand };
    }

    // 4. Condition filter
    if (condition) {
      where.baseCondition = condition;
    }

    // 5. Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(minPrice);
      }
      if (maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(maxPrice);
      }
    }

    // 6. Storage filter
    if (storage && storage.length > 0) {
      where.phoneUnits = {
        some: {
          storage: { in: storage },
          status: "AVAILABLE",
          deletedAt: null,
        },
      };
    }

    // 7. Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (sort === "price_asc") {
      orderBy = { basePrice: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { basePrice: "desc" };
    } else if (sort === "name_asc") {
      orderBy = { name: "asc" };
    }

    const [items, total] = await Promise.all([
      productRepo.findPublicMany({ where, orderBy, skip, take }),
      productRepo.countPublic(where),
    ]);

    const mappedItems: PublicProductSummary[] = items.map((p) => {
      const primaryImage = p.images[0] ?? null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brandName: p.brand.name,
        brandSlug: p.brand.slug,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        baseCondition: p.baseCondition,
        basePrice: p.basePrice.toNumber(),
        compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toNumber() : null,
        availableUnitCount: p.availableUnitCount,
        isUnitTracked: p.isUnitTracked,
        primaryImageUrl: primaryImage ? primaryImage.url : null,
      };
    });

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Search and filter products for the admin console.
   * Access role: ADMIN or SUPER_ADMIN.
   */
  static async listProductsForAdmin(
    user: SessionPayload,
    query: z.input<typeof zAdminProductsQuery>
  ) {
    // 1. Enforce authorization
    requireRole(user.role, "ADMIN");

    const validated = zAdminProductsQuery.parse(query);

    const { page, pageSize, isListed, isDeleted, hasZeroUnits, brand, category } = validated;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.ProductWhereInput = {};

    // 1. Text search q
    if (validated.q && validated.q.trim().length >= 2) {
      const q = validated.q.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // 2. Listing status
    if (isListed !== undefined) {
      where.isListed = isListed;
    }

    // 3. Deletion status
    if (isDeleted !== undefined) {
      if (isDeleted) {
        where.deletedAt = { not: null };
      } else {
        where.deletedAt = null;
      }
    }

    // 4. Zero units status
    if (hasZeroUnits !== undefined) {
      if (hasZeroUnits) {
        where.availableUnitCount = 0;
      } else {
        where.availableUnitCount = { gt: 0 };
      }
    }

    // 5. Brand filter
    if (brand) {
      where.brand = { slug: brand };
    }

    // 6. Category filter
    if (category) {
      where.category = { slug: category };
    }

    const [items, total] = await Promise.all([
      productRepo.findManyAdmin({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      productRepo.count(where),
    ]);

    const mappedItems: AdminProductSummary[] = items.map((p) => ({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      brandId: p.brandId,
      brandName: p.brand.name,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      baseCondition: p.baseCondition,
      basePrice: p.basePrice.toNumber(),
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toNumber() : null,
      availableUnitCount: p.availableUnitCount,
      stockQuantity: p.stockQuantity,
      isUnitTracked: p.isUnitTracked,
      isListed: p.isListed,
      visibilityOverride: p.visibilityOverride,
      isFeatured: p.isFeatured,
      internalNotes: p.internalNotes,
      version: p.version,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
    }));

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }
}
