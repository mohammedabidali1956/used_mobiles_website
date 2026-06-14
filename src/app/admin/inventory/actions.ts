"use server";

import { getSession } from "@/lib/auth";
import { PhoneUnitService } from "@/lib/services";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { zCreatePhoneUnitBody, zUpdatePhoneUnitBody } from "@/lib/validators/phoneUnit";
import type { PhoneUnitStatus } from "@prisma/client";

import { handleActionError } from "@/lib/errors/handler";

/**
 * Standardized server action error handler.
 */
function handleError(error: unknown) {
  return handleActionError(error);
}

export async function createUnitAction(productId: string, data: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const validated = zCreatePhoneUnitBody.parse(data);
    const unit = await PhoneUnitService.createUnit(session, productId, validated);
    
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true as const, unit: { id: unit.id } };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUnitAction(id: string, data: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const validated = zUpdatePhoneUnitBody.parse(data);
    const unit = await PhoneUnitService.updateUnit(session, id, validated);
    
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${id}`);
    revalidatePath(`/admin/products/${unit.productId}`);
    return { success: true as const, unit: { id: unit.id } };
  } catch (error) {
    return handleError(error);
  }
}

export async function changeStatusAction(id: string, status: PhoneUnitStatus, reason: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const unit = await PhoneUnitService.changeStatus(session, id, status, reason);
    
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${id}`);
    revalidatePath(`/admin/products/${unit.productId}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteUnitAction(id: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const unit = await PhoneUnitService.softDeleteUnit(session, id);
    
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${id}`);
    revalidatePath(`/admin/products/${unit.productId}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function restoreUnitAction(id: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const unit = await PhoneUnitService.restoreUnit(session, id);
    
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${id}`);
    revalidatePath(`/admin/products/${unit.productId}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}
