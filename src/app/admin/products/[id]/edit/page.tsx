import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import { brandRepo, categoryRepo } from "@/lib/repositories";
import ProductForm from "../../product-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (session) {
    try {
      const product = await ProductService.getProductDetailsForAdmin(session, id);
      return {
        title: `Edit ${product.name} - MobileX Admin`,
      };
    } catch {}
  }

  return {
    title: "Edit Product - MobileX Admin",
  };
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const session = await getSession();

  // Route Guard: enforce admin session
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    if (session.role === "STAFF") {
      redirect("/admin/billing/new");
    } else {
      redirect("/login");
    }
  }

  const { id } = await params;
  let product;
  let brands: any[] = [];
  let categories: any[] = [];

  try {
    const [fetchedProduct, fetchedBrands, fetchedCategories] = await Promise.all([
      ProductService.getProductDetailsForAdmin(session, id),
      brandRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      categoryRepo.findManyAdmin({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    ]);

    product = fetchedProduct;
    brands = fetchedBrands;
    categories = fetchedCategories;
  } catch (error) {
    console.error("[EDIT_PRODUCT_PAGE_ERROR]", error);
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Products
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Product Not Found</h2>
          <p className="mt-1 text-sm">The product you want to edit does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/admin/products/${product.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Product Details
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Edit Product</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Update model configuration and internal specifications details
        </p>
      </div>

      {/* Product form */}
      <ProductForm
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialValues={product}
        isEdit={true}
      />
    </div>
  );
}
