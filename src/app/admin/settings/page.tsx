import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsService } from "@/lib/services/settings.service";
import { SETTINGS_GROUPS } from "@/lib/validators/settings";
import type { AllSettings } from "@/lib/services/settings.service";

export const metadata: Metadata = {
  title: "Settings - MobileX Admin",
  description: "View and manage shop settings and system configuration.",
};

// Flat list of all setting keys and labels for search
const ALL_SETTING_LABELS: { key: string; label: string; group: string; groupLabel: string }[] = [
  // General
  { key: "shop.name", label: "Shop Name", group: "general", groupLabel: "General" },
  { key: "shop.tagline", label: "Shop Tagline", group: "general", groupLabel: "General" },
  { key: "shop.address", label: "Shop Address", group: "general", groupLabel: "General" },
  { key: "shop.phone", label: "Shop Phone", group: "general", groupLabel: "General" },
  { key: "shop.email", label: "Shop Email", group: "general", groupLabel: "General" },
  { key: "shop.whatsapp", label: "WhatsApp Number", group: "general", groupLabel: "General" },
  { key: "shop.businessHours", label: "Business Hours", group: "general", groupLabel: "General" },
  // Receipt
  { key: "receipt.footer", label: "Receipt Footer", group: "receipt", groupLabel: "Receipt" },
  { key: "receipt.taxInfo", label: "Tax Information", group: "receipt", groupLabel: "Receipt" },
  { key: "receipt.businessRegNo", label: "Business Reg. No.", group: "receipt", groupLabel: "Receipt" },
  { key: "receipt.invoicePrefix", label: "Invoice Prefix", group: "receipt", groupLabel: "Receipt" },
  // Inventory
  { key: "inventory.lowStockThreshold", label: "Low Stock Threshold", group: "inventory", groupLabel: "Inventory" },
  { key: "inventory.defaultProductVisibility", label: "Default Product Visibility", group: "inventory", groupLabel: "Inventory" },
  { key: "inventory.defaultUnitStatus", label: "Default Unit Status", group: "inventory", groupLabel: "Inventory" },
  // Catalog
  { key: "catalog.enabled", label: "Enable Public Catalog", group: "catalog", groupLabel: "Public Catalog" },
  { key: "catalog.showPrices", label: "Show Prices Publicly", group: "catalog", groupLabel: "Public Catalog" },
  { key: "catalog.showBatteryHealth", label: "Show Battery Health Publicly", group: "catalog", groupLabel: "Public Catalog" },
  { key: "catalog.showSoldUnits", label: "Show Sold Units Publicly", group: "catalog", groupLabel: "Public Catalog" },
  { key: "catalog.featuredCount", label: "Featured Products Count", group: "catalog", groupLabel: "Public Catalog" },
];

interface SearchParams {
  q?: string;
}

export default async function SettingsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  const params = await searchParams;
  const query = (params.q || "").toLowerCase().trim();

  let allSettings: AllSettings | undefined;
  try {
    allSettings = await SettingsService.getAllSettings(session);
  } catch (e) {
    console.error("[SETTINGS_DASHBOARD_ERROR]", e);
  }

  // All key-value pairs flat
  const flatValues: Record<string, string> = {};
  if (allSettings) {
    for (const group of Object.values(allSettings)) {
      for (const [k, v] of Object.entries(group)) {
        flatValues[k] = v as string;
      }
    }
  }

  // Search filter
  const filteredSettings = query
    ? ALL_SETTING_LABELS.filter(
        (s) =>
          s.label.toLowerCase().includes(query) ||
          s.key.toLowerCase().includes(query) ||
          (flatValues[s.key] || "").toLowerCase().includes(query)
      )
    : null;

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isSuperAdmin ? "Configure shop preferences and system defaults." : "View shop preferences and system configuration."}
          </p>
        </div>
      </div>

      {/* Search */}
      <form
        method="GET"
        action="/admin/settings"
        className="flex gap-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={params.q || ""}
          placeholder="Search settings (e.g. shop name, tax, threshold…)"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Search
        </button>
        {params.q && (
          <Link
            href="/admin/settings"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Search Results */}
      {filteredSettings !== null && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="border-b border-zinc-900 px-6 py-4">
            <h2 className="text-sm font-bold text-white">
              Search Results
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {filteredSettings.length} match{filteredSettings.length !== 1 ? "es" : ""} for &ldquo;{params.q}&rdquo;
              </span>
            </h2>
          </div>
          {filteredSettings.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-500 text-sm">
              No settings match your search.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Setting</th>
                  <th className="px-6 py-3 text-left">Group</th>
                  <th className="px-6 py-3 text-left">Current Value</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {filteredSettings.map((s) => (
                  <tr key={s.key} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-semibold">{s.label}</div>
                      <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{s.key}</div>
                    </td>
                    <td className="px-6 py-3 text-zinc-400">{s.groupLabel}</td>
                    <td className="px-6 py-3 max-w-xs">
                      <span className="truncate block text-zinc-300">
                        {flatValues[s.key] || <span className="italic text-zinc-600">not set</span>}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/settings/${s.group}`}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settings Category Cards */}
      {filteredSettings === null && (
        <div className="grid gap-5 sm:grid-cols-2">
          {SETTINGS_GROUPS.map((group) => {
            const groupValues = allSettings ? (allSettings as Record<string, Record<string, string>>)[group.key] : {};
            const filledCount = Object.values(groupValues || {}).filter((v) => v && v !== "false").length;
            const totalCount = ALL_SETTING_LABELS.filter((s) => s.group === group.key).length;

            return (
              <Link
                key={group.key}
                href={group.href}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/50"
              >
                {/* Accent glow */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-500/5 to-transparent" />

                <div className="flex items-start justify-between gap-4">
                  <div className="text-3xl">{group.icon}</div>
                  <svg
                    className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-colors mt-1 flex-shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="mt-4">
                  <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {group.label}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">{group.description}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">
                    {filledCount}/{totalCount} configured
                  </span>
                </div>

                {isSuperAdmin ? (
                  <div className="mt-3 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    Click to edit →
                  </div>
                ) : (
                  <div className="mt-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    View only
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
