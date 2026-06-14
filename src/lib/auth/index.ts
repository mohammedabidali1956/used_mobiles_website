/**
 * Auth barrel export.
 *
 * Import from "@/lib/auth" in application code.
 *
 * Note: session.ts and dal.ts are server-only. Importing this barrel from
 * a Client Component will throw a build error, which is the intended behavior.
 */

export {
  SESSION_COOKIE_NAME,
  createSession,
  deleteSession,
  getSessionFromCookie,
  refreshSessionIfNeeded,
  verifySession,
} from "./session";
export type { SessionPayload } from "./session";

export {
  getSession,
  getCurrentUser,
  getVerifiedUser,
} from "./dal";

export {
  ROLE_HIERARCHY,
  hasRole,
  requireRole,
  requireExactRole,
  getRoleHomeUrl,
  canViewImei,
  canViewPurchasePrice,
} from "./permissions";
