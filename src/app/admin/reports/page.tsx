import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportService } from "@/lib/services/report.service";

export const metadata: Metadata = {
  title: "Reports Overview - MobileX Admin",
  description: "View store sales, bills, and stock statistics.",
};

export default async function OverviewDashboardPage() {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  let metrics;
  try {
    metrics = await ReportService.getDashboardMetrics(session);
  } catch (error) {
    console.error("[REPORTS_DASHBOARD_ERROR]", error);
  }

  if (!metrics) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Dashboard Stats</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while retrieving summary reports.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStockBadge = (isUnitTracked: boolean, availableUnitCount: number, stockQuantity: number) => {
    const stock = isUnitTracked ? availableUnitCount : stockQuantity;
    if (stock === 0) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  const getStockLabel = (isUnitTracked: boolean, availableUnitCount: number, stockQuantity: number) => {
    const stock = isUnitTracked ? availableUnitCount : stockQuantity;
    if (stock === 0) {
      return "Out of Stock";
    }
    return `${stock} Units Left`;
  };

  return (
    <div className="space-y-8">
      {/* Overview Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Today's Revenue</span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
              Today
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(metrics.todaySales.revenue)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Across <span className="font-semibold text-zinc-300 font-mono">{metrics.todaySales.billsCount}</span> bills generated today
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Weekly Revenue</span>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 border border-indigo-500/20">
              This Week
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(metrics.weekSales.revenue)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Across <span className="font-semibold text-zinc-300 font-mono">{metrics.weekSales.billsCount}</span> bills since Sunday
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Revenue</span>
            <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-400 border border-purple-500/20">
              This Month
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(metrics.monthSales.revenue)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Across <span className="font-semibold text-zinc-300 font-mono">{metrics.monthSales.billsCount}</span> bills this month
          </div>
        </div>

        {/* Total Overall Sales */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Revenue</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-bold text-zinc-400 border border-zinc-700">
              All Time
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(metrics.overallSales.revenue)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Across <span className="font-semibold text-zinc-300 font-mono">{metrics.overallSales.billsCount}</span> lifetime invoices
          </div>
        </div>
      </div>

      {/* Secondary Status Counts Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Inventory Counts Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 md:col-span-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Inventory Totals
          </h2>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Available Stock</span>
                <span className="text-[10px] text-zinc-500 block">Ready to sell</span>
              </div>
              <span className="text-xl font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 rounded-lg">
                {metrics.availableInventoryCount}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-900 pt-4">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Sold Inventory</span>
                <span className="text-[10px] text-zinc-500 block">Total physical units sold</span>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-lg">
                {metrics.soldInventoryCount}
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts Section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Low Stock Warnings
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">Stock threshold &lt; 3</span>
          </div>

          <div className="overflow-x-auto">
            {metrics.lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-xs font-semibold text-zinc-400">All Products Well Stocked</h3>
                <p className="text-[10px] text-zinc-600">No products are currently under the warning threshold.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-semibold">
                    <th className="pb-3 pr-4">Product Model</th>
                    <th className="pb-3 px-4">Brand / Category</th>
                    <th className="pb-3 pl-4 text-right">Available Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {metrics.lowStockProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-zinc-900/10">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-zinc-200">{product.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">SKU: {product.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        <div>{product.brandName}</div>
                        <div className="text-[10px] text-zinc-500">{product.categoryName}</div>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${getStockBadge(
                          product.isUnitTracked,
                          product.availableUnitCount,
                          product.stockQuantity
                        )}`}>
                          {getStockLabel(product.isUnitTracked, product.availableUnitCount, product.stockQuantity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
