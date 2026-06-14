/**
 * Category domain validators.
 */

import { z } from "zod";
import { zNonEmptyString, zOptionalString, zSlug, zUuid } from "./shared";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const zCreateCategoryBody = z.object({
  name: zNonEmptyString("Name").max(255),
  slug: zSlug,
  description: zOptionalString,
  imageUrl: zOptionalString,
  parentId: zUuid.optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreateCategoryBody = z.infer<typeof zCreateCategoryBody>;

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const zUpdateCategoryBody = zCreateCategoryBody.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field must be provided." }
);

export type UpdateCategoryBody = z.infer<typeof zUpdateCategoryBody>;

// ---------------------------------------------------------------------------
// Path param
// ---------------------------------------------------------------------------

export const zCategoryIdParam = z.object({ id: zUuid });

// ---------------------------------------------------------------------------
// List (admin) — includes inactive / deleted
// ---------------------------------------------------------------------------

export const zListCategoriesAdminQuery = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  includeDeleted: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type ListCategoriesAdminQuery = z.infer<typeof zListCategoriesAdminQuery>;
