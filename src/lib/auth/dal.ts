/**
 * Data Access Layer (DAL) — the authoritative security gate.
 *
 * This module is server-only. It provides three functions for reading the
 * current authenticated user at increasing levels of trust:
 *
 *   getSession()        — JWT only, returns null if missing. For optional auth.
 *   getCurrentUser()    — JWT only, throws UNAUTHORIZED if missing. For all protected routes.
 *   getVerifiedUser()   — JWT + DB round-trip. For SUPER_ADMIN-only, sensitive mutations.
 *
 * Rule: EVERY protected Route Handler and Server Component must call at least
 * getCurrentUser() as its first operation. The proxy.ts redirects are UX only
 * and are NOT the security boundary.
 */

import "server-only";

import { getSessionFromCookie } from "./session";
import type { SessionPayload } from "./session";
import { AppError } from "@/lib/errors/AppError";
import { userRepo } from "@/lib/repositories";
import type { User } from "@prisma/client";

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type { SessionPayload };

// ---------------------------------------------------------------------------
// getSession — optional auth
// ---------------------------------------------------------------------------

/**
 * Reads and verifies the session cookie.
 * Returns the JWT payload, or null if the cookie is missing or invalid.
 *
 * Use this on pages where auth is optional (e.g. a page that shows extra
 * controls when logged in but is still accessible to the public).
 */
export async function getSession(): Promise<SessionPayload | null> {
  return getSessionFromCookie();
}

// ---------------------------------------------------------------------------
// getCurrentUser — required auth (JWT-only, no DB)
// ---------------------------------------------------------------------------

/**
 * Reads and verifies the session cookie.
 * Returns the JWT payload on success.
 *
 * @throws AppError(UNAUTHORIZED) if the cookie is missing or the JWT is invalid/expired.
 *
 * Performance note: This reads the JWT from the cookie and verifies the
 * signature — no database query is made. Use this for 95% of protected routes.
 */
export async function getCurrentUser(): Promise<SessionPayload> {
  const session = await getSessionFromCookie();
  if (!session) {
    throw new AppError("UNAUTHORIZED", "Authentication is required.");
  }
  return session;
}

// ---------------------------------------------------------------------------
// getVerifiedUser — required auth + DB re-validation
// ---------------------------------------------------------------------------

/**
 * Reads and verifies the session cookie, then re-fetches the user from the
 * database to confirm they are still active and their role has not changed.
 *
 * @throws AppError(UNAUTHORIZED) if:
 *   - The session cookie is missing or invalid.
 *   - The user no longer exists in the database.
 *   - The user's `is_active` flag is false.
 *
 * Performance note: Makes a database query on every call. Use sparingly:
 *   - SUPER_ADMIN-only mutations (role changes, hard deletes, system config)
 *   - User account status changes (activate/deactivate)
 *   - Any action where a stale role in the JWT could cause harm
 */
export async function getVerifiedUser(): Promise<User> {
  const session = await getSessionFromCookie();
  if (!session) {
    throw new AppError("UNAUTHORIZED", "Authentication is required.");
  }

  const user = await userRepo.findById(session.sub);

  if (!user) {
    throw new AppError(
      "UNAUTHORIZED",
      "Your account no longer exists. Please contact an administrator."
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "UNAUTHORIZED",
      "Your account has been deactivated. Please contact an administrator."
    );
  }

  return user;
}
