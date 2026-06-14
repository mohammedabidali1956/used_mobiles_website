import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PhoneUnitService, ProductService } from "@/lib/services";
import InventoryActions from "../inventory-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    try {
      const unit = await PhoneUnitService.getUnitDetails(session, id);
      return {
        title: `Unit ${unit.sku} - Stock Details - MobileX Admin`,
      };
    } catch {}
  }

  return {
    title: "Inventory Unit Details - MobileX Admin",
  };
}

export default async function AdminInventoryDetailPage({ params }: PageProps) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let unit;
  let product;
  let historyLogs: any[] = [];

  try {
    // 1. Fetch unit details (automatically filters IMEI and purchasePrice if session role is STAFF)
    unit = await PhoneUnitService.getUnitDetails(session, id);

    // 2. Load product model info & audit movements in parallel
    const [fetchedProduct, logs] = await Promise.all([
      ProductService.getProductSummary(session, unit.productId),
      PhoneUnitService.getUnitMovementHistory(session, id),
    ]);

    product = fetchedProduct;
    historyLogs = logs;
  } catch (error) {
    console.error("[INVENTORY_DETAILS_PAGE_ERROR]", error);
  }

  if (!unit || !product) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Inventory
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Unit Not Found</h2>
          <p className="mt-1 text-sm">The requested inventory item could not be retrieved from the database.</p>
        </div>
      </div>
    );
  }

  const isStaff = session.role === "STAFF";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "RESERVED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "SOLD":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "IN_REPAIR":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "DEFECTIVE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Inventory
        </Link>
      </div>

      {/* Header Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">{unit.sku}</h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getStatusBadge(unit.status)}`}>
              {unit.status.replace("_", " ")}
            </span>
            {unit.deletedAt && (
              <span className="inline-flex rounded bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
                Deleted
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-zinc-400">
            Model: <span className="font-semibold text-white">{product.name}</span> (<span className="font-mono text-zinc-300">{product.sku}</span>)
          </p>
        </div>

        {/* Edit Action Button (hide for STAFF) */}
        {!isStaff && (
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/inventory/${unit.id}/edit`}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Edit Unit
            </Link>
          </div>
        )}
      </div>

      {/* Main detail columns layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns (Specs & pricing) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General specs card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Hardware & Accessories Specs
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Storage</span>
                <span className="text-zinc-200 mt-1 block font-medium">{unit.storage || "N/A"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Color</span>
                <span className="text-zinc-200 mt-1 block font-medium">{unit.color || "N/A"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Battery Health</span>
                <span className="text-zinc-200 mt-1 block font-semibold">{unit.batteryHealth !== null ? `${unit.batteryHealth}%` : "N/A"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Grade & Condition</span>
                <div className="mt-1 flex gap-1.5 items-center">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 font-bold uppercase text-[9px] text-zinc-400">
                    {unit.condition}
                  </span>
                  {unit.grade && (
                    <span className="rounded border border-indigo-500/20 bg-indigo-500/5 px-1.5 py-0.5 font-bold text-[9px] text-indigo-400">
                      G: {unit.grade.replace("_", "+")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Warranty</span>
                <span className="text-zinc-200 mt-1 block">{unit.warrantyInfo || "No warranty info"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Accessories Included</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${unit.hasBox ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-zinc-900 text-zinc-600 border border-zinc-900"}`}>Box</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${unit.hasCharger ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-zinc-900 text-zinc-600 border border-zinc-900"}`}>Charger</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${unit.hasEarphones ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-zinc-900 text-zinc-600 border border-zinc-900"}`}>Earphones</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${unit.hasOriginalAccessories ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-zinc-900 text-zinc-600 border border-zinc-900"}`}>Original Access.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing detail card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Financial Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Selling Price</span>
                <span className="text-white mt-1 block font-bold text-base">
                  {unit.sellingPrice !== null ? `$${unit.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold uppercase tracking-wider text-[10px]">Purchase Cost</span>
                <span className="text-zinc-200 mt-1 block font-mono font-semibold text-sm">
                  {isStaff ? (
                    <span className="text-zinc-500 italic">Restricted (Staff)</span>
                  ) : (
                    unit.purchasePrice !== null ? `$${unit.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "Not set"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Status lifecycle movement history */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Lifecycle History & Movements
            </h2>

            {historyLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No movements recorded for this phone unit.</p>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {historyLogs.map((log, logIdx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {logIdx !== historyLogs.length - 1 ? (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-800" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 ring-8 ring-zinc-950">
                              <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between gap-4 text-xs">
                            <div>
                              <p className="font-semibold text-zinc-200">
                                {log.movementType.replace("_", " ")}{" "}
                                {log.unitStatusBefore && (
                                  <span className="text-zinc-400 font-normal">
                                    from {log.unitStatusBefore} to {log.unitStatusAfter}
                                  </span>
                                )}
                              </p>
                              {log.notes && (
                                <p className="mt-1 text-zinc-500 italic">Reason: {log.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-zinc-500 whitespace-nowrap">
                              <span className="font-medium text-zinc-400">By {log.creator.name}</span>
                              <time className="block mt-0.5 text-[10px] text-zinc-500">
                                {new Date(log.createdAt).toLocaleString()}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right column (Actions panel & Administrative notes) */}
        <div className="space-y-6">
          {/* Admin notes */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block">Security Identifiers</span>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block">IMEI Code</span>
                <span className="font-mono text-zinc-200 font-semibold block mt-1">
                  {isStaff ? (
                    <span className="text-zinc-500 italic">Restricted (Staff)</span>
                  ) : (
                    unit.imei || "—"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action triggers (hide for STAFF) */}
          <InventoryActions
            id={unit.id}
            currentStatus={unit.status}
            isDeleted={!!unit.deletedAt}
            userRole={session.role}
          />

          {/* Administrative notes */}
          {unit.adminNotes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
              <h3 className="font-bold text-white text-sm">Administrative Comments</h3>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-900/30 border border-zinc-900 p-3 rounded-lg whitespace-pre-wrap">
                {unit.adminNotes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
