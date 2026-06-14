import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsService } from "@/lib/services/settings.service";
import SettingsForm from "../settings-form";
import type { FieldDef } from "../settings-form";

export const metadata: Metadata = {
  title: "Inventory Settings - MobileX Admin",
};

const FIELDS: FieldDef[] = [
  {
    key: "inventory.lowStockThreshold",
    label: "Low Stock Threshold",
    description:
      "Products with fewer available units than this number will be flagged as low stock in reports.",
    type: "number",
    placeholder: "5",
  },
  {
    key: "inventory.defaultProductVisibility",
    label: "Default Product Listing State",
    description:
      "Whether newly created products are listed (visible) or unlisted (hidden) by default.",
    type: "select",
    options: [
      { value: "false", label: "Unlisted (hidden) — recommended" },
      { value: "true", label: "Listed (visible) immediately" },
    ],
  },
  {
    key: "inventory.defaultUnitStatus",
    label: "Default Unit Status",
    description:
      "The initial status assigned to a phone unit when it is first added to inventory.",
    type: "select",
    options: [
      { value: "AVAILABLE", label: "Available — ready for sale" },
      { value: "RESERVED", label: "Reserved — held for review" },
    ],
  },
];

export default async function InventorySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  let values: Record<string, string> = {};
  try {
    const data = await SettingsService.getGroupSettings(session, "inventory");
    values = data as unknown as Record<string, string>;
  } catch (e) {
    console.error("[INVENTORY_SETTINGS_ERROR]", e);
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Settings
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Low stock alerts and default behaviour for new products and units.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 max-w-2xl">
        <SettingsForm
          group="inventory"
          fields={FIELDS}
          values={values}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
