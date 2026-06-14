import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PhoneUnitService, ProductService } from "@/lib/services";
import InventoryFilters from "./inventory-filters";
import { zListUnitsAdminQuery } from "@/lib/validators/phoneUnit";

export const metadata: Metadata = {
  title: "Inventory Management - MobileX Admin",
  description: "Browse, filter, and manage physical phone units inventory.",
};

interface SearchParams {
  page?: string;
  pageSize?: string;
  q?: string;
  status?: string;
  productId?: string;
  grade?: string;
  storage?: string;
  isDeleted?: string;
  condition?: string;
  minBatteryHealth?: string;
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  // Resolve search parameters
  const params = await searchParams;

  const queryInput = {
    page: params.page || "1",
    pageSize: params.pageSize || "24",
    q: params.q || undefined,
    status: params.status || undefined,
    productId: params.productId || undefined,
    grade: params.grade || undefined,
    storage: params.storage || undefined,
    isDeleted: params.isDeleted ?? "false", // Default: active units only
    condition: params.condition || undefined,
    minBatteryHealth: params.minBatteryHealth || undefined,
  };

  let listResult;
  let allProducts: { id: string; name: string; sku: string }[] = [];
  let itemsWithProduct: any[] = [];

  try {
    // Validate schema parameters
    const validated = zListUnitsAdminQuery.parse(queryInput);

    // Run parallel service/repo lookups
    const [result, fetchedProducts] = await Promise.all([
      PhoneUnitService.listUnits(session, queryInput as any),
      ProductService.listActiveProductOptions(session),
    ]);

    listResult = result;
    allProducts = fetchedProducts;

    if (result.items.length > 0) {
      // Collect unique product IDs from results to map their names
      const resultProductIds = Array.from(new Set(result.items.map((item) => item.productId)));
      const productsMapQuery = await ProductService.getProductSummariesByIds(session, resultProductIds);
      const productMap = new Map(productsMapQuery.map((p) => [p.id, p]));

      itemsWithProduct = result.items.map((item) => ({
        ...item,
        product: productMap.get(item.productId) || { name: "Unknown Model", sku: "" },
      }));
    }
  } catch (error) {
    console.error("[INVENTORY_LIST_PAGE_ERROR]", error);
  }

  if (!listResult) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Inventory</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while retrieving inventory records.</p>
      </div>
    );
  }

  const { total, page, pageSize } = listResult;
  const totalPages = Math.ceil(total / pageSize);

  const buildPageUrl = (pageNumber: number) => {
    const nextParams = new URLSearchParams(params as Record<string, string>);
    nextParams.set("page", String(pageNumber));
    return `/admin/inventory?${nextParams.toString()}`;
  };

  const isStaff = session.role === "STAFF";

  // Helpers for Status Badges
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
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Browse and track physical phone units in active stock
          </p>
        </div>

        {/* Hide "Add Unit" for view-only STAFF */}
        {!isStaff && (
          <Link
            href="/admin/inventory/new"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Add Phone Unit
          </Link>
        )}
      </div>

      {/* Filter component */}
      <InventoryFilters products={allProducts} />

      {/* Table grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          {itemsWithProduct.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-zinc-300">No Inventory Found</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                No physical phone units matched the current search query or active filter settings.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Unit Code (SKU)</th>
                  <th className="px-6 py-4">Product Model</th>
                  <th className="px-6 py-4">Hardware Specs</th>
                  <th className="px-6 py-4 text-center">Battery</th>
                  <th className="px-6 py-4">Grade & Condition</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Deleted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {itemsWithProduct.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-900/30 transition-colors ${
                      item.deletedAt ? "opacity-60 bg-red-950/5" : ""
                    }`}
                  >
                    {/* Unit SKU */}
                    <td className="px-6 py-4 font-mono font-semibold text-white">
                      {item.sku}
                    </td>

                    {/* Product Name */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">{item.product.name}</div>
                      <div className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                        Model: {item.product.sku}
                      </div>
                    </td>

                    {/* Hardware Specs */}
                    <td className="px-6 py-4">
                      <div className="text-zinc-300 font-medium">
                        {item.storage || "N/A"}
                      </div>
                      <div className="mt-0.5 text-zinc-500">
                        {item.color || "N/A"}
                      </div>
                    </td>

                    {/* Battery health */}
                    <td className="px-6 py-4 text-center font-semibold text-zinc-300">
                      {item.batteryHealth !== null ? `${item.batteryHealth}%` : "—"}
                    </td>

                    {/* Condition & Grade */}
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 items-center">
                        <span className="inline-flex rounded bg-zinc-800 px-2 py-0.5 font-bold uppercase text-[9px] text-zinc-400">
                          {item.condition}
                        </span>
                        {item.grade && (
                          <span className="inline-flex rounded border border-indigo-500/20 bg-indigo-500/5 px-1.5 py-0.5 font-bold text-[9px] text-indigo-400">
                            G: {item.grade.replace("_", "+")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {item.sellingPrice !== null ? (
                        `$${item.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 font-bold tracking-wide text-[10px] uppercase ${getStatusBadge(item.status)}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Deleted */}
                    <td className="px-6 py-4">
                      {item.deletedAt ? (
                        <span className="inline-flex rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20">
                          Deleted
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right font-semibold text-indigo-400">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/inventory/${item.id}`} className="hover:text-indigo-300 transition-colors">
                          View
                        </Link>
                        {!isStaff && (
                          <Link href={`/admin/inventory/${item.id}/edit`} className="text-zinc-400 hover:text-zinc-200 transition-colors">
                            Edit
                          </Link>
                        )}
                      </div>
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
            <span className="font-semibold text-zinc-300">{totalPages}</span> ({total} units total)
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
