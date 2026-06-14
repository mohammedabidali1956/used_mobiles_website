"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface FilterSidebarProps {
  brands: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
}

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name A-Z" },
];

export default function FilterSidebar({ brands, categories }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const current = {
    q: searchParams.get("q") || "",
    brand: searchParams.get("brand") || "",
    category: searchParams.get("category") || "",
    condition: searchParams.get("condition") || "",
    sort: searchParams.get("sort") || "newest",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  };

  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/phones?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/phones");
  };

  const hasFilters =
    current.brand || current.category || current.condition || current.minPrice || current.maxPrice;

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Sort By
        </label>
        <select
          value={current.sort}
          onChange={(e) => applyFilter("sort", e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Condition
        </label>
        <div className="space-y-1.5">
          <button
            onClick={() => applyFilter("condition", "")}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${!current.condition ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
          >
            Any Condition
          </button>
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => applyFilter("condition", c.value === current.condition ? "" : c.value)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${current.condition === c.value ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Price Range
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={current.minPrice}
            onBlur={(e) => applyFilter("minPrice", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter("minPrice", (e.target as HTMLInputElement).value)}
            className="w-1/2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={current.maxPrice}
            onBlur={(e) => applyFilter("maxPrice", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter("maxPrice", (e.target as HTMLInputElement).value)}
            className="w-1/2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Brand</label>
          <div className="space-y-1.5">
            <button
              onClick={() => applyFilter("brand", "")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${!current.brand ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
            >
              All Brands
            </button>
            {brands.map((b) => (
              <button
                key={b.slug}
                onClick={() => applyFilter("brand", b.slug === current.brand ? "" : b.slug)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${current.brand === b.slug ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Category</label>
          <div className="space-y-1.5">
            <button
              onClick={() => applyFilter("category", "")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${!current.category ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => applyFilter("category", c.slug === current.category ? "" : c.slug)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${current.category === c.slug ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="mb-4 lg:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {open ? "Hide Filters" : "Show Filters"}
          {hasFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
              !
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5 lg:hidden">
          <SidebarContent />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 lg:block">
        <div className="sticky top-24 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
