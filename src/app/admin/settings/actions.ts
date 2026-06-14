"use server";

import { getSession } from "@/lib/auth";
import { SettingsService } from "@/lib/services/settings.service";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors/AppError";
import type { SettingsGroup } from "@/lib/services/settings.service";

function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return {
      success: false as const,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Validation failed.",
    };
  }
  if (error instanceof AppError) {
    return { success: false as const, error: error.message };
  }
  console.error("[SETTINGS_ACTION_ERROR]", error);
  return {
    success: false as const,
    error: "An unexpected error occurred. Please try again later.",
  };
}

export async function saveSettingsGroupAction(
  group: SettingsGroup,
  data: Record<string, string>
) {
  const session = await getSession();
  if (!session) return { success: false as const, error: "Authentication required." };
  try {
    await SettingsService.saveGroupSettings(session, group, data);
    revalidatePath("/admin/settings");
    revalidatePath(`/admin/settings/${group}`);
    return { success: true as const };
  } catch (error) {
    return handleError(error);
  }
}
