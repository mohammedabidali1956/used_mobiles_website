/**
 * ProductImage — smart image component with automatic placeholder fallback.
 *
 * Design contract:
 *  - When `src` is a real URL (uploaded via Cloudinary), it renders an <Image>.
 *  - When `src` is null / undefined / empty, it renders the branded placeholder.
 *  - The placeholder is a styled div, so it NEVER makes an external HTTP request,
 *    keeping the catalog functional even with zero uploaded images.
 *
 * Future Cloudinary migration:
 *  - No changes needed here; just start passing real Cloudinary URLs as `src`.
 */

import Image from "next/image";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  /** Tailwind fill-parent class applied to the wrapper */
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/** Inline placeholder — no external request, no broken-image flash. */
function Placeholder({ alt }: { alt: string }) {
  return (
    <div
      aria-label={alt}
      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 select-none"
    >
      {/* Phone icon SVG */}
      <svg
        className="h-12 w-12 text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        No Photo
      </span>
    </div>
  );
}

export default function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes,
}: ProductImageProps) {
  const hasImage = src && src.trim().length > 0;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {hasImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
      ) : (
        <Placeholder alt={alt} />
      )}
    </div>
  );
}
