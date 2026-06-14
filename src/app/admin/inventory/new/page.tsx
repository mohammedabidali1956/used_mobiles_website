import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import InventoryForm from "../inventory-form";

export const metadata: Metadata = {
  title: "Add Phone Unit - MobileX Admin",
  description: "Register a physical phone unit in MobileX stock inventory.",
};

export default async function AdminNewInventoryPage() {
  const session = await getSession();

  // Route Guard: enforce admin/super-admin sessions (STAFF is view-only)
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect("/admin/inventory");
  }

  // Fetch list of active product models to link the new unit
  const products = await ProductService.listActiveProductOptions(session);

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Inventory
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Add Phone Unit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Register a physical inventory unit under an active product model
        </p>
      </div>

      {/* Form component */}
      <InventoryForm products={products} />
    </div>
  );
}
