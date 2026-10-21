import type { MetadataRoute } from "next";
import { getSiteUrl, PRODUCTS, PUBLIC_SITE_ORIGIN } from "@/lib/storefront";
import { PUBLIC_INFORMATION } from "@/lib/public-information";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  return ["/", "/templates", "/anime-template", ...PRODUCTS.map(product => `/products/${product.slug}`), ...Object.keys(PUBLIC_INFORMATION).map(key => `/${key}`)].map(path => {
    const product = PRODUCTS.find(item => path === `/products/${item.slug}`);
    return { url: `${url}${path}`, ...(product ? { images: [new URL(product.image, url).toString()] } : {}) };
  });
}
