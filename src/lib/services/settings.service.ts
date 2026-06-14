/**
 * SettingsService — business logic for shop system configuration.
 *
 * All settings are stored in the system_config table as key/value pairs.
 * Keys are namespaced by group (e.g. "shop.name", "receipt.footer").
 *
 * Access rules:
 *   SUPER_ADMIN — read + write
 *   ADMIN       — read only
 *   STAFF       — no access
 */

import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/AppError";
import { systemConfigRepo, auditLogRepo } from "@/lib/repositories";
import type { SessionPayload } from "@/lib/auth/session";
import {
  zGeneralSettings,
  zReceiptSettings,
  zInventorySettings,
  zCatalogSettings,
  GENERAL_DEFAULTS,
  RECEIPT_DEFAULTS,
  INVENTORY_DEFAULTS,
  CATALOG_DEFAULTS,
  type GeneralSettings,
  type ReceiptSettings,
  type InventorySettings,
  type CatalogSettings,
} from "@/lib/validators/settings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SettingsGroup = "general" | "receipt" | "inventory" | "catalog";

export type AllSettings = {
  general: GeneralSettings;
  receipt: ReceiptSettings;
  inventory: InventorySettings;
  catalog: CatalogSettings;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a flat array of SystemConfig rows to a key→value map. */
function toMap(rows: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Merge DB values over defaults so missing keys get the default. */
function mergeWithDefaults<T extends Record<string, string>>(
  defaults: T,
  stored: Record<string, string>
): T {
  const result = { ...defaults } as T;
  for (const k of Object.keys(defaults) as Array<keyof T>) {
    const key = k as string;
    if (stored[key] !== undefined) {
      (result as Record<string, string>)[key] = stored[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SettingsService {
  /**
   * Returns all settings, parsed into their group objects.
   * ADMIN or higher.
   */
  static async getAllSettings(actor: SessionPayload): Promise<AllSettings> {
    requireRole(actor.role, "ADMIN");

    const rows = await systemConfigRepo.findAll();
    const map = toMap(rows);

    return {
      general: mergeWithDefaults(GENERAL_DEFAULTS, map),
      receipt: mergeWithDefaults(RECEIPT_DEFAULTS, map),
      inventory: mergeWithDefaults(INVENTORY_DEFAULTS, map),
      catalog: mergeWithDefaults(CATALOG_DEFAULTS, map),
    };
  }

  /**
   * Returns settings for a single group.
   * ADMIN or higher.
   */
  static async getGroupSettings(
    actor: SessionPayload,
    group: SettingsGroup
  ): Promise<GeneralSettings | ReceiptSettings | InventorySettings | CatalogSettings> {
    requireRole(actor.role, "ADMIN");

    const rows = await systemConfigRepo.findAll();
    const map = toMap(rows);

    switch (group) {
      case "general":
        return mergeWithDefaults(GENERAL_DEFAULTS, map);
      case "receipt":
        return mergeWithDefaults(RECEIPT_DEFAULTS, map);
      case "inventory":
        return mergeWithDefaults(INVENTORY_DEFAULTS, map);
      case "catalog":
        return mergeWithDefaults(CATALOG_DEFAULTS, map);
      default:
        throw new AppError("NOT_FOUND", `Unknown settings group: ${group}`);
    }
  }

  /**
   * Upsert all keys in a settings group.
   * SUPER_ADMIN only.
   *
   * Only changed values are audit-logged.
   */
  static async saveGroupSettings(
    actor: SessionPayload,
    group: SettingsGroup,
    rawData: Record<string, string>
  ): Promise<void> {
    requireRole(actor.role, "SUPER_ADMIN");

    // Validate by group
    let parsed: Record<string, string>;
    switch (group) {
      case "general":
        parsed = zGeneralSettings.parse(rawData) as unknown as Record<string, string>;
        break;
      case "receipt":
        parsed = zReceiptSettings.parse(rawData) as unknown as Record<string, string>;
        break;
      case "inventory":
        parsed = zInventorySettings.parse(rawData) as unknown as Record<string, string>;
        break;
      case "catalog":
        parsed = zCatalogSettings.parse(rawData) as unknown as Record<string, string>;
        break;
      default:
        throw new AppError("NOT_FOUND", `Unknown settings group: ${group}`);
    }

    // Fetch existing values for audit diff
    const existing = await systemConfigRepo.findAll();
    const existingMap = toMap(existing);

    // Build upsert entries
    const entries = Object.entries(parsed).map(([key, value]) => ({
      key,
      value: value as string,
      updatedBy: actor.sub,
    }));

    await systemConfigRepo.upsertMany(entries);

    // Audit log changed keys
    const changedKeys = Object.keys(parsed).filter(
      (k) => existingMap[k] !== (parsed[k] as string)
    );

    if (changedKeys.length > 0) {
      const oldData: Record<string, string> = {};
      const newData: Record<string, string> = {};
      for (const k of changedKeys) {
        oldData[k] = existingMap[k] ?? "";
        newData[k] = parsed[k] as string;
      }

      await auditLogRepo.create({
        userId: actor.sub,
        action: "SETTINGS_UPDATED",
        entityType: "SYSTEM_CONFIG",
        entityId: null,
        oldData: oldData as Prisma.InputJsonValue,
        newData: newData as Prisma.InputJsonValue,
        ipAddress: null,
        userAgent: null,
      });
    }
  }
}
