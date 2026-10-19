"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { productHref, type StoreProduct } from "@/lib/storefront";
import styles from "./storefront.module.css";

export default function ProductPreview({ product, onOpen, onClose }: { product: StoreProduct; onOpen?: () => void; onClose?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className={`${styles.button} ${styles.outline}`} onClick={() => { onOpen?.(); dialog.current?.showModal(); }}>Preview<span className={styles.srOnly}> {product.name}</span></button>
    <dialog ref={dialog} className={styles.previewDialog} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.previewHeading}><span>Artwork preview</span><button className={styles.smallIconButton} aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={21} /></button></div>
      {/* A still preview never starts audio, loads other videos, or creates a gift. */}
      <div className={styles.previewArtwork}><Image src={product.image} alt={`${product.name} illustrated scene`} fill sizes="(max-width: 760px) 90vw, 800px" /></div>
      <div className={styles.previewDetails}><div><h2>{product.name}</h2><p>{product.description}</p></div><Link href={productHref(product)} className={`${styles.button} ${styles.primary}`}>Personalize this template</Link></div>
    </dialog>
  </>;
}
