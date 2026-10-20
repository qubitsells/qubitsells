import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/storefront";

export default function robots(): MetadataRoute.Robots {
  const url = getSiteUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/t/", "/love/", "/profile", "/my-templates", "/couple-space", "/couple-space/profile", "/couple-space/calendar", "/creator-center", "/time-capsule", "/login", "/signup", "/auth/", "/checkout/"] }, ...(url ? { sitemap: `${url}/sitemap.xml` } : {}) };
}
