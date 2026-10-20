import type { MetadataRoute } from "next";
import { getSiteUrl, PRODUCTS } from "@/lib/storefront";
import { PUBLIC_INFORMATION } from "@/lib/public-information";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = getSiteUrl();
  if (!url) return [];
  return ["", "/templates", "/anime-template", ...PRODUCTS.map(product => `/products/${product.slug}`), ...Object.keys(PUBLIC_INFORMATION).map(key => `/${key}`)].map(path => ({ url: `${url}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : path.startsWith("/products") || path === "/templates" ? .8 : .4 }));
}
