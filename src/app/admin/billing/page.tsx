import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BillingService } from "@/lib/services";
import BillingFilters from "./billing-filters";

export const metadata: Metadata = {
  title: "POS Billing - MobileX Admin",
  description: "Create and manage point-of-sale customer bills.",
};

interface SearchParams {
  page?: string;
  pageSize?: string;
  from?: string;
  to?: string;
  staffId?: string;
  q?: string;
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  // Resolve search parameters promise
  const params = await searchParams;

  const queryInput = {
    page: params.page || "1",
    pageSize: params.pageSize || "24",
    from: params.from || undefined,
    to: params.to || undefined,
    staffId: params.staffId || undefined,
    q: params.q || undefined,
  };

  let listResult;
  try {
    listResult = await BillingService.listBills(session, queryInput);
  } catch (error) {
    console.error("[BILLING_LIST_PAGE_ERROR]", error);
  }

  if (!listResult) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Billing Invoices</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while retrieving POS records.</p>
      </div>
    );
  }

  const { items, total, page, pageSize } = listResult;
  const totalPages = Math.ceil(total / pageSize);

  const buildPageUrl = (pageNumber: number) => {
    const nextParams = new URLSearchParams(params as Record<string, string>);
    nextParams.set("page", String(pageNumber));
    return `/admin/billing?${nextParams.toString()}`;
  };

  // Helpers for Payment Method Badges
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
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">POS Invoices</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create, view, and search point-of-sale customer bills
          </p>
        </div>

        <Link
          id="btn-new-bill"
          href="/admin/billing/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          New POS Bill
        </Link>
      </div>

      {/* Filter component */}
      <BillingFilters userRole={session.role} />

      {/* Table grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-zinc-300">No Invoices Found</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                No billing transactions matched the current search query or date range selection.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Billed To Customer</th>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Billed By Staff</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {items.map((bill) => (
                  <tr key={bill.id} className="hover:bg-zinc-900/30 transition-colors">
                    {/* Invoice SKU */}
                    <td className="px-6 py-4 font-mono font-semibold text-white">
                      {bill.billNumber}
                    </td>

                    {/* Customer Info */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">
                        {bill.customerName || <span className="text-zinc-500 italic">Walk-in Customer</span>}
                      </div>
                      {bill.customerPhone && (
                        <div className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                          Ph: {bill.customerPhone}
                        </div>
                      )}
                    </td>

                    {/* Transaction date */}
                    <td className="px-6 py-4 text-zinc-300">
                      {new Date(bill.createdAt).toLocaleDateString()}
                      <span className="text-[10px] text-zinc-500 block font-mono mt-0.5">
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </span>
                    </td>

                    {/* Staff Name */}
                    <td className="px-6 py-4 font-medium text-zinc-400">
                      {bill.staffName}
                    </td>

                    {/* Payment Method Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-bold tracking-wide text-[9px] uppercase ${getMethodBadge(bill.paymentMethod)}`}>
                        {bill.paymentMethod}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="px-6 py-4 text-right font-bold text-white text-sm">
                      ${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right font-semibold text-indigo-400">
                      <Link href={`/admin/billing/${bill.id}`} className="hover:text-indigo-300 transition-colors">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-5 sm:flex-row text-xs">
          <div className="text-zinc-500">
            Showing Page <span className="font-semibold text-zinc-300">{page}</span> of{" "}
            <span className="font-semibold text-zinc-300">{totalPages}</span> ({total} bills total)
          </div>

          <div className="flex gap-2">
            <Link
              href={buildPageUrl(page - 1)}
              className={`rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 ${
                page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Previous
            </Link>

            <Link
              href={buildPageUrl(page + 1)}
              className={`rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 ${
                page >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
