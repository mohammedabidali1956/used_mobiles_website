"use server";

import { getSession } from "@/lib/auth";
import { UserService } from "@/lib/services/user.service";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      success: false as const,
      error: "Validation failed. Please check all fields.",
      details: error.flatten().fieldErrors,
    };
  }
  if (error instanceof AppError) {
    return { success: false as const, error: error.message };
  }
  console.error("[USER_ACTIONS_ERROR]", error);
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}

export async function createUserAction(data: any) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    const user = await UserService.createUser(session, data);
    revalidatePath("/admin/users");
    return { success: true as const, userId: user.id };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUserAction(id: string, data: any) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    await UserService.updateUser(session, id, data);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    revalidatePath(`/admin/users/${id}/edit`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUserRoleAction(id: string, role: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    await UserService.updateUserRole(session, id, role);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    revalidatePath(`/admin/users/${id}/edit`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUserStatusAction(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    await UserService.updateUserStatus(session, id, isActive);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    revalidatePath(`/admin/users/${id}/edit`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function resetUserPasswordAction(id: string, newPassword: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    await UserService.resetUserPassword(session, id, newPassword);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}
