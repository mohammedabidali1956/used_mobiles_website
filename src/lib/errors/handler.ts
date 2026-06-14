/**
 * Error handling utilities for Next.js route handlers.
 *
 * Usage in a route handler:
 *   ```ts
 *   import { handleRouteError } from "@/lib/errors/handler";
 *
 *   export async function GET() {
 *     try {
 *       const data = await myService.doSomething();
 *       return NextResponse.json({ success: true, data });
 *     } catch (error) {
 *       return handleRouteError(error);
 *     }
 *   }
 *   ```
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./AppError";
import { ErrorCode } from "./codes";

/**
 * Converts any thrown error into a typed JSON NextResponse.
 *
 * - AppError   → uses the error's own code + httpStatus.
 * - ZodError   → wraps in a VALIDATION_ERROR 400 response.
 * - Everything else → INTERNAL_ERROR 500 (message is NOT leaked to client).
 */
export function handleRouteError(error: unknown): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.httpStatus });
  }

  // Zod validation failures from manual schema.parse() calls in route handlers
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Request validation failed.",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  // Unknown / unexpected errors — log and return a generic 500
  console.error("[INTERNAL_ERROR]", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred. Please try again later.",
      },
    },
    { status: 500 }
  );
}

/**
 * Sanitizes errors thrown inside Next.js Server Actions.
 * Prevents internal details and stack traces from leaking to the client.
 */
export function handleActionError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      success: false as const,
      error: "Validation failed. Please verify all fields.",
      details: error.flatten().fieldErrors,
    };
  }
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: error.message,
    };
  }
  console.error("[SERVER_ACTION_ERROR]", error);
  return {
    success: false as const,
    error: "An unexpected error occurred. Please try again later.",
  };
}

