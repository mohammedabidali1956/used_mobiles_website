"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface InventoryFiltersProps {
  products: ProductOption[];
}

export default function InventoryFilters({ products }: InventoryFiltersProps) {
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
  const status = searchParams.get("status") || "";
  const condition = searchParams.get("condition") || "";
  const minBatteryHealth = searchParams.get("minBatteryHealth") || "";
  const productId = searchParams.get("productId") || "";
  const isDeleted = searchParams.get("isDeleted") || "false"; // Default to show active

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-md">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {/* Search Input */}
        <div>
          <label htmlFor="inv-filter-q" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Search
          </label>
          <input
            id="inv-filter-q"
            type="text"
            placeholder="Unit SKU or IMEI..."
            value={q}
            onChange={(e) => updateQuery({ q: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Product Model Filter */}
        <div>
          <label htmlFor="inv-filter-product" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Product Model
          </label>
          <select
            id="inv-filter-product"
            value={productId}
            onChange={(e) => updateQuery({ productId: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="inv-filter-status" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Status
          </label>
          <select
            id="inv-filter-status"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
            <option value="IN_REPAIR">In Repair</option>
            <option value="DEFECTIVE">Defective</option>
          </select>
        </div>

        {/* Condition Filter */}
        <div>
          <label htmlFor="inv-filter-condition" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Condition
          </label>
          <select
            id="inv-filter-condition"
            value={condition}
            onChange={(e) => updateQuery({ condition: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Conditions</option>
            <option value="NEW">New (Factory Sealed)</option>
            <option value="LIKE_NEW">Like New</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
          </select>
        </div>

        {/* Battery Health Filter */}
        <div>
          <label htmlFor="inv-filter-battery" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Min Battery Health
          </label>
          <select
            id="inv-filter-battery"
            value={minBatteryHealth}
            onChange={(e) => updateQuery({ minBatteryHealth: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Battery Healths</option>
            <option value="90">90% or higher</option>
            <option value="80">80% or higher</option>
            <option value="70">70% or higher</option>
          </select>
        </div>
      </form>

      {/* Footer controls row */}
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
            "Inventory filters ready"
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Deletion filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider">Status:</span>
            <select
              id="inv-filter-deleted"
              value={isDeleted}
              onChange={(e) => updateQuery({ isDeleted: e.target.value })}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none transition-colors focus:border-indigo-500"
            >
              <option value="false">Active Units</option>
              <option value="true">Soft-Deleted Units</option>
              <option value="">All Units (incl. Deleted)</option>
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
