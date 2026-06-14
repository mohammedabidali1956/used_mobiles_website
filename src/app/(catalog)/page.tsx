import type { Metadata } from "next";
import Link from "next/link";
import { productRepo, systemConfigRepo, brandRepo, categoryRepo } from "@/lib/repositories";
import { PUBLIC_VISIBILITY_FILTER } from "@/lib/repositories/product.repository";
import ProductCard from "@/components/catalog/product-card";
import { GENERAL_DEFAULTS, CATALOG_DEFAULTS } from "@/lib/validators/settings";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mobilex.com";
  return {
    alternates: {
      canonical: baseUrl,
    },
  };
}

async function getCatalogConfig() {
  try {
    const all = await systemConfigRepo.findAll();
    const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
    return {
      catalogEnabled: map["catalog.enabled"] !== "false",
      showPrices: map["catalog.showPrices"] !== "false",
      featuredCount: parseInt(map["catalog.featuredCount"] || CATALOG_DEFAULTS["catalog.featuredCount"], 10),
      shopName: map["shop.name"] || GENERAL_DEFAULTS["shop.name"],
      shopTagline: map["shop.tagline"] || GENERAL_DEFAULTS["shop.tagline"],
      shopWhatsapp: map["shop.whatsapp"] || "",
      shopPhone: map["shop.phone"] || "",
    };
  } catch {
    return {
      catalogEnabled: true,
      showPrices: true,
      featuredCount: 8,
      shopName: GENERAL_DEFAULTS["shop.name"],
      shopTagline: GENERAL_DEFAULTS["shop.tagline"],
      shopWhatsapp: "",
      shopPhone: "",
    };
  }
}

export default async function HomePage() {
  const config = await getCatalogConfig();

  if (!config.catalogEnabled) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 px-4 text-center">
        <svg className="h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h1 className="text-2xl font-bold text-white">We'll be back soon</h1>
        <p className="max-w-sm text-zinc-500">Our catalog is temporarily offline. Please check back later or contact us directly.</p>
        {(config.shopPhone || config.shopWhatsapp) && (
          <div className="flex gap-3 flex-wrap justify-center mt-2">
            {config.shopPhone && (
              <a href={`tel:${config.shopPhone}`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                Call Us
              </a>
            )}
            {config.shopWhatsapp && (
              <a href={`https://wa.me/${config.shopWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors">
                WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fetch featured, newest, brands, and categories in parallel
  const [featuredProducts, newestProducts, brands, categories, totalCount] = await Promise.all([
    productRepo.findPublicMany({
      where: { isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: config.featuredCount,
    }).catch(() => []),
    productRepo.findPublicMany({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 8,
    }).catch(() => []),
    brandRepo.findAllActive().catch(() => []),
    categoryRepo.findAllActive().catch(() => []),
    productRepo.countPublic().catch(() => 0),
  ]);

  return (
    <div className="flex flex-col">
      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                               */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            {totalCount > 0 ? `${totalCount} phones available` : "Quality used phones"}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {config.shopName}
          </h1>
          {config.shopTagline && (
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              {config.shopTagline}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/phones"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
            >
              Browse All Phones
            </Link>
            {config.shopWhatsapp && (
              <a
                href={`https://wa.me/${config.shopWhatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Contact via WhatsApp
              </a>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { label: "Phones", value: totalCount },
              { label: "Brands", value: brands.length },
              { label: "Categories", value: categories.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Categories strip                                                   */}
      {/* ----------------------------------------------------------------- */}
      {categories.length > 0 && (
        <section className="border-b border-zinc-900 bg-zinc-950 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <Link
                href="/phones"
                className="flex-shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-indigo-500 hover:text-white transition-colors"
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/phones?category=${cat.slug}`}
                  className="flex-shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-indigo-500 hover:text-white transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Featured products                                                  */}
      {/* ----------------------------------------------------------------- */}
      {featuredProducts.length > 0 && (
        <section className="py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Featured Phones</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Hand-picked models we recommend</p>
              </div>
              <Link href="/phones?sort=newest" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProducts.map((p, i) => (
                <ProductCard key={p.id} product={p as any} priority={i < 2} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Newest arrivals                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">New Arrivals</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Recently added to the catalog</p>
            </div>
            <Link href="/phones?sort=newest" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>
          {newestProducts.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 py-16 text-center">
              <p className="text-zinc-500 text-sm">No products available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {newestProducts.map((p, i) => (
                <ProductCard key={p.id} product={p as any} priority={i < 2 && featuredProducts.length === 0} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Brands                                                             */}
      {/* ----------------------------------------------------------------- */}
      {brands.length > 0 && (
        <section className="py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <h2 className="text-xl font-bold text-white">Shop by Brand</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/phones?brand=${brand.slug}`}
                  className="group flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-5 text-sm font-bold text-zinc-300 transition-all hover:border-indigo-500/40 hover:bg-zinc-900 hover:text-white"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CTA Banner                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-zinc-900 border border-indigo-500/20 p-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
            <h2 className="relative text-2xl font-extrabold text-white">Can't find what you're looking for?</h2>
            <p className="relative mt-2 text-sm text-zinc-400">Browse our full catalog or reach out and we'll help you find your perfect phone.</p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/phones"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Browse All Phones
              </Link>
              {config.shopWhatsapp && (
                <a
                  href={`https://wa.me/${config.shopWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
