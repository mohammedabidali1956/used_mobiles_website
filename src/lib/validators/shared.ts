/**
 * Shared primitive validators and reusable Zod building blocks.
 *
 * These are composable pieces used across domain-specific validator files.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** UUID string validated by pattern. */
export const zUuid = z.string().uuid("Must be a valid UUID.");

/** Positive integer, used for pagination and quantities. */
export const zPositiveInt = z.number().int().positive();

/** Non-negative integer (0 allowed), e.g. for stock counts. */
export const zNonNegativeInt = z.number().int().min(0);

/** Monetary decimal as a number with up to 2 decimal places (max 10 digits). */
export const zMoney = z
  .number()
  .nonnegative("Amount must be non-negative.")
  .multipleOf(0.01, "Amount must have at most 2 decimal places.")
  .max(99_999_999.99, "Amount exceeds maximum allowed value.");

/** URL-safe slug: lowercase letters, digits, hyphens. */
export const zSlug = z
  .string()
  .min(1, "Slug is required.")
  .max(255, "Slug must be 255 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, digits, and hyphens."
  );

/** Non-empty trimmed string. */
export const zNonEmptyString = (label = "Field") =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`);

/** Optional trimmed string — empty string is converted to undefined. */
export const zOptionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/** Standard pagination query params. */
export const zPaginationQuery = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform(Number)
    .pipe(zPositiveInt),
  pageSize: z
    .string()
    .optional()
    .default("24")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

export type PaginationQuery = z.infer<typeof zPaginationQuery>;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** ISO 8601 date-time string coerced from query param. */
export const zDateTimeString = z
  .string()
  .datetime({ offset: true })
  .optional();

// ---------------------------------------------------------------------------
// Boolean query param helper (query strings are always strings)
// ---------------------------------------------------------------------------

/**
 * Parses a boolean-like string query param ("true" / "false" / "1" / "0").
 * Useful for optional filter query params such as `?isDeleted=true`.
 */
export const zBooleanString = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    return v === "true" || v === "1";
  });
