/**
 * Product domain validators.
 */

import { z } from "zod";
import {
  zMoney,
  zNonEmptyString,
  zOptionalString,
  zPaginationQuery,
  zSlug,
  zUuid,
  zBooleanString,
} from "./shared";

// ---------------------------------------------------------------------------
// Enum mirrors from Prisma schema
// ---------------------------------------------------------------------------

export const zCondition = z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]);
export type Condition = z.infer<typeof zCondition>;

export const zSortOption = z.enum(["newest", "price_asc", "price_desc", "name_asc"]);
export type SortOption = z.infer<typeof zSortOption>;

// ---------------------------------------------------------------------------
// Create product
// ---------------------------------------------------------------------------

export const zCreateProductBody = z.object({
  sku: zNonEmptyString("SKU").max(100),
  name: zNonEmptyString("Name").max(255),
  slug: zSlug,
  description: zOptionalString,
  brandId: zUuid,
  categoryId: zUuid,
  baseCondition: zCondition,
  basePrice: zMoney,
  compareAtPrice: zMoney.optional(),
  specifications: z.record(z.string(), z.unknown()).optional().default({}),
  isUnitTracked: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  internalNotes: zOptionalString,
});

export type CreateProductBody = z.infer<typeof zCreateProductBody>;

// ---------------------------------------------------------------------------
// Update product (all optional, at least one required)
// ---------------------------------------------------------------------------

export const zUpdateProductBody = z
  .object({
    name: zNonEmptyString("Name").max(255).optional(),
    slug: zSlug.optional(),
    description: zOptionalString,
    brandId: zUuid.optional(),
    categoryId: zUuid.optional(),
    baseCondition: zCondition.optional(),
    basePrice: zMoney.optional(),
    compareAtPrice: zMoney.optional().nullable(),
    specifications: z.record(z.string(), z.unknown()).optional(),
    isUnitTracked: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    internalNotes: zOptionalString,
    /** Optimistic locking — the current version the client thinks the product is at. */
    version: z.number().int().positive(),
  })
  .refine(
    (v) => {
      const { version: _, ...rest } = v;
      return Object.keys(rest).some((k) => rest[k as keyof typeof rest] !== undefined);
    },
    { message: "At least one field must be provided to update." }
  );

export type UpdateProductBody = z.infer<typeof zUpdateProductBody>;

// ---------------------------------------------------------------------------
// Visibility patch
// ---------------------------------------------------------------------------

export const zUpdateProductVisibilityBody = z
  .object({
    isListed: z.boolean().optional(),
    visibilityOverride: z.boolean().optional(),
  })
  .refine(
    (v) => v.isListed !== undefined || v.visibilityOverride !== undefined,
    { message: "At least one of isListed or visibilityOverride must be provided." }
  );

export type UpdateProductVisibilityBody = z.infer<typeof zUpdateProductVisibilityBody>;

// ---------------------------------------------------------------------------
// Image reorder
// ---------------------------------------------------------------------------

export const zReorderImagesBody = z.object({
  imageIds: z
    .array(zUuid)
    .min(1, "At least one image ID must be provided."),
});

export type ReorderImagesBody = z.infer<typeof zReorderImagesBody>;

// ---------------------------------------------------------------------------
// Add image
// ---------------------------------------------------------------------------

export const zAddProductImageBody = z.object({
  cloudinaryId: zNonEmptyString("Cloudinary ID"),
  url: z.string().url("Must be a valid URL."),
  altText: z.string().trim().optional().default(""),
  sortOrder: z.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

export type AddProductImageBody = z.infer<typeof zAddProductImageBody>;

// ---------------------------------------------------------------------------
// Public catalog query
// ---------------------------------------------------------------------------

export const zPublicProductsQuery = zPaginationQuery.extend({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  condition: zCondition.optional(),
  minPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  storage: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v === undefined ? undefined : Array.isArray(v) ? v : [v]
  ),
  sort: zSortOption.optional().default("newest"),
});

export type PublicProductsQuery = z.infer<typeof zPublicProductsQuery>;

// ---------------------------------------------------------------------------
// Admin list query
// ---------------------------------------------------------------------------

export const zAdminProductsQuery = zPaginationQuery.extend({
  q: z.string().optional(),
  isListed: zBooleanString,
  isDeleted: zBooleanString,
  hasZeroUnits: zBooleanString,
  brand: z.string().optional(),
  category: z.string().optional(),
});

export type AdminProductsQuery = z.infer<typeof zAdminProductsQuery>;

// ---------------------------------------------------------------------------
// Path params
// ---------------------------------------------------------------------------

export const zProductIdParam = z.object({ id: zUuid });
export const zProductSlugParam = z.object({ slug: z.string().min(1) });
export const zProductImageIdParams = z.object({ id: zUuid, imageId: zUuid });
