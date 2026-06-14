import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { brandRepo, categoryRepo } from "@/lib/repositories";
import ProductForm from "../product-form";

export const metadata: Metadata = {
  title: "Add Product - MobileX Admin",
  description: "Create a new product model in the MobileX catalog.",
};

export default async function AdminNewProductPage() {
  const session = await getSession();

  // Route Guard: enforce admin session
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    if (session.role === "STAFF") {
      redirect("/billing");
    } else {
      redirect("/login");
    }
  }

  // Fetch active brands and categories for form dropdown inputs
  const [brands, categories] = await Promise.all([
    brandRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    categoryRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Products
        </Link>
      </div>

      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Add Product</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Define a new model SKU, condition, prices, and specifications
        </p>
      </div>

      {/* Form Component */}
      <ProductForm
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
