import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BillingService } from "@/lib/services/billing.service";
import ReceiptView from "./receipt-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    try {
      const receipt = await BillingService.generateReceipt(session, id);
      return {
        title: `Receipt ${receipt.billNumber} - MobileX Admin`,
      };
    } catch {}
  }

  return {
    title: "Print Receipt - MobileX Admin",
  };
}

export default async function AdminReceiptPage({ params }: PageProps) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let receipt;

  try {
    receipt = await BillingService.generateReceipt(session, id);
  } catch (error) {
    console.error("[RECEIPT_PAGE_ERROR]", error);
  }

  if (!receipt) {
    return (
      <div className="space-y-6">
        <Link
          href={`/admin/billing/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Bill details
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Receipt Not Found</h2>
          <p className="mt-1 text-sm">
            The receipt details you requested could not be retrieved, or you do not have permission to view this invoice.
          </p>
        </div>
      </div>
    );
  }

  return <ReceiptView receipt={receipt} />;
}
