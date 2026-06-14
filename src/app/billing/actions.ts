"use server";

import { getSession } from "@/lib/auth";
import { BillingService, PhoneUnitService, ProductService } from "@/lib/services";
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

/**
 * Server action to search available physical phone units with dynamic metadata.
 * Access role: STAFF, ADMIN, SUPER_ADMIN.
 */
export async function searchAvailableUnitsAction(q: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const result = await PhoneUnitService.listUnits(session, {
      q,
      status: "AVAILABLE",
      pageSize: "50",
      page: "1",
    });

    if (result.items.length === 0) {
      return { success: true as const, units: [] };
    }

    // Map parent product details
    const productIds = Array.from(new Set(result.items.map((item) => item.productId)));
    const products = await ProductService.getProductSummariesByIds(session, productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const mapped = result.items.map((item) => ({
      ...item,
      product: productMap.get(item.productId) || { name: "Unknown Model", sku: "" },
    }));

    return {
      success: true as const,
      units: mapped,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to list all staff members, restricted to ADMIN and SUPER_ADMIN.
 */
export async function listStaffMembersAction() {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const staff = await BillingService.listStaffMembers(session);
    return {
      success: true as const,
      staff,
    };
  } catch (error) {
    return handleError(error);
  }
}


