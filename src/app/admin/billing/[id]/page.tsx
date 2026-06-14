import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BillingService } from "@/lib/services";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    try {
      const bill = await BillingService.getBillDetails(session, id);
      return {
        title: `Bill ${bill.billNumber} Details - MobileX Admin`,
      };
    } catch {}
  }

  return {
    title: "Bill Invoice Details - MobileX Admin",
  };
}

export default async function AdminBillingDetailPage({ params }: PageProps) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let bill;

  try {
    bill = await BillingService.getBillDetails(session, id);
  } catch (error) {
    console.error("[BILL_DETAILS_PAGE_ERROR]", error);
  }

  if (!bill) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Billing
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Invoice Not Found</h2>
          <p className="mt-1 text-sm">The POS billing invoice you requested could not be found or you do not have permission to view it.</p>
        </div>
      </div>
    );
  }

  // Calculate gross sum of unit price * quantity before any item-level discounts
  const grossSum = bill.billItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const itemsDiscountSum = bill.billItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const netSum = grossSum - itemsDiscountSum;

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "CARD":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "TRANSFER":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back button */}
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

      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">{bill.billNumber}</h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${getMethodBadge(bill.paymentMethod)}`}>
              {bill.paymentMethod}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Registered on <span className="font-semibold text-zinc-300">{new Date(bill.createdAt).toLocaleDateString()}</span> at <span className="font-semibold text-zinc-300">{new Date(bill.createdAt).toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/billing/${bill.id}/receipt`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" />
            </svg>
            Print Receipt
          </Link>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Info Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Customer Profile
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Name</span>
              <span className="text-zinc-200 mt-1 block font-semibold">
                {bill.customerName || <span className="text-zinc-500 italic">Walk-in Customer</span>}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Phone Number</span>
              <span className="text-zinc-200 mt-1 block font-mono font-medium">
                {bill.customerPhone || <span className="text-zinc-500 italic">—</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Billed By & Methods Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Billing & Administration
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Billed By (Staff)</span>
              <span className="text-zinc-200 mt-1 block font-semibold">
                {bill.staff.name}
              </span>
              <span className="text-zinc-500 font-mono block text-[10px] mt-0.5">
                {bill.staff.email}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Payment Option</span>
              <span className="text-zinc-200 mt-1 block font-semibold">
                {bill.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing totals summary */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Transaction Total Calc
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Gross Items Total</span>
              <span className="font-mono text-zinc-300">${grossSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-rose-500/70">
              <span>Item-Level Discounts</span>
              <span className="font-mono">-${itemsDiscountSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500 font-semibold">Net Items Total</span>
              <span className="font-mono text-zinc-300">${netSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2 text-rose-500/70">
              <span>Header POS Discount</span>
              <span className="font-mono">-${bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-white pt-1">
              <span className="font-extrabold uppercase">Final Paid</span>
              <span className="font-mono">${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill items grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Purchased Unit / Model</th>
                <th className="px-6 py-4">Hardware Specifications</th>
                <th className="px-6 py-4">Condition & Grade</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4 text-right">Discount</th>
                <th className="px-6 py-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {bill.billItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-900/10 transition-colors">
                  {/* Name / Sku / IMEI */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-zinc-200">{item.productName}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                      Model SKU: {item.productSku} {item.unitSku && `• Unit SKU: ${item.unitSku}`}
                    </div>
                    {item.unitImei ? (
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        IMEI: {item.unitImei}
                      </div>
                    ) : (
                      item.phoneUnitId && (
                        <div className="text-[10px] text-zinc-600 italic mt-0.5">
                          IMEI: Restricted (Staff)
                        </div>
                      )
                    )}
                  </td>

                  {/* Specs */}
                  <td className="px-6 py-4 text-zinc-400 font-medium">
                    {item.unitStorage || "N/A"} • {item.unitColor || "N/A"}
                  </td>

                  {/* Condition & Grade */}
                  <td className="px-6 py-4">
                    {item.unitCondition ? (
                      <div className="flex gap-1.5 items-center">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 font-bold uppercase text-[9px] text-zinc-400">
                          {item.unitCondition}
                        </span>
                        {item.unitGrade && (
                          <span className="rounded border border-indigo-500/20 bg-indigo-500/5 px-1.5 py-0.5 font-bold text-[9px] text-indigo-400">
                            G: {item.unitGrade.replace("_", "+")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  {/* Unit price */}
                  <td className="px-6 py-4 text-right font-medium text-zinc-300">
                    ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Item discount */}
                  <td className="px-6 py-4 text-right text-rose-400 font-medium">
                    {item.discount > 0 ? (
                      `-$${item.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  {/* Line Total */}
                  <td className="px-6 py-4 text-right font-bold text-white text-sm font-mono">
                    ${item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice notes footer */}
      {bill.notes && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
          <h3 className="font-bold text-white text-sm">Administrative POS Notes</h3>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-900/30 border border-zinc-900 p-3 rounded-lg whitespace-pre-wrap">
            {bill.notes}
          </p>
        </div>
      )}
    </div>
  );
}
