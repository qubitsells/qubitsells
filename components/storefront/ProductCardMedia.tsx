"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { productHref, type StoreProduct } from "@/lib/storefront";
import { loadYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";
import styles from "./storefront.module.css";

function CardVideo({ videoId }: { videoId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let player: YouTubePlayer | undefined;
    let playbackTimer: number | undefined;
    const unavailable = () => { if (!cancelled) { player?.pauseVideo(); setPlaying(false); } };
    void loadYouTubePlayer().then(api => {
      if (cancelled) return;
      const host = document.createElement("div");
      element.appendChild(host);
      player = new api.Player(host, {
        host: "https://www.youtube-nocookie.com", width: "100%", height: "100%", videoId,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, loop: 1, playlist: videoId, rel: 0, disablekb: 1, fs: 0, origin: window.location.origin },
        events: {
          onReady: event => { if (!cancelled) { event.target.mute(); event.target.playVideo(); } },
          onStateChange: event => { if (!cancelled && event.data === 1) { window.clearTimeout(playbackTimer); setPlaying(true); } },
          onError: unavailable, onAutoplayBlocked: unavailable,
        },
      });
      const iframe = element.querySelector("iframe");
      if (iframe) { iframe.title = "Muted template preview"; iframe.tabIndex = -1; iframe.setAttribute("aria-hidden", "true"); iframe.referrerPolicy = "strict-origin-when-cross-origin"; iframe.allow = "autoplay; encrypted-media"; }
      playbackTimer = window.setTimeout(unavailable, 15000);
    }).catch(() => { /* Keep the original artwork when YouTube is blocked/unavailable. */ });
    return () => {
      cancelled = true;
      window.clearTimeout(playbackTimer);
      player?.destroy();
      element.replaceChildren();
    };
  }, [videoId]);
  return <div ref={container} className={`${styles.cardVideo} ${playing ? styles.cardVideoPlaying : ""}`} aria-hidden="true" />;
}

export default function ProductCardMedia({ product, active, paused, onToggle }: { product: StoreProduct; active: boolean; paused: boolean; onToggle: () => void }) {
  return <div className={styles.cardMedia}>
    <Link href={productHref(product)} className={styles.productImage} data-product-preview={product.slug} aria-label={`View ${product.name}`}>
      <Image src={product.image} alt={`${product.name} artwork`} fill sizes="(max-width: 550px) 100vw, (max-width: 1000px) 50vw, 33vw" />
      {active && !paused && <CardVideo videoId={product.youtubeVideoId} />}
      <span className={styles.artworkLink}><ArrowUpRight size={20} aria-hidden="true" /></span>
    </Link>
    {active && <button type="button" className={styles.cardPreviewToggle} onClick={onToggle} aria-label={`${paused ? "Play" : "Pause"} ${product.name} preview`} aria-pressed={!paused}>
      {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}<span>{paused ? "Play preview" : "Pause preview"}</span>
    </button>}
  </div>;
}
