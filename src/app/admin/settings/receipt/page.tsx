import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsService } from "@/lib/services/settings.service";
import SettingsForm from "../settings-form";
import type { FieldDef } from "../settings-form";

export const metadata: Metadata = {
  title: "Receipt Settings - MobileX Admin",
};

const FIELDS: FieldDef[] = [
  {
    key: "receipt.invoicePrefix",
    label: "Invoice Prefix",
    description: "Prefix used for bill numbers (e.g. INV → INV-000123).",
    type: "text",
    placeholder: "INV",
  },
  {
    key: "receipt.businessRegNo",
    label: "Business Registration Number",
    description: "Official business registration / VAT number printed on receipts.",
    type: "text",
    placeholder: "REG-123456",
  },
  {
    key: "receipt.taxInfo",
    label: "Tax Information",
    description: "Tax rate or tax note displayed on receipts (e.g. VAT included / 0% VAT).",
    type: "text",
    placeholder: "VAT included at 20%",
  },
  {
    key: "receipt.footer",
    label: "Receipt Footer Message",
    description: "Thank-you message or terms printed at the bottom of receipts.",
    type: "textarea",
    placeholder: "Thank you for your purchase! All sales are final.",
  },
];

export default async function ReceiptSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  let values: Record<string, string> = {};
  try {
    const data = await SettingsService.getGroupSettings(session, "receipt");
    values = data as unknown as Record<string, string>;
  } catch (e) {
    console.error("[RECEIPT_SETTINGS_ERROR]", e);
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
          <span className="text-2xl">🧾</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Receipt Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Invoice prefix, tax information, and receipt footer content.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 max-w-2xl">
        <SettingsForm
          group="receipt"
          fields={FIELDS}
          values={values}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
