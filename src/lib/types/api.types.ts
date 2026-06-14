/**
 * Standard API response types.
 *
 * All API route handlers return one of these shapes.
 */

import type { ErrorCode } from "../errors/codes";

// ---------------------------------------------------------------------------
// Success shapes
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiPaginatedSuccess<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

export interface ApiErrorDetail {
  code: ErrorCode;
  message: string;
  /** Domain-specific extra fields (e.g. unitId on UNIT_NOT_AVAILABLE). */
  [key: string]: unknown;
}

export interface ApiError {
  success: false;
  error: ApiErrorDetail;
}

// ---------------------------------------------------------------------------
// Union types — what a route handler may return
// ---------------------------------------------------------------------------

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiPaginatedResponse<T> = ApiPaginatedSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Helper constructors (for use in route handlers without the error path)
// ---------------------------------------------------------------------------

export const apiSuccess = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data,
});

export const apiPaginatedSuccess = <T>(
  data: T[],
  pagination: PaginationMeta
): ApiPaginatedSuccess<T> => ({
  success: true,
  data,
  pagination,
});

/**
 * Computes pagination meta from a Prisma count + query params.
 */
export const buildPaginationMeta = (
  total: number,
  page: number,
  pageSize: number
): PaginationMeta => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});
