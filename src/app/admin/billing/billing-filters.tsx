"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { listStaffMembersAction } from "@/app/billing/actions";

interface StaffOption {
  id: string;
  name: string;
  email: string;
}

interface BillingFiltersProps {
  userRole: string;
}

export default function BillingFilters({ userRole }: BillingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // Fetch staff members for selection dropdown if admin
  useEffect(() => {
    if (isAdmin) {
      listStaffMembersAction().then((res) => {
        if (res.success && res.staff) {
          setStaffList(res.staff);
        }
      });
    }
  }, [isAdmin]);

  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1"); // reset to page 1 on filter

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

  const q = searchParams.get("q") || "";
  const staffId = searchParams.get("staffId") || "";
  const rawFrom = searchParams.get("from") || "";
  const rawTo = searchParams.get("to") || "";

  // Convert raw ISO datetime search parameters to YYYY-MM-DD for date inputs
  const formatDateForInput = (isoString: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const fromDateVal = formatDateForInput(rawFrom);
  const toDateVal = formatDateForInput(rawTo);

  const handleDateChange = (key: "from" | "to", val: string) => {
    if (!val) {
      updateQuery({ [key]: null });
      return;
    }

    try {
      if (key === "from") {
        const iso = new Date(`${val}T00:00:00.000Z`).toISOString();
        updateQuery({ from: iso });
      } else {
        const iso = new Date(`${val}T23:59:59.999Z`).toISOString();
        updateQuery({ to: iso });
      }
    } catch {
      updateQuery({ [key]: null });
    }
  };

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-md">
      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search Input */}
        <div>
          <label htmlFor="bill-filter-q" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Search Invoices
          </label>
          <input
            id="bill-filter-q"
            type="text"
            placeholder="Bill #, Customer name or phone..."
            value={q}
            onChange={(e) => updateQuery({ q: e.target.value })}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* From Date */}
        <div>
          <label htmlFor="bill-filter-from" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Start Date
          </label>
          <input
            id="bill-filter-from"
            type="date"
            value={fromDateVal}
            onChange={(e) => handleDateChange("from", e.target.value)}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none text-zinc-300"
          />
        </div>

        {/* To Date */}
        <div>
          <label htmlFor="bill-filter-to" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            End Date
          </label>
          <input
            id="bill-filter-to"
            type="date"
            value={toDateVal}
            onChange={(e) => handleDateChange("to", e.target.value)}
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none text-zinc-300"
          />
        </div>

        {/* Staff Filter (Admins only) */}
        {isAdmin && (
          <div>
            <label htmlFor="bill-filter-staff" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Billed By Staff
            </label>
            <select
              id="bill-filter-staff"
              value={staffId}
              onChange={(e) => updateQuery({ staffId: e.target.value })}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white transition-colors focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
        )}
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
              Applying POS filters...
            </span>
          ) : (
            "Billing filters ready"
          )}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-zinc-800 px-3 py-1.5 font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
