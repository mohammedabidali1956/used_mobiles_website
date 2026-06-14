import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductService } from "@/lib/services";
import { systemConfigRepo } from "@/lib/repositories";
import { GENERAL_DEFAULTS, CATALOG_DEFAULTS } from "@/lib/validators/settings";
import ProductCard from "@/components/catalog/product-card";
import ImageGallery from "./image-gallery";
import type { PublicPhoneUnitSummary } from "@/lib/types/domain.types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
};

const CONDITION_COLORS: Record<string, string> = {
  NEW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LIKE_NEW: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  GOOD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FAIR: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const GRADE_LABELS: Record<string, string> = {
  S: "Grade S (Flawless)",
  A_PLUS: "Grade A+ (Excellent)",
  A: "Grade A (Very Good)",
  B: "Grade B (Good)",
  C: "Grade C (Fair)",
};

async function getCatalogConfig() {
  try {
    const all = await systemConfigRepo.findAll();
    const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
    return {
      showPrices: map["catalog.showPrices"] !== "false",
      shopWhatsapp: map["shop.whatsapp"] || "",
    };
  } catch {
    return {
      showPrices: true,
      shopWhatsapp: "",
    };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mobilex.com";
  try {
    const product = await ProductService.getProductDetailsForPublic(slug);
    const title = `${product.name} — Used & Refurbished`;
    const description = product.description 
      ? product.description.substring(0, 160)
      : `Buy a quality refurbished ${product.name} at great prices. ${product.availableUnitCount} physical units currently in stock.`;
    const imageUrl = product.primaryImageUrl || `${baseUrl}/og-image.png`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/phones/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/phones/${slug}`,
        type: "website",
        images: [
          {
            url: imageUrl,
            alt: product.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "Product Details",
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await ProductService.getProductDetailsForPublic(slug);
  } catch (error) {
    notFound();
  }

  const config = await getCatalogConfig();

  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.basePrice;

  const discountPct = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.basePrice) / product.compareAtPrice!) * 100)
    : 0;

  const outOfStock = product.isUnitTracked && product.availableUnitCount === 0;

  // Prefilled WhatsApp message for general product inquiry
  const getProductWhatsappUrl = () => {
    const priceText = config.showPrices
      ? ` priced at $${product.basePrice.toLocaleString("en-US")}`
      : "";
    const msg = `Hi! I'm interested in the ${product.name}${priceText} listed on your website. Is it still available?`;
    return `https://wa.me/${config.shopWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  };

  // Prefilled WhatsApp message for specific unit inquiry
  const getUnitWhatsappUrl = (unit: PublicPhoneUnitSummary) => {
    const specs = [
      unit.storage,
      unit.color,
      unit.grade ? GRADE_LABELS[unit.grade] || unit.grade : null,
    ].filter(Boolean).join(", ");
    
    const price = unit.sellingPrice || product.basePrice;
    const priceText = config.showPrices
      ? ` for $${price.toLocaleString("en-US")}`
      : "";

    const msg = `Hi! I'm interested in the ${product.name} (Ref: ${unit.sku}, ${specs})${priceText} listed on your website. Is this unit still available?`;
    return `https://wa.me/${config.shopWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mobilex.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.primaryImageUrl || `${baseUrl}/og-image.png`,
    "description": product.description || `Buy quality used and refurbished ${product.name}.`,
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brandName,
    },
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/phones/${product.slug}`,
      "priceCurrency": "USD",
      "price": product.basePrice,
      "itemCondition": product.baseCondition === "NEW"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
      "availability": product.availableUnitCount > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="mb-6 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/phones" className="hover:text-zinc-300">Phones</Link>
        <span className="mx-2">/</span>
        <Link href={`/phones?brand=${product.brandSlug}`} className="hover:text-zinc-300">{product.brandName}</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{product.name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Gallery Column */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <ImageGallery images={product.images as any} productName={product.name} />
        </div>

        {/* Info Column */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href={`/phones?brand=${product.brandSlug}`}
                className="text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {product.brandName}
              </Link>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  CONDITION_COLORS[product.baseCondition] ?? "bg-zinc-800 text-zinc-400"
                }`}
              >
                {CONDITION_LABELS[product.baseCondition] ?? product.baseCondition}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-white leading-tight">{product.name}</h1>
          </div>

          {/* Pricing & Stock */}
          <div className="flex flex-wrap items-baseline gap-4 border-t border-zinc-900 pt-4">
            {config.showPrices && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  ${product.basePrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-zinc-500 line-through">
                      ${product.compareAtPrice!.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </span>
                    <span className="rounded bg-rose-600/10 px-1.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/10">
                      Save {discountPct}%
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${outOfStock ? "bg-rose-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <span className={outOfStock ? "text-rose-400" : "text-emerald-400"}>
                {product.isUnitTracked
                  ? product.availableUnitCount > 0
                    ? `${product.availableUnitCount} in stock`
                    : "Out of Stock"
                  : "In Stock"}
              </span>
            </div>
          </div>

          {/* General WhatsApp CTA */}
          {config.shopWhatsapp && !outOfStock && (
            <div>
              <a
                href={getProductWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.724-1.466L0 24zm5.835-2.298c1.614.958 3.502 1.463 5.422 1.464 5.922 0 10.743-4.82 10.746-10.743.002-2.87-1.111-5.569-3.136-7.594C16.897 2.802 14.2 1.687 11.328 1.687c-5.925 0-10.746 4.821-10.749 10.746-.001 1.986.518 3.927 1.503 5.642l-1.013 3.7 3.791-.994zM16.518 14c-.267-.134-1.58-.78-1.824-.869-.244-.088-.423-.133-.6.134-.179.266-.69.869-.846 1.046-.157.177-.313.2-.58.066-.268-.134-1.13-.417-2.153-1.329-.796-.71-1.332-1.588-1.488-1.854-.157-.267-.017-.411.117-.544.12-.119.268-.312.4-.467.135-.156.179-.267.268-.445.089-.178.045-.333-.022-.467-.067-.134-.6-1.445-.823-1.979-.217-.52-.456-.449-.6-.456-.135-.007-.29-.008-.445-.008-.156 0-.411.059-.624.29-.212.231-.812.793-.812 1.932 0 1.139.828 2.241.943 2.397.115.156 1.63 2.49 3.947 3.491.551.238.981.38 1.316.486.554.175 1.058.15 1.457.09.444-.066 1.331-.544 1.517-1.066.187-.522.187-.97.13-.134l-.248-.12z" />
                </svg>
                Order via WhatsApp
              </a>
            </div>
          )}

          {/* Description */}
          <div className="space-y-3 border-t border-zinc-900 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Description</h3>
            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description || "No description available."}
            </div>
          </div>

          {/* Specifications */}
          {Object.keys(product.specifications).length > 0 && (
            <div className="space-y-3 border-t border-zinc-900 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">Specifications</h3>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-xs">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <span className="font-semibold text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <p className="font-bold text-zinc-200">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Physical Units Section */}
      {product.isUnitTracked && product.units.length > 0 && (
        <section className="mt-16 border-t border-zinc-900 pt-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Available Stock Units</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Select and inquire about a specific physical phone listed below.
            </p>
          </div>

          <div className="grid gap-4">
            {product.units.map((unit) => (
              <div key={unit.id} className="rounded-xl border border-zinc-850 bg-zinc-950 p-4 transition-all hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      {unit.storage && (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-300 border border-zinc-800">
                          {unit.storage}
                        </span>
                      )}
                      {unit.color && (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-300 border border-zinc-800">
                          {unit.color}
                        </span>
                      )}
                      {unit.grade && (
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                          {GRADE_LABELS[unit.grade] || unit.grade}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-zinc-600">
                        SKU: {unit.sku}
                      </span>
                    </div>

                    {/* Specs detail info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {unit.batteryHealth && (
                        <span>Battery Health: <strong className="text-zinc-300">{unit.batteryHealth}%</strong></span>
                      )}
                      {unit.warrantyInfo && (
                        <span>Warranty: <strong className="text-zinc-300">{unit.warrantyInfo}</strong></span>
                      )}
                    </div>

                    {/* Accessories */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {unit.hasBox && (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-zinc-800">
                          ✓ Box Included
                        </span>
                      )}
                      {unit.hasCharger && (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-zinc-800">
                          ✓ Charger Included
                        </span>
                      )}
                      {unit.hasEarphones && (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400 border border-zinc-800">
                          ✓ Earphones Included
                        </span>
                      )}
                      {!unit.hasBox && !unit.hasCharger && !unit.hasEarphones && (
                        <span className="text-[9px] text-zinc-600 italic">Device only (no accessories)</span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t border-zinc-900 pt-3 sm:border-t-0 sm:pt-0">
                    {config.showPrices && (
                      <div className="text-lg font-extrabold text-white">
                        ${(unit.sellingPrice || product.basePrice).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </div>
                    )}
                    {config.shopWhatsapp && (
                      <a
                        href={getUnitWhatsappUrl(unit)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/30 px-3.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-all"
                      >
                        Inquire Unit
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Products Section */}
      {product.relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-zinc-900 pt-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Related Devices</h2>
            <p className="text-xs text-zinc-500 mt-1">Other options you might like in this category.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {product.relatedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p as any} priority={i < 2} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
