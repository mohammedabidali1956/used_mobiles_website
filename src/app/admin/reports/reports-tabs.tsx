"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

interface ReportsTabsProps {
  userRole: Role;
}

export default function ReportsTabs({ userRole }: ReportsTabsProps) {
  const pathname = usePathname();
  const isAdmin = hasRole(userRole, "ADMIN");

  // STAFF role can only view the overview dashboard, so don't show tabs
  if (!isAdmin) {
    return null;
  }

  const tabs = [
    { name: "Overview Dashboard", href: "/admin/reports" },
    { name: "Sales Reports", href: "/admin/reports/sales" },
    { name: "Inventory Reports", href: "/admin/reports/inventory" },
    { name: "Product Performance", href: "/admin/reports/products" },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-px">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-xs font-semibold border-b-2 -mb-px transition-all ${
              isActive
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
