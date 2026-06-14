import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsService } from "@/lib/services/settings.service";
import SettingsForm from "../settings-form";
import type { FieldDef } from "../settings-form";

export const metadata: Metadata = {
  title: "Public Catalog Settings - MobileX Admin",
};

const FIELDS: FieldDef[] = [
  {
    key: "catalog.enabled",
    label: "Enable Public Catalog",
    description:
      "Toggle the public-facing storefront. Disable to take the catalog offline without deleting data.",
    type: "toggle",
  },
  {
    key: "catalog.showPrices",
    label: "Show Prices Publicly",
    description:
      "Display product prices on the public storefront. Disable for a quote-only catalog.",
    type: "toggle",
  },
  {
    key: "catalog.showBatteryHealth",
    label: "Show Battery Health Publicly",
    description:
      "Show the battery health percentage on public product listings.",
    type: "toggle",
  },
  {
    key: "catalog.showSoldUnits",
    label: "Show Sold Units",
    description:
      "Include sold / out-of-stock products in public search results and listings.",
    type: "toggle",
  },
  {
    key: "catalog.featuredCount",
    label: "Featured Products Count",
    description:
      "How many featured products are displayed on the storefront homepage.",
    type: "number",
    placeholder: "8",
  },
];

export default async function CatalogSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  let values: Record<string, string> = {};
  try {
    const data = await SettingsService.getGroupSettings(session, "catalog");
    values = data as unknown as Record<string, string>;
  } catch (e) {
    console.error("[CATALOG_SETTINGS_ERROR]", e);
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
          <span className="text-2xl">🌐</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Public Catalog Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Control what information is visible on the public storefront.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 max-w-2xl">
        <SettingsForm
          group="catalog"
          fields={FIELDS}
          values={values}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
