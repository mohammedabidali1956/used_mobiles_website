/**
 * Application error codes.
 *
 * These map 1-to-1 with the error codes defined in docs/07-api-specification.md.
 * Every API error response includes one of these codes so clients can handle
 * specific failure cases programmatically.
 */

export const ErrorCode = {
  // 400
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // 401
  UNAUTHORIZED: "UNAUTHORIZED",

  // 403
  FORBIDDEN: "FORBIDDEN",

  // 404
  NOT_FOUND: "NOT_FOUND",

  // 409 — conflict variants
  CONFLICT: "CONFLICT",
  UNIT_NOT_AVAILABLE: "UNIT_NOT_AVAILABLE",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  CATEGORY_HAS_PRODUCTS: "CATEGORY_HAS_PRODUCTS",
  BRAND_HAS_PRODUCTS: "BRAND_HAS_PRODUCTS",

  // 422
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",

  // 500
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * HTTP status code that corresponds to each application error code.
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNIT_NOT_AVAILABLE: 409,
  INSUFFICIENT_STOCK: 409,
  CATEGORY_HAS_PRODUCTS: 409,
  BRAND_HAS_PRODUCTS: 409,
  INVALID_STATUS_TRANSITION: 422,
  INTERNAL_ERROR: 500,
};
