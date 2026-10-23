"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { OCCASIONS, PRODUCTS, PLANNED_PRICING_DESCRIPTION, productHref, type Occasion } from "@/lib/storefront";
import ProductPreview from "./ProductPreview";
import ProductCardMedia from "./ProductCardMedia";
import useCardPreview from "./useCardPreview";
import styles from "./storefront.module.css";

export default function ProductGrid({ catalog = false }: { catalog?: boolean }) {
  const [filter, setFilter] = useState<Occasion>("All");
  const [previewing, setPreviewing] = useState(false);
  const [pausedSlug, setPausedSlug] = useState<string | null>(null);
  const { grid, activeSlug } = useCardPreview(filter, previewing);
  const products = PRODUCTS.filter(product => filter === "All" || product.occasions.includes(filter));
  return <section id="occasions" className={`${styles.container} ${styles.featured}`}>
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Thoughtfully chosen / made yours</p>{catalog ? <h1>Find a surprise that feels like them.</h1> : <h2>Find a surprise that feels like them.</h2>}</div><p>Small worlds. Big feelings.<br />A collection of stories to put your heart into.</p></div>
    <div className={styles.filterBar}><span className={styles.collectionLabel}>Featured templates</span><div className={styles.filters} role="group" aria-label="Filter templates by occasion">{OCCASIONS.map(occasion => <button key={occasion} aria-pressed={filter === occasion} onClick={() => setFilter(occasion)}>{occasion}</button>)}</div><span className={styles.productCount} aria-live="polite">{products.length} designs</span></div>
    <div ref={grid} className={styles.productGrid}>{products.map((product, index) => <article key={product.slug} className={styles.product}>
      <ProductCardMedia product={product} active={activeSlug === product.slug} paused={pausedSlug === product.slug} onToggle={() => setPausedSlug(previous => previous === product.slug ? null : product.slug)} />
      <div className={styles.productTitle}><h3><Link href={productHref(product)}>{product.name}</Link></h3><span>0{PRODUCTS.indexOf(product) + 1 || index + 1}</span></div>
      <p className={styles.productDescription}>{product.description}</p>
      <div className={styles.productPurchase}><strong>{product.priceLabel}</strong><div><ProductPreview product={product} onOpen={() => setPreviewing(true)} onClose={() => setPreviewing(false)} /><Link href={productHref(product)} className={`${styles.button} ${styles.primary}`}>Buy this template <ArrowUpRight size={15} aria-hidden="true" /></Link></div></div>
      <p className={styles.purchaseNote}>From $2 USD · choose your link duration on the product page.</p>
    </article>)}</div>
    <p className={styles.catalogNote}>{PLANNED_PRICING_DESCRIPTION} Your link duration starts when you publish.</p>
    {!catalog && <div className={styles.viewAll}><Link className={`${styles.button} ${styles.outline}`} href="/templates">View all templates <ArrowRight size={17} aria-hidden="true" /></Link></div>}
    <p className={styles.catalogNote}>Looking for a birthday or thank-you gift? More occasions will appear as suitable designs become available.</p>
  </section>;
}
