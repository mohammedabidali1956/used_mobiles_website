"use server";

import { getSession } from "@/lib/auth";
import { BillingService } from "@/lib/services";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";
import { headers } from "next/headers";

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
  console.error("[BILLING_ACTION_ERROR]", error);
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}

/**
 * Server action to create a new POS bill transaction.
 * Automatically marks units as SOLD, adjusts product counts, and logs audit + stock events.
 */
export async function createBillAction(data: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || undefined;
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0] || undefined;

    const result = await BillingService.createBill(session, data, ipAddress, userAgent);

    // Revalidate paths for inventory & products changes
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidatePath("/billing");

    // Revalidate individual product detail pages affected by the sale
    if (result.affectedProductIds) {
      for (const prodId of result.affectedProductIds) {
        revalidatePath(`/admin/products/${prodId}`);
      }
    }

    return {
      success: true as const,
      billId: result.id,
      billNumber: result.billNumber,
      total: result.total,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to fetch receipt details for POS printing or view, excluding IMEI.
 */
export async function getReceiptDataAction(billId: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const receipt = await BillingService.generateReceipt(session, billId);
    return {
      success: true as const,
      receipt,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to fetch complete bill details, enforcing RBAC and masking IMEI for staff.
 */
export async function getBillDetailsAction(id: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const bill = await BillingService.getBillDetails(session, id);
    return {
      success: true as const,
      bill,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to list bills with pagination, range queries, and search constraints.
 */
export async function listBillsAction(query: any) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const result = await BillingService.listBills(session, query);
    return {
      success: true as const,
      ...result,
    };
  } catch (error) {
    return handleError(error);
  }
}

