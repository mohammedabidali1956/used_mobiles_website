"use server";

import { getSession } from "@/lib/auth";
import { ProductService } from "@/lib/services";
import { productRepo, auditLogRepo } from "@/lib/repositories";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { requireRole } from "@/lib/auth/permissions";

/**
 * Standardized server action error handler.
 * Formats AppErrors, ZodErrors, and unexpected system errors.
 */
function handleError(error: unknown) {
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
  console.error("[PRODUCTS_ACTION_ERROR]", error);
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}

export async function createProductAction(data: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const product = await ProductService.createProduct(session, data);
    revalidatePath("/admin/products");
    return { success: true as const, product: { id: product.id } };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateProductAction(id: string, data: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const product = await ProductService.updateProduct(session, id, data);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/admin/products/${id}/edit`);
    return { success: true as const, product: { id: product.id } };
  } catch (error) {
    return handleError(error);
  }
}

export async function toggleVisibilityAction(id: string, isListed: boolean) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    await ProductService.updateProductVisibility(session, id, { isListed });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteProductAction(id: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    await ProductService.softDeleteProduct(session, id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}

export async function restoreProductAction(id: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    requireRole(session.role, "ADMIN");

    const product = await productRepo.findById(id);
    if (!product) {
      return { success: false as const, error: "Product not found." };
    }
    if (!product.deletedAt) {
      return { success: false as const, error: "Product is not deleted." };
    }

    await prisma.$transaction(async (tx) => {
      await productRepo.restore(id, tx);
      await auditLogRepo.create(
        {
          userId: session.sub,
          action: "PRODUCT_RESTORED",
          entityType: "PRODUCT",
          entityId: id,
          oldData: { deletedAt: product.deletedAt },
          newData: { deletedAt: null },
          ipAddress: null,
          userAgent: null,
        },
        tx
      );
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}
