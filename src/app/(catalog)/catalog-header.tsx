"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CatalogHeader({ shopName }: { shopName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      router.push(`/phones?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/phones");
    }
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-500/30 group-hover:bg-indigo-500 transition-colors">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-white">{shopName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 md:flex">
          <Link href="/phones" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Browse Phones
          </Link>
          <Link href="/phones?sort=newest" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            New Arrivals
          </Link>
          <Link href="/phones?condition=LIKE_NEW" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Like New
          </Link>
        </nav>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 max-w-xs items-center sm:flex"
        >
          <div className="relative w-full">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phones…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </form>

        {/* Admin link + mobile toggle */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Admin
          </Link>
          {/* Mobile hamburger */}
          <button
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search phones…"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </form>
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/phones" onClick={() => setMobileOpen(false)} className="text-zinc-300 hover:text-white">Browse Phones</Link>
            <Link href="/phones?sort=newest" onClick={() => setMobileOpen(false)} className="text-zinc-300 hover:text-white">New Arrivals</Link>
            <Link href="/phones?condition=LIKE_NEW" onClick={() => setMobileOpen(false)} className="text-zinc-300 hover:text-white">Like New</Link>
            <Link href="/admin" onClick={() => setMobileOpen(false)} className="text-zinc-500 hover:text-white">Admin Portal</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
