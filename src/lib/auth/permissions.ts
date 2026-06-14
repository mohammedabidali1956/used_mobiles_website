/**
 * RBAC — Role-Based Access Control helpers.
 *
 * Pure functions with no side effects. Safe to import anywhere.
 *
 * Role hierarchy (highest → lowest):
 *   SUPER_ADMIN (4) > ADMIN (3) > STAFF (2) > PUBLIC (1, unauthenticated)
 */

import type { Role } from "@prisma/client";
import { AppError } from "@/lib/errors/AppError";

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  STAFF: 2,
};

// ---------------------------------------------------------------------------
// Check functions
// ---------------------------------------------------------------------------

/**
 * Returns true if `userRole` meets or exceeds `requiredRole`.
 *
 * Example:
 *   hasRole("ADMIN", "STAFF")      → true  (ADMIN ≥ STAFF)
 *   hasRole("STAFF", "ADMIN")      → false (STAFF < ADMIN)
 *   hasRole("SUPER_ADMIN", "ADMIN") → true
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

/**
 * Throws `AppError(FORBIDDEN)` if the user's role does not meet the minimum.
 * Use this as the first guard in every protected Route Handler and Server Component.
 *
 * @throws AppError with code "FORBIDDEN"
 */
export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new AppError(
      "FORBIDDEN",
      `This action requires the ${requiredRole} role or higher.`
    );
  }
}

/**
 * Throws `AppError(FORBIDDEN)` if the user's role is not exactly `requiredRole`.
 * Use this for SUPER_ADMIN-only actions that must not be accessible to ADMIN.
 *
 * @throws AppError with code "FORBIDDEN"
 */
export function requireExactRole(userRole: Role, requiredRole: Role): void {
  if (userRole !== requiredRole) {
    throw new AppError(
      "FORBIDDEN",
      `This action requires the ${requiredRole} role.`
    );
  }
}

// ---------------------------------------------------------------------------
// Role-specific redirect URLs (used by proxy and login response)
// ---------------------------------------------------------------------------

/**
 * Returns the home URL for a given role after login.
 *   STAFF       → /admin/billing/new
 *   ADMIN       → /admin
 *   SUPER_ADMIN → /admin
 */
export function getRoleHomeUrl(role: Role): string {
  return role === "STAFF" ? "/admin/billing/new" : "/admin";
}

// ---------------------------------------------------------------------------
// IMEI visibility helper
// ---------------------------------------------------------------------------

/**
 * Returns true if the role is permitted to see IMEI numbers.
 * IMEI is never shown to STAFF or public.
 */
export function canViewImei(role: Role): boolean {
  return hasRole(role, "ADMIN");
}

/**
 * Returns true if the role is permitted to see purchase price.
 * Purchase price is never shown to STAFF or public.
 */
export function canViewPurchasePrice(role: Role): boolean {
  return hasRole(role, "ADMIN");
}
