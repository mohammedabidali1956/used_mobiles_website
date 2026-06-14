import type { Metadata } from "next";
import { systemConfigRepo } from "@/lib/repositories";
import { GENERAL_DEFAULTS } from "@/lib/validators/settings";
import CatalogHeader from "./catalog-header";
import CatalogFooter from "./catalog-footer";

export const metadata: Metadata = {
  title: {
    template: "%s | MobileX",
    default: "MobileX — Used Phones Store",
  },
  description: "Browse quality used and refurbished phones at great prices.",
};

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
