import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsService } from "@/lib/services/settings.service";
import SettingsForm from "../settings-form";
import type { FieldDef } from "../settings-form";

export const metadata: Metadata = {
  title: "General Settings - MobileX Admin",
};

const FIELDS: FieldDef[] = [
  {
    key: "shop.name",
    label: "Shop Name",
    description: "The display name used in receipts and the public storefront.",
    type: "text",
    placeholder: "e.g. MobileX",
  },
  {
    key: "shop.tagline",
    label: "Shop Tagline",
    description: "A short marketing tagline shown on receipts and the storefront header.",
    type: "text",
    placeholder: "e.g. Your trusted used phone store",
  },
  {
    key: "shop.address",
    label: "Shop Address",
    description: "Full physical address printed on receipts.",
    type: "textarea",
    placeholder: "123 Main Street, City, Country",
  },
  {
    key: "shop.phone",
    label: "Phone Number",
    description: "Primary contact phone shown on receipts.",
    type: "text",
    placeholder: "+1 555 000 0000",
  },
  {
    key: "shop.email",
    label: "Email Address",
    description: "Customer-facing contact email.",
    type: "email",
    placeholder: "hello@mobilex.com",
  },
  {
    key: "shop.whatsapp",
    label: "WhatsApp Number",
    description: "WhatsApp contact number (include country code, digits only).",
    type: "text",
    placeholder: "15550000000",
  },
  {
    key: "shop.businessHours",
    label: "Business Hours",
    description: "Opening hours shown on receipts and the storefront.",
    type: "textarea",
    placeholder: "Mon–Fri: 9am–6pm, Sat: 10am–4pm",
  },
];

export default async function GeneralSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  let values: Record<string, string> = {};
  try {
    const data = await SettingsService.getGroupSettings(session, "general");
    values = data as unknown as Record<string, string>;
  } catch (e) {
    console.error("[GENERAL_SETTINGS_ERROR]", e);
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
          <span className="text-2xl">🏪</span>
          <div>
            <h1 className="text-2xl font-bold text-white">General Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Shop identity, contact information, and business hours.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 max-w-2xl">
        <SettingsForm
          group="general"
          fields={FIELDS}
          values={values}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
