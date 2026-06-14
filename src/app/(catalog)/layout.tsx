import type { Metadata } from "next";
import { systemConfigRepo } from "@/lib/repositories";
import { GENERAL_DEFAULTS } from "@/lib/validators/settings";
import CatalogHeader from "./catalog-header";
import CatalogFooter from "./catalog-footer";

async function getShopConfig() {
  try {
    const all = await systemConfigRepo.findAll();
    const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
    return {
      shopName: map["shop.name"] || GENERAL_DEFAULTS["shop.name"],
      shopTagline: map["shop.tagline"] || GENERAL_DEFAULTS["shop.tagline"],
      shopAddress: map["shop.address"] || "",
      shopPhone: map["shop.phone"] || "",
      shopEmail: map["shop.email"] || "",
      shopWhatsapp: map["shop.whatsapp"] || "",
    };
  } catch {
    return {
      shopName: GENERAL_DEFAULTS["shop.name"],
      shopTagline: GENERAL_DEFAULTS["shop.tagline"],
      shopAddress: "",
      shopPhone: "",
      shopEmail: "",
      shopWhatsapp: "",
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getShopConfig();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mobilex.com";

  const titleText = `${config.shopName} — ${config.shopTagline || "Used Phones Store"}`;
  const descText = "Browse quality used and refurbished phones at great prices.";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | ${config.shopName}`,
      default: titleText,
    },
    description: descText,
    alternates: {
      canonical: "./",
    },
    openGraph: {
      title: titleText,
      description: descText,
      url: baseUrl,
      siteName: config.shopName,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: titleText,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleText,
      description: descText,
      images: [`${baseUrl}/og-image.png`],
    },
  };
}


export default async function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getShopConfig();

  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
      <CatalogHeader shopName={config.shopName} />
      <main className="flex-1">{children}</main>
      <CatalogFooter
        shopName={config.shopName}
        shopTagline={config.shopTagline}
        shopAddress={config.shopAddress}
        shopPhone={config.shopPhone}
        shopEmail={config.shopEmail}
        shopWhatsapp={config.shopWhatsapp}
      />
    </div>
  );
}
