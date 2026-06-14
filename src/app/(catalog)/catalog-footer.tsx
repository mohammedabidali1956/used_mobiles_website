import Link from "next/link";

interface CatalogFooterProps {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  shopWhatsapp: string;
  shopTagline: string;
}

export default function CatalogFooter({
  shopName,
  shopAddress,
  shopPhone,
  shopEmail,
  shopWhatsapp,
  shopTagline,
}: CatalogFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-base font-bold text-white">{shopName}</span>
            </div>
            {shopTagline && (
              <p className="text-sm text-zinc-500">{shopTagline}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Browse</h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/phones" className="text-zinc-500 hover:text-white transition-colors">All Phones</Link>
              <Link href="/phones?condition=NEW" className="text-zinc-500 hover:text-white transition-colors">New</Link>
              <Link href="/phones?condition=LIKE_NEW" className="text-zinc-500 hover:text-white transition-colors">Like New</Link>
              <Link href="/phones?condition=GOOD" className="text-zinc-500 hover:text-white transition-colors">Good Condition</Link>
              <Link href="/phones?sort=price_asc" className="text-zinc-500 hover:text-white transition-colors">Lowest Price</Link>
            </nav>
          </div>

          {/* Contact */}
          {(shopPhone || shopEmail || shopWhatsapp || shopAddress) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact</h3>
              <div className="flex flex-col gap-2 text-sm text-zinc-500">
                {shopPhone && (
                  <a href={`tel:${shopPhone}`} className="hover:text-white transition-colors flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {shopPhone}
                  </a>
                )}
                {shopWhatsapp && (
                  <a
                    href={`https://wa.me/${shopWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M11.999 2C6.477 2 2 6.484 2 12.017c0 1.75.457 3.39 1.258 4.816L2 22l5.29-1.225A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2h-.001z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {shopEmail && (
                  <a href={`mailto:${shopEmail}`} className="hover:text-white transition-colors flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {shopEmail}
                  </a>
                )}
                {shopAddress && (
                  <span className="flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="whitespace-pre-line">{shopAddress}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-600">
          © {year} {shopName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
