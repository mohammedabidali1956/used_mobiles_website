/**
 * Validators barrel export.
 *
 * Import from "@/lib/validators" in application code.
 *
 * Note: `zCondition` / `Condition` are exported by both product.ts and
 * phoneUnit.ts (they reference the same Prisma enum). To avoid TS2308 we
 * explicitly re-export the shared primitives from shared.ts and the domain
 * modules individually, relying on explicit named exports instead of wildcard
 * re-exports for the conflicting names.
 */

export * from "./shared";
export * from "./user";
export * from "./category";
export * from "./brand";

// Product validators — excludes zCondition/Condition to avoid collision
export {
  zCreateProductBody,
  zUpdateProductBody,
  zUpdateProductVisibilityBody,
  zReorderImagesBody,
  zAddProductImageBody,
  zPublicProductsQuery,
  zAdminProductsQuery,
  zProductIdParam,
  zProductSlugParam,
  zProductImageIdParams,
  zSortOption,
  // Export product's zCondition under its own name — consumers can import from ./product directly if needed
  zCondition as zProductCondition,
  type Condition as ProductCondition,
  type SortOption,
  type CreateProductBody,
  type UpdateProductBody,
  type UpdateProductVisibilityBody,
  type ReorderImagesBody,
  type AddProductImageBody,
  type PublicProductsQuery,
  type AdminProductsQuery,
} from "./product";

// PhoneUnit validators — zCondition here is the canonical one (same enum, same values)
export * from "./phoneUnit";

export * from "./bill";
export * from "./report";
