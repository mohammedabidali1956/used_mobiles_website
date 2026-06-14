import Link from "next/link";
import ProductImage from "./product-image";
import type { PublicProductSummary } from "@/lib/types/domain.types";

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

interface ProductCardProps {
  product: PublicProductSummary;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const conditionLabel = CONDITION_LABELS[product.baseCondition] ?? product.baseCondition;
  const conditionColor = CONDITION_COLORS[product.baseCondition] ?? "bg-zinc-800 text-zinc-400";

  const hasDiscount =
    product.compareAtPrice !== null && product.compareAtPrice > product.basePrice;

  const discountPct = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.basePrice) / product.compareAtPrice!) * 100)
    : 0;

  const stockLabel = product.isUnitTracked
    ? product.availableUnitCount > 0
      ? `${product.availableUnitCount} in stock`
      : "Out of stock"
    : "In stock";

  const outOfStock = product.isUnitTracked && product.availableUnitCount === 0;

  return (
    <Link
      href={`/phones/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-zinc-900">
        <ProductImage
          src={product.primaryImageUrl}
          alt={product.name}
          priority={priority}
          className="h-full w-full"
        />
        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute left-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            -{discountPct}%
          </div>
        )}
        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-semibold text-zinc-400">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        {/* Brand & Category */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            {product.brandName}
          </span>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${conditionColor}`}
          >
            {conditionLabel}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold leading-snug text-zinc-100 group-hover:text-white transition-colors line-clamp-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-base font-extrabold text-white">
            ${product.basePrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
          {hasDiscount && (
            <span className="text-xs text-zinc-500 line-through">
              ${product.compareAtPrice!.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>

        {/* Stock */}
        <div className={`text-[10px] font-semibold ${outOfStock ? "text-rose-500" : "text-zinc-500"}`}>
          {stockLabel}
        </div>
      </div>
    </Link>
  );
}
