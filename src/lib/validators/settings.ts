/**
 * Settings validators — one Zod schema per settings group.
 *
 * Keys are always stored as strings in system_config.
 * Booleans are stored as "true" / "false".
 * Numbers are stored as numeric strings.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Helper: trim string, allow empty
// ---------------------------------------------------------------------------
const zStr = z.string().trim().max(1000);
const zOptStr = z.string().trim().max(1000).optional().default("");

// ---------------------------------------------------------------------------
// 1. General / Shop Info
// ---------------------------------------------------------------------------
export const zGeneralSettings = z.object({
  "shop.name": zStr.min(1, "Shop name is required.").max(100),
  "shop.tagline": zOptStr,
  "shop.address": zOptStr,
  "shop.phone": zOptStr,
  "shop.email": z
    .string()
    .trim()
    .email("Must be a valid email.")
    .optional()
    .or(z.literal(""))
    .default(""),
  "shop.whatsapp": zOptStr,
  "shop.businessHours": zOptStr,
});

export type GeneralSettings = z.infer<typeof zGeneralSettings>;

export const GENERAL_DEFAULTS: GeneralSettings = {
  "shop.name": "MobileX",
  "shop.tagline": "Your trusted used phone store",
  "shop.address": "",
  "shop.phone": "",
  "shop.email": "",
  "shop.whatsapp": "",
  "shop.businessHours": "",
};

// ---------------------------------------------------------------------------
// 2. Receipt Settings
// ---------------------------------------------------------------------------
export const zReceiptSettings = z.object({
  "receipt.footer": zOptStr,
  "receipt.taxInfo": zOptStr,
  "receipt.businessRegNo": zOptStr,
  "receipt.invoicePrefix": z.string().trim().max(10).optional().default("INV"),
});

export type ReceiptSettings = z.infer<typeof zReceiptSettings>;

export const RECEIPT_DEFAULTS: ReceiptSettings = {
  "receipt.footer": "Thank you for your purchase!",
  "receipt.taxInfo": "",
  "receipt.businessRegNo": "",
  "receipt.invoicePrefix": "INV",
};

// ---------------------------------------------------------------------------
// 3. Inventory Settings
// ---------------------------------------------------------------------------
export const zInventorySettings = z.object({
  "inventory.lowStockThreshold": z
    .string()
    .trim()
    .regex(/^\d+$/, "Must be a positive integer.")
    .default("5"),
  "inventory.defaultProductVisibility": z
    .enum(["true", "false"])
    .default("false"),
  "inventory.defaultUnitStatus": z
    .enum(["AVAILABLE", "RESERVED"])
    .default("AVAILABLE"),
});

export type InventorySettings = z.infer<typeof zInventorySettings>;

export const INVENTORY_DEFAULTS: InventorySettings = {
  "inventory.lowStockThreshold": "5",
  "inventory.defaultProductVisibility": "false",
  "inventory.defaultUnitStatus": "AVAILABLE",
};

// ---------------------------------------------------------------------------
// 4. Public Catalog Settings
// ---------------------------------------------------------------------------
export const zCatalogSettings = z.object({
  "catalog.enabled": z.enum(["true", "false"]).default("true"),
  "catalog.showPrices": z.enum(["true", "false"]).default("true"),
  "catalog.showBatteryHealth": z.enum(["true", "false"]).default("false"),
  "catalog.showSoldUnits": z.enum(["true", "false"]).default("false"),
  "catalog.featuredCount": z
    .string()
    .trim()
    .regex(/^\d+$/, "Must be a positive integer.")
    .default("8"),
});

export type CatalogSettings = z.infer<typeof zCatalogSettings>;

export const CATALOG_DEFAULTS: CatalogSettings = {
  "catalog.enabled": "true",
  "catalog.showPrices": "true",
  "catalog.showBatteryHealth": "false",
  "catalog.showSoldUnits": "false",
  "catalog.featuredCount": "8",
};

// ---------------------------------------------------------------------------
// Group meta — used by the dashboard
// ---------------------------------------------------------------------------
export const SETTINGS_GROUPS = [
  {
    key: "general",
    label: "General",
    description: "Shop name, contact, and business hours.",
    icon: "🏪",
    href: "/admin/settings/general",
  },
  {
    key: "receipt",
    label: "Receipt",
    description: "Invoice prefix, footer, tax information.",
    icon: "🧾",
    href: "/admin/settings/receipt",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Low stock threshold and default unit rules.",
    icon: "📦",
    href: "/admin/settings/inventory",
  },
  {
    key: "catalog",
    label: "Public Catalog",
    description: "Public storefront visibility and display rules.",
    icon: "🌐",
    href: "/admin/settings/catalog",
  },
] as const;
