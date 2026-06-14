import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportService } from "@/lib/services/report.service";

export const metadata: Metadata = {
  title: "Product Performance Reports - MobileX Admin",
  description: "Monitor best selling models, brand revenue contributions, and volumes.",
};

export default async function ProductPerformanceReportsPage() {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  // RBAC boundary: STAFF role is blocked
  if (session.role === "STAFF") {
    redirect("/admin/reports");
  }

  let report;
  try {
    report = await ReportService.getProductPerformanceReport(session);
  } catch (error) {
    console.error("[PRODUCT_PERFORMANCE_PAGE_ERROR]", error);
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Performance Reports</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while generating model analytics.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const { topProducts, topBrands } = report;

  // Track max revenue benchmarks to draw proportional scale bars
  const maxProductRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue)) : 1;
  const maxBrandRevenue = topBrands.length > 0 ? Math.max(...topBrands.map((b) => b.revenue)) : 1;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Top Products Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 lg:col-span-2">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Top Selling Products</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Ranked by revenue contribution</p>
        </div>

        <div className="overflow-x-auto">
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-4 text-xs font-semibold text-zinc-400">No Sales Data Available</h3>
              <p className="text-[10px] text-zinc-600">No items have been sold through the POS billing workspace yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-2 w-12 text-center">Rank</th>
                  <th className="pb-3 px-4">Model Description</th>
                  <th className="pb-3 px-4 text-center">Qty Sold</th>
                  <th className="pb-3 pl-4 text-right">Revenue Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {topProducts.map((p, idx) => {
                  const percentOfMax = (p.revenue / maxProductRevenue) * 100;
                  return (
                    <tr key={p.productId} className="hover:bg-zinc-900/10">
                      {/* Rank badge */}
                      <td className="py-4 pr-2 text-center">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          idx === 0 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                            : idx === 1 
                            ? "bg-zinc-300/10 text-zinc-300 border border-zinc-400/25"
                            : idx === 2
                            ? "bg-amber-700/10 text-amber-600 border border-amber-800/20"
                            : "bg-zinc-900 text-zinc-500"
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-zinc-200">{p.name}</div>
                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                          SKU: {p.sku} • {p.brandName}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-4 px-4 text-center font-mono font-medium text-zinc-300">
                        {p.quantitySold}
                      </td>

                      {/* Revenue */}
                      <td className="py-4 pl-4 text-right space-y-1.5">
                        <div className="font-bold text-white font-mono">{formatCurrency(p.revenue)}</div>
                        <div className="w-full max-w-[120px] ml-auto h-1 rounded-full bg-zinc-900 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentOfMax}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Top Brands Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 lg:col-span-1">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Brand Contributions</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Summary of sales by manufacturer brand</p>
        </div>

        {topBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-xs font-semibold text-zinc-400">No Brand Metrics</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {topBrands.map((brand, idx) => {
              const percentOfMax = (brand.revenue / maxBrandRevenue) * 100;
              return (
                <div key={brand.brandId} className="border border-zinc-900 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                      <span className="font-bold text-zinc-200">{brand.name}</span>
                    </div>
                    <span className="font-mono text-zinc-500 text-[10px]">
                      <span className="font-semibold text-zinc-300">{formatCurrency(brand.revenue)}</span> ({brand.quantitySold} sold)
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${percentOfMax}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
