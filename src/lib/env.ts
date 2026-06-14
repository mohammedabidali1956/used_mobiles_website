/**
 * Environment variable validation.
 *
 * Validates all required environment variables at module-import time so that
 * the app fails fast with a descriptive error instead of surfacing obscure
 * runtime crashes deep inside request handlers.
 *
 * All server-only variables must be validated here and re-exported as typed
 * constants. Never import `process.env` directly in application code; always
 * import from this module instead.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),

  // Node runtime
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // NextAuth (optional at build time, required at runtime for auth features)
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .optional(),

  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),

  // Cloudinary (optional — image upload won't work without these)
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),

  // Sentry (optional — error tracking won't work without this)
  SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid URL").optional(),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_parsed.error.flatten().fieldErrors);
  throw new Error(
    "Invalid environment variables. Check server logs for details."
  );
}

export const env = _parsed.data;

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/** True when all Cloudinary variables are present. */
export const hasCloudinary =
  Boolean(env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(env.CLOUDINARY_API_KEY) &&
  Boolean(env.CLOUDINARY_API_SECRET);

/** True when NextAuth is fully configured. */
export const hasAuth =
  Boolean(env.NEXTAUTH_SECRET) && Boolean(env.NEXTAUTH_URL);
