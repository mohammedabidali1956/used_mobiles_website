"use client";

import { useState } from "react";
import Image from "next/image";

interface GalleryImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

function PlaceholderSingle({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
      <svg className="h-20 w-20 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.75" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className="mt-3 text-xs font-bold uppercase tracking-widest text-zinc-600">No Photo</span>
      <span className="mt-1 text-xs text-zinc-700 text-center px-4">{label}</span>
    </div>
  );
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 aspect-square w-full max-w-md mx-auto lg:mx-0">
        <PlaceholderSingle label={productName} />
      </div>
    );
  }

  const selected = images[selectedIndex];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-md mx-auto lg:mx-0">
        <Image
          src={selected.url}
          alt={selected.altText || productName}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-md mx-auto lg:mx-0">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(idx)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === selectedIndex
                  ? "border-indigo-500 ring-1 ring-indigo-500/40"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText || `${productName} photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
