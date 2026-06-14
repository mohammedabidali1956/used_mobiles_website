/**
 * User domain validators.
 */

import { z } from "zod";
import { zNonEmptyString, zUuid } from "./shared";

// ---------------------------------------------------------------------------
// Enum mirrors from Prisma schema
// ---------------------------------------------------------------------------

export const zRole = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF"]);
export type Role = z.infer<typeof zRole>;

// ---------------------------------------------------------------------------
// Create user (ADMIN creating STAFF, SUPER_ADMIN creating ADMIN or STAFF)
// ---------------------------------------------------------------------------

export const zCreateUserBody = z.object({
  email: z
    .string()
    .email("Must be a valid email address.")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer (bcrypt limit)."),
  name: zNonEmptyString("Name").max(255),
  role: zRole,
});

export type CreateUserBody = z.infer<typeof zCreateUserBody>;

// ---------------------------------------------------------------------------
// Update user (name / email only)
// ---------------------------------------------------------------------------

export const zUpdateUserBody = z
  .object({
    name: zNonEmptyString("Name").max(255).optional(),
    email: z
      .string()
      .email("Must be a valid email address.")
      .toLowerCase()
      .trim()
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, {
    message: "At least one field (name or email) must be provided.",
  });

export type UpdateUserBody = z.infer<typeof zUpdateUserBody>;

// ---------------------------------------------------------------------------
// Toggle active status
// ---------------------------------------------------------------------------

export const zUpdateUserStatusBody = z.object({
  isActive: z.boolean(),
});

export type UpdateUserStatusBody = z.infer<typeof zUpdateUserStatusBody>;

// ---------------------------------------------------------------------------
// Login credentials
// ---------------------------------------------------------------------------

export const zLoginCredentials = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required."),
});

export type LoginCredentials = z.infer<typeof zLoginCredentials>;

// ---------------------------------------------------------------------------
// List users query params
// ---------------------------------------------------------------------------

export const zListUsersQuery = z.object({
  role: zRole.optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v === "true";
    }),
  page: z.string().optional().default("1").transform(Number).pipe(z.number().int().positive()),
  pageSize: z.string().optional().default("20").transform(Number).pipe(z.number().int().min(1).max(100)),
});

export type ListUsersQuery = z.infer<typeof zListUsersQuery>;

// ---------------------------------------------------------------------------
// Path param
// ---------------------------------------------------------------------------

export const zUserIdParam = z.object({ id: zUuid });
