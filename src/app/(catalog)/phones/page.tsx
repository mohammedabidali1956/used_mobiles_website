import type { Metadata } from "next";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import { brandRepo, categoryRepo } from "@/lib/repositories";
import ProductCard from "@/components/catalog/product-card";
import FilterSidebar from "./filter-sidebar";

export const metadata: Metadata = {
  title: "Browse Phones",
  description: "Search and filter our full range of used and refurbished smartphones.",
};

interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  storage?: string | string[];
  sort?: string;
  page?: string;
}

export default async function BrowsePhonesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [result, brands, categories] = await Promise.all([
    ProductService.listProductsForPublic({
      q: params.q,
      category: params.category,
      brand: params.brand,
      condition: params.condition as any,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      storage: params.storage,
      sort: params.sort as any,
      page: params.page || "1",
    }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 })),
    brandRepo.findAllActive().catch(() => []),
    categoryRepo.findAllActive().catch(() => []),
  ]);

  const totalPages = Math.ceil(result.total / result.pageSize);
  const page = result.page;

  const buildPageUrl = (p: number) => {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(p));
    return `/phones?${next.toString()}`;
  };

  const activeFiltersCount = [
    params.brand,
    params.category,
    params.condition,
    params.minPrice,
    params.maxPrice,
  ].filter(Boolean).length;

  const searchQuery = params.q || "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">
          {searchQuery
            ? `Results for "${searchQuery}"`
            : params.brand
            ? `${brands.find((b) => b.slug === params.brand)?.name || params.brand} Phones`
            : params.category
            ? `${categories.find((c) => c.slug === params.category)?.name || params.category}`
            : "Browse All Phones"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {result.total === 0
            ? "No phones match your criteria"
            : `${result.total} phone${result.total !== 1 ? "s" : ""} found`}
          {activeFiltersCount > 0 && (
            <span className="ml-2 text-indigo-400">
              ({activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""} active)
            </span>
          )}
        </p>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar
          brands={brands.map((b) => ({ name: b.name, slug: b.slug }))}
          categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
        />

        {/* Products */}
        <div className="flex-1 min-w-0">
          {result.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 py-20 text-center px-4">
              <svg className="h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="mt-4 text-lg font-bold text-zinc-300">No phones found</h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-600">
                Try adjusting your search or filters, or browse our full catalog.
              </p>
              <Link
                href="/phones"
                className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Clear Filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 3} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs">
                  <span className="text-zinc-500">
                    Page <span className="font-semibold text-zinc-300">{page}</span> of{" "}
                    <span className="font-semibold text-zinc-300">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={buildPageUrl(page - 1)}
                      className={`rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
                    >
                      ← Previous
                    </Link>
                    <Link
                      href={buildPageUrl(page + 1)}
                      className={`rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
                    >
                      Next →
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
