import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import { brandRepo, categoryRepo } from "@/lib/repositories";
import ProductFilters from "./product-filters";
import VisibilityToggle from "./visibility-toggle";
import DeleteButton from "./delete-button";
import { zAdminProductsQuery } from "@/lib/validators/product";

export const metadata: Metadata = {
  title: "Products Management - MobileX Admin",
  description: "List and manage products in the MobileX administration console.",
};

interface SearchParams {
  page?: string;
  pageSize?: string;
  q?: string;
  isListed?: string;
  isDeleted?: string;
  hasZeroUnits?: string;
  brand?: string;
  category?: string;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  // Route Guard: enforce admin session
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    if (session.role === "STAFF") {
      redirect("/billing");
    } else {
      redirect("/login");
    }
  }

  // Await searchParams Promise (Next.js 15+ convention)
  const params = await searchParams;

  // Resolve search parameters
  const queryInput = {
    page: params.page || "1",
    pageSize: params.pageSize || "24",
    q: params.q || undefined,
    isListed: params.isListed,
    isDeleted: params.isDeleted ?? "false", // Default: active products
    hasZeroUnits: params.hasZeroUnits,
    brand: params.brand,
    category: params.category,
  };

  let listResult;
  let brands: any[] = [];
  let categories: any[] = [];

  try {
    // Run parallel service/repo lookups
    const [result, fetchedBrands, fetchedCategories] = await Promise.all([
      ProductService.listProductsForAdmin(session, queryInput),
      brandRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      categoryRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    ]);

    listResult = result;
    brands = fetchedBrands;
    categories = fetchedCategories;
  } catch (error) {
    console.error("[LIST_PRODUCTS_PAGE_ERROR]", error);
  }

  if (!listResult) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <h2 className="text-lg font-bold">Failed to Load Products</h2>
        <p className="mt-1 text-sm">An unexpected system error occurred while retrieving products.</p>
      </div>
    );
  }

  const { items, total, page, pageSize } = listResult;
  const totalPages = Math.ceil(total / pageSize);

  // Helper to build URL with paginated values
  const buildPageUrl = (pageNumber: number) => {
    const nextParams = new URLSearchParams(params as Record<string, string>);
    nextParams.set("page", String(pageNumber));
    return `/admin/products?${nextParams.toString()}`;
  };

  const hasAdminPrivilege = session.role === "ADMIN" || session.role === "SUPER_ADMIN";

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Products</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create, update, and manage catalog product models
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          Add Product
        </Link>
      </div>

      {/* Filter component */}
      <ProductFilters
        brands={brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />

      {/* Table grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-zinc-300">No Products Found</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                No products match the selected search text or filter options. Clear your filters to try again.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">Brand / Category</th>
                  <th className="px-6 py-4 text-right">Base Price</th>
                  <th className="px-6 py-4">Base Cond.</th>
                  <th className="px-6 py-4">Units Stock</th>
                  <th className="px-6 py-4">Listed</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-zinc-900/30 transition-colors ${
                      p.deletedAt ? "opacity-60 bg-red-950/5" : ""
                    }`}
                  >
                    {/* Name & SKU & Slug */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-sm">{p.name}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        SKU: <span className="font-mono text-zinc-400">{p.sku}</span>
                      </div>
                    </td>

                    {/* Brand & Category */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-300">{p.brandName}</div>
                      <div className="mt-0.5 text-zinc-500">{p.categoryName}</div>
                    </td>

                    {/* Base Price */}
                    <td className="px-6 py-4 text-right font-medium text-white">
                      ${p.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Condition */}
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-md bg-zinc-800 px-2 py-0.5 font-semibold text-[10px] uppercase text-zinc-300">
                        {p.baseCondition.replace("_", " ")}
                      </span>
                    </td>

                    {/* Stock Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${p.availableUnitCount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.availableUnitCount} Avail
                        </span>
                        {p.isUnitTracked ? (
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            {p.stockQuantity} Total Units
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 mt-0.5">Untracked</span>
                        )}
                      </div>
                    </td>

                    {/* Listed toggle */}
                    <td className="px-6 py-4">
                      <VisibilityToggle id={p.id} initialListed={p.isListed} disabled={!!p.deletedAt} />
                    </td>

                    {/* Deleted badge */}
                    <td className="px-6 py-4">
                      {p.deletedAt ? (
                        <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20">
                          Deleted
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Edit
                        </Link>
                        <DeleteButton id={p.id} isDeleted={!!p.deletedAt} canRestore={hasAdminPrivilege} />
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
            <span className="font-semibold text-zinc-300">{totalPages}</span> ({total} products total)
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
