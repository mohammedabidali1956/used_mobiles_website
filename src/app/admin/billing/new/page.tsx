import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import BillingPos from "./billing-pos";

export const metadata: Metadata = {
  title: "New POS Invoice - MobileX Admin",
  description: "Generate a new POS customer billing invoice.",
};

export default async function AdminNewBillingPage() {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Billing Invoices
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">New POS Bill</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Search physical stock, configure customer pricing, and register transaction sales
        </p>
      </div>

      {/* POS Interactive Component */}
      <BillingPos />
    </div>
  );
}
