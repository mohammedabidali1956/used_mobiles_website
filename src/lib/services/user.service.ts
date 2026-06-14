/**
 * UserService — business logic for user management.
 *
 * Role rules (enforced at every mutation):
 *   - SUPER_ADMIN: full access (create / read / update / deactivate / reset password)
 *   - ADMIN:       read-only  (listUsers / getUserById)
 *   - STAFF:       no access
 *
 * Passwords are NEVER returned from any method in this service.
 */

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/AppError";
import { userRepo, auditLogRepo } from "@/lib/repositories";
import {
  zCreateUserBody,
  zUpdateUserBody,
  zUpdateUserStatusBody,
  zListUsersQuery,
  zRole,
} from "@/lib/validators/user";
import type { SessionPayload } from "@/lib/auth/session";
import type { z } from "zod";

// ---------------------------------------------------------------------------
// Shared safe-user type (no passwordHash)
// ---------------------------------------------------------------------------

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
};

function stripPassword(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  passwordHash?: string;
}): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safe } = user as any;
  return safe as SafeUser;
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

async function logAudit(
  userId: string,
  action: string,
  entityId: string,
  oldData: unknown = null,
  newData: unknown = null
) {
  await auditLogRepo.create({
    userId,
    action,
    entityType: "USER",
    entityId,
    oldData: (oldData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    newData: (newData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    ipAddress: null,
    userAgent: null,
  });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UserService {
  /**
   * List users with search, role, and active-status filters.
   * Access: ADMIN or higher.
   */
  static async listUsers(
    actor: SessionPayload,
    query: z.input<typeof zListUsersQuery>
  ) {
    requireRole(actor.role, "ADMIN");

    const { page, pageSize, role, isActive } = zListUsersQuery.parse(query);
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [rawUsers, total] = await Promise.all([
      userRepo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      userRepo.count(where),
    ]);

    return {
      items: rawUsers.map(stripPassword),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single user by ID.
   * Access: ADMIN or higher.
   */
  static async getUserById(actor: SessionPayload, id: string): Promise<SafeUser> {
    requireRole(actor.role, "ADMIN");

    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError("NOT_FOUND", `User with id "${id}" was not found.`);
    }
    return stripPassword(user);
  }

  /**
   * Create a new user.
   * Access: SUPER_ADMIN only.
   *
   * Business rules:
   *  - Email must be unique.
   *  - ADMIN cannot be created as SUPER_ADMIN (only SUPER_ADMIN can do that).
   */
  static async createUser(
    actor: SessionPayload,
    data: z.input<typeof zCreateUserBody>
  ): Promise<SafeUser> {
    requireRole(actor.role, "SUPER_ADMIN");

    const validated = zCreateUserBody.parse(data);

    // Unique email check
    const existing = await userRepo.findByEmail(validated.email);
    if (existing) {
      throw new AppError("CONFLICT", `A user with email "${validated.email}" already exists.`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12);

    const created = await userRepo.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role,
      isActive: true,
      createdBy: { connect: { id: actor.sub } },
    });

    await logAudit(actor.sub, "USER_CREATED", created.id, null, {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
    });

    return stripPassword(created);
  }

  /**
   * Update a user's name and/or email.
   * Access: SUPER_ADMIN only.
   */
  static async updateUser(
    actor: SessionPayload,
    id: string,
    data: z.input<typeof zUpdateUserBody>
  ): Promise<SafeUser> {
    requireRole(actor.role, "SUPER_ADMIN");

    const validated = zUpdateUserBody.parse(data);

    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError("NOT_FOUND", `User with id "${id}" was not found.`);
    }

    // Check email uniqueness if email is being changed
    if (validated.email && validated.email !== user.email) {
      const existing = await userRepo.findByEmail(validated.email);
      if (existing) {
        throw new AppError("CONFLICT", `A user with email "${validated.email}" already exists.`);
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.email !== undefined) updateData.email = validated.email;

    const updated = await userRepo.update(id, updateData);

    await logAudit(actor.sub, "USER_UPDATED", id, {
      name: user.name,
      email: user.email,
    }, {
      name: updated.name,
      email: updated.email,
    });

    return stripPassword(updated);
  }

  /**
   * Change a user's role.
   * Access: SUPER_ADMIN only.
   */
  static async updateUserRole(
    actor: SessionPayload,
    id: string,
    role: string
  ): Promise<SafeUser> {
    requireRole(actor.role, "SUPER_ADMIN");

    const newRole = zRole.parse(role);

    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError("NOT_FOUND", `User with id "${id}" was not found.`);
    }

    if (user.role === newRole) {
      return stripPassword(user);
    }

    // Prevent a user from changing their own role
    if (id === actor.sub) {
      throw new AppError("FORBIDDEN", "You cannot change your own role.");
    }

    const updated = await userRepo.update(id, { role: newRole });

    await logAudit(actor.sub, "USER_ROLE_CHANGED", id, {
      role: user.role,
    }, {
      role: newRole,
    });

    return stripPassword(updated);
  }

  /**
   * Activate or deactivate a user account.
   * Access: SUPER_ADMIN only.
   */
  static async updateUserStatus(
    actor: SessionPayload,
    id: string,
    isActive: boolean
  ): Promise<SafeUser> {
    requireRole(actor.role, "SUPER_ADMIN");

    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError("NOT_FOUND", `User with id "${id}" was not found.`);
    }

    // Prevent self-deactivation
    if (id === actor.sub && !isActive) {
      throw new AppError("FORBIDDEN", "You cannot deactivate your own account.");
    }

    const updated = await userRepo.update(id, { isActive });

    await logAudit(actor.sub, isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", id, {
      isActive: user.isActive,
    }, {
      isActive,
    });

    return stripPassword(updated);
  }

  /**
   * Reset a user's password.
   * Access: SUPER_ADMIN only.
   */
  static async resetUserPassword(
    actor: SessionPayload,
    id: string,
    newPassword: string
  ): Promise<void> {
    requireRole(actor.role, "SUPER_ADMIN");

    if (!newPassword || newPassword.length < 8) {
      throw new AppError("VALIDATION_ERROR", "Password must be at least 8 characters.");
    }
    if (newPassword.length > 72) {
      throw new AppError("VALIDATION_ERROR", "Password must be 72 characters or fewer.");
    }

    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError("NOT_FOUND", `User with id "${id}" was not found.`);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepo.update(id, { passwordHash });

    await logAudit(actor.sub, "USER_PASSWORD_RESET", id, null, {
      note: "Password was reset by admin.",
    });
  }
}
