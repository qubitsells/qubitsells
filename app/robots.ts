import type { MetadataRoute } from "next";
import { getSiteUrl, PUBLIC_SITE_ORIGIN } from "@/lib/storefront";
import { PRIVATE_CRAWL_PATHS, PUBLIC_CRAWLERS } from "@/lib/crawling";

export default function robots(): MetadataRoute.Robots {
  const url = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_CRAWL_PATHS },
      { userAgent: PUBLIC_CRAWLERS, allow: "/", disallow: PRIVATE_CRAWL_PATHS },
    ],
    sitemap: `${url}/sitemap.xml`,
  };
}
