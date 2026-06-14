import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PhoneUnitService } from "@/lib/services";
import InventoryForm from "../../inventory-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    try {
      const unit = await PhoneUnitService.getUnitDetails(session, id);
      return {
        title: `Edit Unit ${unit.sku} - MobileX Admin`,
      };
    } catch {}
  }

  return {
    title: "Edit Phone Unit - MobileX Admin",
  };
}

export default async function AdminEditInventoryPage({ params }: PageProps) {
  const session = await getSession();

  // Route Guard: enforce admin/super-admin sessions (STAFF is view-only)
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect("/admin/inventory");
  }

  const { id } = await params;
  let unit;

  try {
    unit = await PhoneUnitService.getUnitDetails(session, id);
  } catch (error) {
    console.error("[EDIT_INVENTORY_PAGE_ERROR]", error);
  }

  if (!unit) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Inventory
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Unit Not Found</h2>
          <p className="mt-1 text-sm">The phone unit you wish to edit could not be found or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/admin/inventory/${unit.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Unit Details
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Edit Phone Unit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update specs, accessories, condition, and details for unit <span className="font-mono text-white font-semibold">{unit.sku}</span>
        </p>
      </div>

      {/* Form component */}
      <InventoryForm initialValues={unit} isEdit={true} />
    </div>
  );
}
