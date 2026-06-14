import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import VisibilityToggle from "../visibility-toggle";
import DeleteButton from "../delete-button";

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
        title: `${product.name} - Product Details - MobileX Admin`,
      };
    } catch {}
  }
  
  return {
    title: "Product Details - MobileX Admin",
  };
}

export default async function AdminProductDetailPage({ params }: PageProps) {
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

  try {
    product = await ProductService.getProductDetailsForAdmin(session, id);
  } catch (error) {
    console.error("[PRODUCT_DETAILS_PAGE_ERROR]", error);
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
          <p className="mt-1 text-sm">The requested product does not exist or has been permanently removed.</p>
        </div>
      </div>
    );
  }

  const hasAdminPrivilege = session.role === "ADMIN" || session.role === "SUPER_ADMIN";

  // Map inventory status counts for summary cards
  const statusSummary = [
    { label: "Available for Sale", count: product.unitCountByStatus.AVAILABLE || 0, color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5" },
    { label: "Reserved", count: product.unitCountByStatus.RESERVED || 0, color: "text-amber-400 border-amber-500/10 bg-amber-500/5" },
    { label: "Sold", count: product.unitCountByStatus.SOLD || 0, color: "text-blue-400 border-blue-500/10 bg-blue-500/5" },
    { label: "In Repair", count: product.unitCountByStatus.IN_REPAIR || 0, color: "text-indigo-400 border-indigo-500/10 bg-indigo-500/5" },
    { label: "Defective", count: product.unitCountByStatus.DEFECTIVE || 0, color: "text-rose-400 border-rose-500/10 bg-rose-500/5" },
  ];

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

      {/* Header Panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{product.name}</h1>
            {product.deletedAt && (
              <span className="inline-flex rounded bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
                Deleted
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <div>
              SKU: <span className="font-mono text-zinc-300 font-semibold">{product.sku}</span>
            </div>
            <div className="text-zinc-600">•</div>
            <div>
              Slug: <span className="text-zinc-300 font-semibold">{product.slug}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <VisibilityToggle id={product.id} initialListed={product.isListed} disabled={!!product.deletedAt} />
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            Edit Product
          </Link>
          <DeleteButton id={product.id} isDeleted={!!product.deletedAt} canRestore={hasAdminPrivilege} redirectOnAction={true} />
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: specs & general */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Detail card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Specifications & Attributes
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-zinc-500 block">Brand</span>
                <span className="text-zinc-200 mt-1 block font-semibold">{product.brandName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Category</span>
                <span className="text-zinc-200 mt-1 block font-semibold">{product.categoryName}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Base Price</span>
                <span className="text-white mt-1 block font-bold text-sm">
                  ${product.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Compare-At Price</span>
                <span className="text-zinc-400 mt-1 block">
                  {product.compareAtPrice ? `$${product.compareAtPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Base Condition</span>
                <span className="mt-1 inline-flex rounded bg-zinc-800 px-2 py-0.5 font-semibold uppercase tracking-wider text-[10px] text-zinc-300">
                  {product.baseCondition.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Features</span>
                <div className="mt-1 flex gap-2">
                  {product.isUnitTracked ? (
                    <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400 border border-indigo-500/10">Unit Tracked</span>
                  ) : (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">Bulk Stock</span>
                  )}
                  {product.isFeatured && (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/10">Featured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Public Description */}
            {product.description && (
              <div className="pt-2">
                <span className="text-zinc-500 text-xs block">Public Description</span>
                <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>

          {/* Dynamic Specifications Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Technical Specifications
            </h2>

            {Object.keys(product.specifications).length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No technical specifications defined for this product.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-900">
                <table className="w-full text-left text-xs border-collapse">
                  <tbody>
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key} className="border-b border-zinc-900 last:border-b-0 hover:bg-zinc-900/20">
                        <td className="bg-zinc-900/40 px-4 py-3 font-semibold text-zinc-400 w-1/3 border-r border-zinc-900">
                          {key}
                        </td>
                        <td className="px-4 py-3 text-zinc-200">
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Internal administrative notes */}
          {product.internalNotes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
              <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
                Internal Notes
              </h2>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">
                {product.internalNotes}
              </p>
            </div>
          )}
        </div>

        {/* Right column: inventory status summaries */}
        <div className="space-y-6">
          {/* Inventory summary stats */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-900 pb-2">
              Inventory Summary
            </h2>

            {/* Total Stock Count */}
            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-900 p-4 rounded-lg">
              <div>
                <span className="text-zinc-500 text-xs font-medium">Total Quantity tracked</span>
                <span className="text-2xl font-bold text-white block mt-1">{product.stockQuantity}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-medium text-right block">Available Stock</span>
                <span className={`text-2xl font-bold block mt-1 text-right ${product.availableUnitCount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {product.availableUnitCount}
                </span>
              </div>
            </div>

            {/* Status breakdown grid */}
            <div className="space-y-3.5 pt-2">
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                Phone Unit Status Breakdown
              </span>

              <div className="space-y-2">
                {statusSummary.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-xs font-medium ${item.color}`}
                  >
                    <span>{item.label}</span>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity audit log notices */}
          <div className="rounded-xl border border-zinc-800/40 bg-zinc-950 p-6 text-xs text-zinc-400">
            <h3 className="font-semibold text-zinc-200">Catalog Audits</h3>
            <p className="mt-2 leading-relaxed">
              Every creation, details update, visibility toggle, and deletion event writes an audit trail entry. Check database logs to trace administrative mutations for product code <span className="font-mono text-zinc-300 font-semibold">{product.sku}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
