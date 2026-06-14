import type { Metadata } from "next";
import { getSession } from "@/lib/auth";

import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard - MobileX Admin",
  description: "MobileX administrator management workspace.",
};

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (session?.role === "STAFF") {
    redirect("/billing");
  }

  return (
    <div className="flex-1 flex flex-col space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, {session?.name}!
        </h1>
        <p className="mt-2 text-zinc-400">
          Here is a high-level summary of the store activity today.
        </p>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">Total Products</span>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
              Active
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white">124</span>
            <p className="mt-1 text-xs text-zinc-500">Across 6 active brands</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">Total Inventory</span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              In Stock
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white">482</span>
            <p className="mt-1 text-xs text-zinc-500">Physical phone units tracked</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-400">Daily Sales Revenue</span>
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Today
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white">$4,850.00</span>
            <p className="mt-1 text-xs text-zinc-500">12 invoices generated today</p>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-950 p-6">
        <h2 className="text-lg font-semibold text-zinc-200">System Activity Logs</h2>
        <p className="mt-2 text-sm text-zinc-400">
          The system audit logging is fully active. All actions taken by administrators,
          including product and inventory adjustments, are recorded securely in the database.
        </p>
      </div>
    </div>
  );
}
