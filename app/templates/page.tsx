import type { Metadata } from "next";
import Link from "next/link";
import StoreHeader from "@/components/storefront/StoreHeader";
import ProductGrid from "@/components/storefront/ProductGrid";
import Footer from "@/components/Footer";
import { getSiteUrl, PRODUCTS, productHref } from "@/lib/storefront";
import styles from "@/components/storefront/storefront.module.css";

const url = getSiteUrl();
export const metadata: Metadata = { title: "Personalized gift templates — QubitSells", description: "Explore six illustrated digital gift templates. Add your words, photos, and optional interactions, then share a personalized web experience by link.", alternates: url ? { canonical: `${url}/templates` } : undefined };
export default function TemplatesPage() {
  return <div className={styles.storefront}><StoreHeader /><main id="main-content"><ProductGrid catalog /><div className={`${styles.container} ${styles.catalogExtra}`}><p>Prefer an anime landscape?</p><Link href="/anime-template">Explore the original scenic template studio ↗</Link><Link href="/creator-center">Open Creator Center</Link></div></main><Footer /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "QubitSells illustrated gift templates", itemListElement: PRODUCTS.map((product, index) => ({ "@type": "ListItem", position: index + 1, name: product.name, ...(url ? { url: `${url}${productHref(product)}` } : {}) })) }).replace(/</g, "\\u003c") }} /></div>;
}
