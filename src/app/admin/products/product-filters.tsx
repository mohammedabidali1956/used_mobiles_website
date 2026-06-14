"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Option {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  brands: Option[];
  categories: Option[];
}

export default function ProductFilters({ brands, categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Helper to update query parameters in URL
  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset to page 1 on filter change
    params.set("page", "1");

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Get current filter states from URL search params
  const q = searchParams.get("q") || "";
  const isListed = searchParams.get("isListed") || "";
  const isDeleted = searchParams.get("isDeleted") || "false"; // Default to show active
  const hasZeroUnits = searchParams.get("hasZeroUnits") || "";
  const selectedBrand = searchParams.get("brand") || "";
  const selectedCategory = searchParams.get("category") || "";

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname); // Clears all search parameters
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-md">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        {/* Text Search */}
        <div className="lg:col-span-2">
          <label htmlFor="filter-q" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Search
          </label>
          <input
            id="filter-q"
            type="text"
            placeholder="Search name, SKU, brand, category..."
            value={q}
            onChange={(e) => updateQuery({ q: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Brand Filter */}
        <div>
          <label htmlFor="filter-brand" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Brand
          </label>
          <select
            id="filter-brand"
            value={selectedBrand}
            onChange={(e) => updateQuery({ brand: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="filter-category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Category
          </label>
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={(e) => updateQuery({ category: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Listed Status */}
        <div>
          <label htmlFor="filter-listed" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Visibility
          </label>
          <select
            id="filter-listed"
            value={isListed}
            onChange={(e) => updateQuery({ isListed: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Visibilities</option>
            <option value="true">Listed Only</option>
            <option value="false">Unlisted Only</option>
          </select>
        </div>

        {/* Stock Status */}
        <div>
          <label htmlFor="filter-stock" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Stock Level
          </label>
          <select
            id="filter-stock"
            value={hasZeroUnits}
            onChange={(e) => updateQuery({ hasZeroUnits: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Stock Levels</option>
            <option value="false">In Stock Only</option>
            <option value="true">Out of Stock Only</option>
          </select>
        </div>
      </form>

      {/* Row for reset buttons and loaders */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs">
        <div className="text-zinc-500 font-medium">
          {isPending ? (
            <span className="flex items-center gap-1.5 text-indigo-400">
              <svg className="h-3 w-3 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Applying filters...
            </span>
          ) : (
            "Filters up to date"
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Deletion state toggler */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider">Status:</span>
            <select
              id="filter-deleted"
              value={isDeleted}
              onChange={(e) => updateQuery({ isDeleted: e.target.value })}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none transition-colors focus:border-indigo-500"
            >
              <option value="false">Active Products</option>
              <option value="true">Soft-Deleted Products</option>
              <option value="">All Products (incl. Deleted)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="rounded bg-zinc-800 px-3 py-1 font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
