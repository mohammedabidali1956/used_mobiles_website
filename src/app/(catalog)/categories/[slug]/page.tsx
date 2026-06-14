import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryRepo } from "@/lib/repositories";
import { ProductService } from "@/lib/services";
import ProductCard from "@/components/catalog/product-card";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string; condition?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryRepo.findBySlug(slug);
  if (!category || !category.isActive || category.deletedAt) {
    return { title: "Category Not Found" };
  }
  return {
    title: `${category.name}`,
    description: category.description || `Browse our collection of used and refurbished ${category.name}.`,
  };
}

export default async function CategoryCatalogPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sparams = await searchParams;

  const category = await categoryRepo.findBySlug(slug);
  if (!category || !category.isActive || category.deletedAt) {
    notFound();
  }

  const result = await ProductService.listProductsForPublic({
    category: slug,
    page: sparams.page || "1",
    sort: sparams.sort as any,
    condition: sparams.condition as any,
  }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 }));

  const totalPages = Math.ceil(result.total / result.pageSize);
  const page = result.page;

  const buildPageUrl = (p: number) => {
    const next = new URLSearchParams(sparams as Record<string, string>);
    next.set("page", String(p));
    return `/categories/${slug}?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* breadcrumb */}
      <div className="mb-4 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/phones" className="hover:text-zinc-300">Phones</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{category.name}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl">{category.description}</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Showing {result.total} available devices.
        </p>
      </div>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 py-20 text-center px-4">
          <svg className="h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-lg font-bold text-zinc-300">No phones found</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-600">
            We don't have any available items in "{category.name}" right now. Please check back later or browse other categories.
          </p>
          <Link
            href="/phones"
            className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Browse All Phones
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs border-t border-zinc-800 pt-6">
              <span className="text-zinc-500">
                Page <span className="font-semibold text-zinc-300">{page}</span> of{" "}
                <span className="font-semibold text-zinc-300">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Link
                  href={buildPageUrl(page - 1)}
                  className={`rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
                >
                  ← Previous
                </Link>
                <Link
                  href={buildPageUrl(page + 1)}
                  className={`rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
                >
                  Next →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
