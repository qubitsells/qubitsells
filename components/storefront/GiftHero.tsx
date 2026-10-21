"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { HERO_PRODUCTS, productHref, type StoreProduct } from "@/lib/storefront";
import ProductPreview from "./ProductPreview";
import styles from "./storefront.module.css";

function subscribeMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}
const motionPreference = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const pageIsVisible = () => !document.hidden;
const serverMotionPreference = () => true;
const serverVisibility = () => true;

function HeroBackground({ product, paused, reducedMotion, playAttempt }: {
  product: StoreProduct; paused: boolean; reducedMotion: boolean; playAttempt: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const isPresent = useIsPresent();
  const [blockedAttempt, setBlockedAttempt] = useState<number | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const canPlay = isPresent && !paused && !reducedMotion;

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!canPlay) { element.pause(); return; }
    let cancelled = false;
    // An interrupted play request is normal during a fade or tab change.
    void element.play().catch((error: unknown) => {
      if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
      setBlockedAttempt(playAttempt);
    });
    return () => { cancelled = true; element.pause(); };
  }, [canPlay, playAttempt]);

  return <motion.div className={styles.heroMedia} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .9, ease: "easeInOut" }} aria-hidden={!isPresent ? true : undefined}>
    <Image src={product.heroPoster || product.image} alt={`${product.name}: a personalized illustrated adventure`} fill loading="eager" fetchPriority="high" sizes="(max-width: 700px) 100vw, 1300px" className={styles.heroPoster} />
    {!reducedMotion && blockedAttempt !== playAttempt && <video key={playAttempt} ref={video} className={`${styles.heroVideo} ${hasFrame ? styles.heroVideoReady : ""}`} autoPlay={canPlay} muted playsInline loop preload="metadata" aria-hidden="true" onPlaying={() => setHasFrame(true)} onError={() => setBlockedAttempt(playAttempt)}>
      {product.heroVideoMobile && <source src={product.heroVideoMobile} media="(max-width: 700px)" type="video/mp4"/>}
      <source src={product.heroVideo || product.video} type="video/mp4"/>
    </video>}
  </motion.div>;
}

export default function GiftHero() {
  const section = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [motionOverride, setMotionOverride] = useState(false);
  const [playAttempt, setPlayAttempt] = useState(0);
  const prefersReducedMotion = useSyncExternalStore(subscribeMotionPreference, motionPreference, serverMotionPreference);
  const reducedMotion = prefersReducedMotion && !motionOverride;
  const visible = useSyncExternalStore(subscribeVisibility, pageIsVisible, serverVisibility);
  const product = HERO_PRODUCTS[active];
  // Controls hold rotation; merely resting the pointer over the video does not.
  const videoPaused = !playing || previewing || !visible || !onScreen;
  const paused = videoPaused || hovered || focused || reducedMotion;
  const change = (index: number) => setActive((index + HERO_PRODUCTS.length) % HERO_PRODUCTS.length);

  useEffect(() => {
    if (!section.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % HERO_PRODUCTS.length), 12000);
    return () => window.clearInterval(timer);
  }, [paused, active]);

  return <section ref={section} className={`${styles.container} ${styles.heroSection}`} aria-label="Featured gift templates" aria-roledescription="carousel">
    <h1 className={styles.srOnly}>Personalized digital gifts, made to be shared.</h1>
    <div className={styles.hero} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} onKeyDown={event => {
      if (event.target instanceof HTMLElement && event.target.closest("dialog")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); change(active + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); change(active - 1); }
    }}>
      <div className={styles.heroVisual}>
        <AnimatePresence initial={false}>
          <HeroBackground key={product.slug} product={product} paused={videoPaused} reducedMotion={reducedMotion} playAttempt={playAttempt} />
        </AnimatePresence>
        <span className={styles.artworkCaption}>A scene from {product.name}</span>
      </div>
      <div className={styles.heroPanel} role="group" aria-roledescription="slide" aria-label={`${active + 1} of 3: ${product.name}`}>
        <div aria-live={paused ? "polite" : "off"} aria-atomic="true">
        <motion.div key={product.slug} className={styles.heroCopy} initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : .55, ease: "easeOut" }}>
          <p className={styles.eyebrow}><span /> The featured collection / 0{active + 1}</p>
          <h2>{product.name}</h2>
          <p className={styles.heroDescription}>{product.description}</p>
          <p className={styles.heroPrice}>{product.priceLabel}<span>Starting price · up to 3 days</span></p>
          <div className={styles.heroActions} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <Link className={`${styles.button} ${styles.primary}`} href={productHref(product)}>Buy this template <ArrowRight size={17} aria-hidden="true" /></Link>
            <ProductPreview key={product.slug} product={product} onOpen={() => setPreviewing(true)} onClose={() => setPreviewing(false)} />
          </div>
          <p className={styles.purchaseNote}>See the story, choose your link duration, and make it yours.</p>
        </motion.div>
        </div>
        <div className={styles.heroControls} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <div className={styles.slideSelectors} aria-label="Choose a featured template">
            {HERO_PRODUCTS.map((item, index) => <button key={item.slug} aria-label={`Show ${item.name}`} aria-current={active === index ? "true" : undefined} onClick={() => change(index)}><span>0{index + 1}</span><i /></button>)}
          </div>
          <div className={styles.playControls}>
            <button className={styles.smallIconButton} aria-label="Previous template" onClick={() => change(active - 1)}><ChevronLeft size={18} /></button>
            <button className={styles.smallIconButton} aria-label="Next template" onClick={() => change(active + 1)}><ChevronRight size={18} /></button>
            <button className={styles.smallIconButton} aria-label={playing && !reducedMotion ? "Pause slideshow" : "Play slideshow"} aria-pressed={playing && !reducedMotion} onClick={() => {
              if (playing && !reducedMotion) { setPlaying(false); return; }
              setPlaying(true); setMotionOverride(true); setPlayAttempt(attempt => attempt + 1);
            }}>{playing && !reducedMotion ? <Pause size={15} /> : <Play size={15} />}</button>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
