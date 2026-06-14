import type { MetadataRoute } from "next";
import { productRepo, brandRepo, categoryRepo } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mobilex.com";

  // Fetch all dynamic records in parallel
  const [products, brands, categories] = await Promise.all([
    productRepo.findPublicMany({ where: {} }).catch(() => []),
    brandRepo.findAllActive().catch(() => []),
    categoryRepo.findAllActive().catch(() => []),
  ]);

  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/phones`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Add category pages
  categories.forEach((cat) => {
    sitemapEntries.push({
      url: `${baseUrl}/categories/${cat.slug}`,
      lastModified: cat.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // Add brand pages
  brands.forEach((brand) => {
    sitemapEntries.push({
      url: `${baseUrl}/brands/${brand.slug}`,
      lastModified: brand.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // Add product detail pages
  products.forEach((prod) => {
    sitemapEntries.push({
      url: `${baseUrl}/phones/${prod.slug}`,
      lastModified: prod.updatedAt || new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    });
  });

  return sitemapEntries;
}
