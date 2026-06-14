"use server";

import { getSession } from "@/lib/auth";
import { ReportService } from "@/lib/services";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";

import { handleActionError } from "@/lib/errors/handler";

/**
 * Standardized server action error handler.
 */
function handleError(error: unknown) {
  return handleActionError(error);
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
