/**
 * Session management — JWT sign/verify and cookie handling.
 *
 * This module is server-only. Never import it from client components.
 *
 * Token strategy:
 *   - Signed HS256 JWT stored in an HttpOnly cookie.
 *   - Payload contains only the minimum fields needed for authorization:
 *     userId, email, name, role, expiresAt.
 *   - No sensitive fields (passwordHash, purchasePrice, imei) ever enter the token.
 *   - Token lifetime: 8h for STAFF, 24h for ADMIN/SUPER_ADMIN.
 */

import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = "mobilex_session";

/** STAFF works an 8-hour shift; admins get a full 24-hour day. */
const SESSION_DURATION: Record<Role, number> = {
  STAFF: 8 * 60 * 60 * 1000,          // 8 hours in ms
  ADMIN: 24 * 60 * 60 * 1000,         // 24 hours in ms
  SUPER_ADMIN: 24 * 60 * 60 * 1000,   // 24 hours in ms
};

/** Refresh the cookie TTL when less than this fraction of lifetime remains. */
const REFRESH_THRESHOLD = 0.25;

// ---------------------------------------------------------------------------
// JWT key — derived from NEXTAUTH_SECRET env var
// ---------------------------------------------------------------------------

function getSigningKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 64"
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------
// Session payload type
// ---------------------------------------------------------------------------

export interface SessionPayload {
  /** user.id (UUID) */
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Unix timestamp (seconds) */
  exp: number;
  /** Unix timestamp (seconds) */
  iat: number;
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Signs a JWT with the session payload.
 * The `exp` claim is set automatically by `setExpirationTime`.
 */
export async function signSession(
  payload: Omit<SessionPayload, "exp" | "iat">
): Promise<string> {
  const durationMs = SESSION_DURATION[payload.role];
  const expiresAt = new Date(Date.now() + durationMs);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSigningKey());
}

/**
 * Verifies and decodes the JWT.
 * Returns the payload, or null if the token is missing, invalid, or expired.
 * Never throws to callers — all failures return null.
 */
export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    // Token expired, tampered, or otherwise invalid
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Creates a session JWT and sets it as an HttpOnly cookie.
 * Called after a successful login.
 */
export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): Promise<void> {
  const durationMs = SESSION_DURATION[user.role];
  const expiresAt = new Date(Date.now() + durationMs);

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Deletes the session cookie.
 * Called on logout.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads and verifies the session cookie.
 * Returns the payload or null — does not redirect.
 * Use `getCurrentUser()` from dal.ts in protected contexts.
 */
export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}

// ---------------------------------------------------------------------------
// Session refresh
// ---------------------------------------------------------------------------

/**
 * Refreshes the cookie TTL if the session is valid and within the last
 * REFRESH_THRESHOLD of its lifetime. Called from the proxy on each request.
 *
 * @param token - The raw JWT string from the request cookie.
 * @returns The verified payload (for further proxy use), or null if invalid.
 */
export async function refreshSessionIfNeeded(
  token: string | undefined
): Promise<SessionPayload | null> {
  const payload = await verifySession(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000); // seconds
  const totalDuration = SESSION_DURATION[payload.role] / 1000; // in seconds
  const remaining = payload.exp - now;
  const thresholdSeconds = totalDuration * REFRESH_THRESHOLD;

  if (remaining < thresholdSeconds) {
    // Re-create the session with a fresh expiry
    await createSession({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
  }

  return payload;
}
