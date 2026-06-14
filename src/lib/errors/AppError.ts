/**
 * AppError — the single structured error class used throughout the application.
 *
 * Service functions throw AppError. Route handlers catch it and convert it
 * into the standard JSON error response shape defined in the API specification.
 */

import { ErrorCode, ERROR_HTTP_STATUS } from "./codes";

export interface AppErrorContext {
  /** Extra domain-specific context attached to the error (e.g. unit SKU on UNIT_NOT_AVAILABLE). */
  [key: string]: unknown;
}

export class AppError extends Error {
  /** Machine-readable error code from ErrorCode enum. */
  readonly code: ErrorCode;

  /** HTTP status code derived from the error code. */
  readonly httpStatus: number;

  /** Optional domain-specific context for the consuming route handler or client. */
  readonly context?: AppErrorContext;

  constructor(
    code: ErrorCode,
    message: string,
    context?: AppErrorContext
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.context = context;

    // Maintains proper prototype chain for `instanceof` checks in transpiled code.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialises this error into the standard API error response body shape:
   * `{ success: false, error: { code, message, ...context } }`
   */
  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.context ?? {}),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience factories — keeps throw-sites concise and self-documenting
// ---------------------------------------------------------------------------

export const notFound = (entity: string, id?: string): AppError =>
  new AppError(
    "NOT_FOUND",
    id ? `${entity} with id "${id}" was not found.` : `${entity} not found.`
  );

export const conflict = (message: string, context?: AppErrorContext): AppError =>
  new AppError("CONFLICT", message, context);

export const forbidden = (message = "You do not have permission to perform this action."): AppError =>
  new AppError("FORBIDDEN", message);

export const unauthorized = (message = "Authentication is required."): AppError =>
  new AppError("UNAUTHORIZED", message);

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError("VALIDATION_ERROR", message, details ? { details } : undefined);

export const unitNotAvailable = (
  unitId: string,
  unitSku: string,
  currentStatus: string
): AppError =>
  new AppError(
    "UNIT_NOT_AVAILABLE",
    `Phone unit "${unitSku}" is no longer available (status: ${currentStatus}).`,
    { unitId, unitSku, currentStatus }
  );

export const insufficientStock = (
  productId: string,
  requested: number,
  available: number
): AppError =>
  new AppError(
    "INSUFFICIENT_STOCK",
    `Insufficient stock. Requested ${requested}, available ${available}.`,
    { productId, requested, available }
  );

export const invalidStatusTransition = (
  from: string,
  to: string
): AppError =>
  new AppError(
    "INVALID_STATUS_TRANSITION",
    `Cannot transition unit status from "${from}" to "${to}".`,
    { from, to }
  );

export const internalError = (message = "An unexpected error occurred."): AppError =>
  new AppError("INTERNAL_ERROR", message);
