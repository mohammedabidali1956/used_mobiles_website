"use server";

import { getSession } from "@/lib/auth";
import { ReportService } from "@/lib/services";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";

/**
 * Standardized server action error handler.
 * Formats AppErrors, ZodErrors, and unexpected system errors.
 */
function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      success: false as const,
      error: "Validation failed. Please check the input filters.",
      details: error.flatten().fieldErrors,
    };
  }
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: error.message,
    };
  }
  console.error("[REPORTS_ACTION_ERROR]", error);
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}

/**
 * Server action to get general overview stats dashboard cards.
 * Access role: STAFF or higher.
 */
export async function getDashboardMetricsAction() {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const metrics = await ReportService.getDashboardMetrics(session);
    return {
      success: true as const,
      metrics,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to fetch sales reports with date range filters.
 * Access role: ADMIN or higher.
 */
export async function getSalesReportAction(from?: string, to?: string) {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const report = await ReportService.getSalesReport(session, from, to);
    return {
      success: true as const,
      report,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to generate inventory audit report details.
 * Access role: ADMIN or higher.
 */
export async function getInventoryReportAction() {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const report = await ReportService.getInventoryReport(session);
    return {
      success: true as const,
      report,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Server action to retrieve top-selling product and brand metrics.
 * Access role: ADMIN or higher.
 */
export async function getProductPerformanceReportAction() {
  const session = await getSession();
  if (!session) {
    return { success: false as const, error: "Authentication required." };
  }

  try {
    const report = await ReportService.getProductPerformanceReport(session);
    return {
      success: true as const,
      report,
    };
  } catch (error) {
    return handleError(error);
  }
}
