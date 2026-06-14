/**
 * Brand domain validators.
 */

import { z } from "zod";
import { zNonEmptyString, zOptionalString, zSlug, zUuid } from "./shared";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const zCreateBrandBody = z.object({
  name: zNonEmptyString("Name").max(255),
  slug: zSlug,
  logoUrl: zOptionalString,
  isActive: z.boolean().optional().default(true),
});

export type CreateBrandBody = z.infer<typeof zCreateBrandBody>;

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const zUpdateBrandBody = zCreateBrandBody.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field must be provided." }
);

export type UpdateBrandBody = z.infer<typeof zUpdateBrandBody>;

// ---------------------------------------------------------------------------
// Path param
// ---------------------------------------------------------------------------

export const zBrandIdParam = z.object({ id: zUuid });
