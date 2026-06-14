import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportService } from "@/lib/services/report.service";

export const metadata: Metadata = {
  title: "Inventory Reports - MobileX Admin",
  description: "Audit physical stock levels, defective units, and reserved counts.",
};

export default async function InventoryReportsPage() {
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
    report = await ReportService.getInventoryReport(session);
  } catch (error) {
    console.error("[INVENTORY_REPORT_PAGE_ERROR]", error);
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Inventory Reports</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while generating inventory logs.</p>
      </div>
    );
  }

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

  const { statusCounts, genericAvailableStock, lowStockProducts } = report;
  const totalDefective = statusCounts.DEFECTIVE + statusCounts.IN_REPAIR;

  return (
    <div className="space-y-6">
      {/* Inventory Status Breakdown Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Units */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available Units</span>
          <div className="text-3xl font-bold font-mono text-indigo-400">{statusCounts.AVAILABLE}</div>
          <p className="text-[10px] text-zinc-500">
            Physical items ready to sell {genericAvailableStock > 0 && `(+ ${genericAvailableStock} generic)`}
          </p>
        </div>

        {/* Reserved Units */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reserved Units</span>
          <div className="text-3xl font-bold font-mono text-blue-400">{statusCounts.RESERVED}</div>
          <p className="text-[10px] text-zinc-500">Units linked to active customer holds</p>
        </div>

        {/* Sold Units */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sold Units</span>
          <div className="text-3xl font-bold font-mono text-emerald-400">{statusCounts.SOLD}</div>
          <p className="text-[10px] text-zinc-500">Total physical units marked sold</p>
        </div>

        {/* Defective Units */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Defective / Repair</span>
          <div className="text-3xl font-bold font-mono text-rose-500">{totalDefective}</div>
          <p className="text-[10px] text-zinc-500">
            {statusCounts.DEFECTIVE} defective • {statusCounts.IN_REPAIR} in repair
          </p>
        </div>
      </div>

      {/* Detailed Low Stock Alert Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden space-y-4">
        <div className="px-6 pt-5 border-b border-zinc-900 pb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Low Stock Product Audits
          </h2>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[9px] font-bold text-zinc-500 border border-zinc-800">
            Threshold &lt; 3 Units
          </span>
        </div>

        <div className="overflow-x-auto">
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-zinc-400">Inventory Levels Healthy</h3>
              <p className="mt-1 text-xs text-zinc-600">All registered models meet safety stock thresholds.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Product Model & SKU</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Tracking Mode</th>
                  <th className="px-6 py-4 text-right">Available Qty</th>
                  <th className="px-6 py-4 text-right">Total Quantity</th>
                  <th className="px-6 py-4 text-right">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/20">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">{p.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">SKU: {p.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{p.brandName}</td>
                    <td className="px-6 py-4 text-zinc-400">{p.categoryName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        p.isUnitTracked 
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {p.isUnitTracked ? "Unit Serialized" : "Generic Stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">
                      {p.isUnitTracked ? p.availableUnitCount : p.stockQuantity}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-500">
                      {p.isUnitTracked ? p.availableUnitCount : p.stockQuantity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${getStockBadge(
                        p.isUnitTracked,
                        p.availableUnitCount,
                        p.stockQuantity
                      )}`}>
                        {getStockLabel(p.isUnitTracked, p.availableUnitCount, p.stockQuantity)}
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
  );
}
