"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { productHref, type StoreProduct } from "@/lib/storefront";
import styles from "./storefront.module.css";

export default function ProductPreview({ product, onOpen, onClose }: { product: StoreProduct; onOpen?: () => void; onClose?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`${styles.button} ${styles.outline}`} aria-haspopup="dialog" onClick={() => { setOpen(true); onOpen?.(); dialog.current?.showModal(); }}>Preview<span className={styles.srOnly}> {product.name}</span></button>
    <dialog ref={dialog} className={styles.previewDialog} aria-label={`${product.name} preview`} onClose={() => { setOpen(false); onClose?.(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {open && <>
      <div className={styles.previewHeading}><a href={`https://www.youtube.com/watch?v=${product.youtubeVideoId}`} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a><button type="button" className={styles.smallIconButton} aria-label="Close preview" onClick={() => dialog.current?.close()}><X size={21} /></button></div>
      <div className={styles.previewArtwork}><iframe
        className={styles.previewVideo}
        src={`https://www.youtube-nocookie.com/embed/${product.youtubeVideoId}?autoplay=1&playsinline=1&rel=0`}
        title={`${product.name} — YouTube preview`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /></div>
      <div className={styles.previewDetails}><div><h2>{product.name}</h2><p>{product.description}</p></div><Link href={productHref(product)} className={`${styles.button} ${styles.primary}`}>View template details</Link></div>
      </>}
    </dialog>
  </>;
}
