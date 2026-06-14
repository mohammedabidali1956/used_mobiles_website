import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReportService } from "@/lib/services/report.service";

export const metadata: Metadata = {
  title: "Sales Reports - MobileX Admin",
  description: "Analyze store revenue, bills volume, and payment breakdowns.",
};

interface SearchParams {
  from?: string;
  to?: string;
}

export default async function SalesReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  // RBAC boundary: STAFF role is blocked
  if (session.role === "STAFF") {
    redirect("/admin/reports");
  }

  // Resolve search parameters promise
  const params = await searchParams;

  // Set default values (last 30 days)
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const defaultTo = new Date().toISOString().split("T")[0];

  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  let report;
  try {
    report = await ReportService.getSalesReport(session, from, to);
  } catch (error) {
    console.error("[SALES_REPORT_PAGE_ERROR]", error);
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Sales Reports</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while calculating sales aggregations.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "CASH":
        return "bg-emerald-500";
      case "CARD":
        return "bg-blue-500";
      case "TRANSFER":
        return "bg-purple-500";
      default:
        return "bg-zinc-500";
    }
  };

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

  // Calculate AOV (Average Order Value)
  const aov = report.billsCount > 0 ? report.revenue / report.billsCount : 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selection Panel */}
      <form
        method="GET"
        action="/admin/reports/sales"
        className="grid gap-4 sm:flex sm:items-end border border-zinc-800 bg-zinc-950 p-4 rounded-xl"
      >
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">From Date</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full rounded-lg border border-zinc-850 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">To Date</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full rounded-lg border border-zinc-850 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          Apply Filters
        </button>
      </form>

      {/* Aggregate Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Period Revenue</span>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(report.revenue)}</div>
          <p className="text-[10px] text-zinc-500">Sum of paid invoice totals in range</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Period Invoices</span>
          <div className="text-2xl font-bold font-mono text-white">{report.billsCount}</div>
          <p className="text-[10px] text-zinc-500">Count of billing transactions in range</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average Invoice Value</span>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(aov)}</div>
          <p className="text-[10px] text-zinc-500">Average ticket size per checkout</p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
          Payment Method Contribution
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {report.paymentBreakdown.map((pm) => {
            const percentage = report.revenue > 0 ? (pm.revenue / report.revenue) * 100 : 0;
            return (
              <div key={pm.paymentMethod} className="border border-zinc-900 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${getMethodColor(pm.paymentMethod)}`}></span>
                    <span className="font-bold text-zinc-200">{pm.paymentMethod}</span>
                  </div>
                  <span className="text-zinc-500 font-mono">
                    <span className="font-semibold text-zinc-300">{formatCurrency(pm.revenue)}</span> (
                    {pm.billsCount} bills)
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getMethodColor(pm.paymentMethod)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-end text-[9px] font-mono text-zinc-500">
                    {percentage.toFixed(1)}% Share
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden space-y-4">
        <div className="px-6 pt-5 border-b border-zinc-900 pb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Period Transactions Record
          </h2>
        </div>

        <div className="overflow-x-auto">
          {report.bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-zinc-400">No Transactions Found</h3>
              <p className="mt-1 text-xs text-zinc-600 max-w-xs">
                No invoices were recorded during the selected date boundaries.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                  <th className="px-6 py-4 text-right">Discount</th>
                  <th className="px-6 py-4 text-right">Total Paid</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {report.bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-zinc-900/20">
                    <td className="px-6 py-4 font-mono font-semibold text-white">{bill.billNumber}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(bill.createdAt).toLocaleDateString()}
                      <span className="text-[10px] text-zinc-600 block font-mono mt-0.5">
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">
                        {bill.customerName || <span className="text-zinc-500 italic">Walk-in</span>}
                      </div>
                      {bill.customerPhone && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Ph: {bill.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-bold tracking-wide text-[9px] uppercase ${getMethodBadge(bill.paymentMethod)}`}>
                        {bill.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">{formatCurrency(bill.subtotal)}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-500/70">
                      {bill.discount > 0 ? `-${formatCurrency(bill.discount)}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white font-mono">{formatCurrency(bill.total)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-indigo-400">
                      <Link href={`/admin/billing/${bill.id}`} className="hover:text-indigo-300 transition-colors">
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
