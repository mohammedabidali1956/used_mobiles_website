"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";

interface AdminHeaderProps {
  name: string;
  role: string;
}

export default function AdminHeader({ name, role }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        setLoggingOut(false);
      }
    } catch {
      setLoggingOut(false);
    }
  };

  // Determine badge colors based on role
  const getRoleBadgeClass = (userRole: string) => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950 px-6 py-4 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand / Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-6 w-2 rounded bg-indigo-500"></div>
            <span className="text-xl font-bold tracking-tight text-white">
              MobileX Admin
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {role !== "STAFF" && (
              <>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/products"
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Products
                </Link>
              </>
            )}
            <Link
              href="/admin/inventory"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Inventory
            </Link>
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-6">
          {/* User profile section */}
          <div className="flex items-center gap-3">
            {/* Initials Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="text-sm font-medium text-zinc-200">{name}</span>
              <span
                className={`inline-flex self-start rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${getRoleBadgeClass(
                  role
                )}`}
              >
                {role.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-zinc-800"></div>

          {/* Logout Button */}
          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </header>
  );
}
