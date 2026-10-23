"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import styles from "./commerce.module.css";

type Props = {
  name: string;
  poster: string;
  youtubeVideoId: string;
  scenes: { file: string; title: string }[];
};

export default function ProductGallery({ name, poster, youtubeVideoId, scenes }: Props) {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const selectedIndex = useRef(0);
  const id = useId();
  const count = scenes.length + 1;
  const label = selected === 0 ? "Video preview" : `Scene ${selected} of ${scenes.length}`;

  const selectAsset = (index: number) => {
    const next = Math.max(0, Math.min(count - 1, index));
    if (next !== 0) setPlaying(false);
    viewport.current?.scrollTo({
      left: next * viewport.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.scrollTo({ left: selectedIndex.current * element.clientWidth, behavior: "instant" });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const strip = thumbnails.current;
    const thumbnail = strip?.children[selected] as HTMLElement | undefined;
    if (strip && thumbnail) {
      // Scroll this strip only; changing a preview must not move the page vertically.
      strip.scrollTo({ left: thumbnail.offsetLeft - strip.clientWidth / 2 + thumbnail.clientWidth / 2, behavior: "auto" });
    }
  }, [selected]);

  return <div className={styles.gallery} role="region" aria-roledescription="carousel" aria-label={`${name} previews`}>
    <div ref={viewport} id={id} className={styles.galleryViewport} tabIndex={0}
      aria-label="Template previews. Swipe or use the arrow keys to browse."
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); selectAsset(selected + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); selectAsset(selected - 1); }
        if (event.key === "Home") { event.preventDefault(); selectAsset(0); }
        if (event.key === "End") { event.preventDefault(); selectAsset(count - 1); }
      }}
      onScroll={event => {
        const element = event.currentTarget;
        if (!element.clientWidth) return;
        const next = Math.max(0, Math.min(count - 1, Math.round(element.scrollLeft / element.clientWidth)));
        selectedIndex.current = next;
        setSelected(next);
        if (next !== 0) setPlaying(false);
      }}>
      <div className={styles.gallerySlide} role="group" aria-roledescription="slide" aria-label={`1 of ${count}: YouTube video preview`} aria-hidden={selected !== 0}>
        <div className={styles.mainArtwork}>
          {playing && selected === 0 ? <iframe
            className={styles.productVideo}
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&rel=0`}
            title={`${name} — YouTube preview`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          /> : <button type="button" className={styles.videoPoster} onClick={() => setPlaying(true)} tabIndex={selected === 0 ? 0 : -1} aria-label={`Play ${name} preview on YouTube`}>
            <Image src={poster} alt={`${name} video preview`} fill sizes="(max-width: 850px) 95vw, 700px" loading="eager" fetchPriority="high" />
            <span className={styles.videoPlay}><Play size={26} fill="currentColor" aria-hidden="true" /></span>
            <span className={styles.videoPosterLabel}>Watch the preview <span>YouTube</span></span>
          </button>}
        </div>
        <div className={styles.gallerySwipeHint} aria-hidden="true">Swipe to explore the artwork <ChevronRight size={14} /></div>
      </div>
      {scenes.map((scene, index) => <div key={scene.file} className={styles.gallerySlide} role="group" aria-roledescription="slide" aria-label={`${index + 2} of ${count}: ${scene.title}`} aria-hidden={selected !== index + 1}>
        <div className={styles.mainArtwork}><Image src={scene.file} alt={`${name}: ${scene.title}`} fill sizes="(max-width: 850px) 95vw, 700px" draggable={false} /></div>
        <div className={styles.gallerySwipeHint} aria-hidden="true">Swipe for more previews <ChevronRight size={14} /></div>
      </div>)}
    </div>
    <div className={styles.galleryControls}>
      <span role="status" aria-live="polite" aria-atomic="true">{label}<small>{selected + 1} / {count}</small></span>
      <div><button type="button" aria-label="Previous preview" aria-controls={id} disabled={selected === 0} onClick={() => selectAsset(selected - 1)}><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" aria-label="Next preview" aria-controls={id} disabled={selected === count - 1} onClick={() => selectAsset(selected + 1)}><ChevronRight size={18} aria-hidden="true" /></button></div>
    </div>
    <div ref={thumbnails} className={styles.thumbnails} role="group" aria-label="Choose a preview">
      <button type="button" className={styles.videoThumb} aria-label="View YouTube video preview" aria-pressed={selected === 0} aria-controls={id} onClick={() => selectAsset(0)}><Play size={20} aria-hidden="true" /><span>Video</span></button>
      {scenes.map((scene, index) => <button key={scene.file} type="button" aria-label={`View scene ${index + 1}: ${scene.title}`} aria-pressed={selected === index + 1} aria-controls={id} onClick={() => selectAsset(index + 1)}><Image src={scene.file} alt="" fill sizes="90px" /><span>{String(index + 1).padStart(2, "0")}</span></button>)}
    </div>
    <p className={styles.galleryCaption}>Video preview and original scene artwork · Personalize it in the editor. <a href={`https://www.youtube.com/watch?v=${youtubeVideoId}`} target="_blank" rel="noopener noreferrer">Watch on YouTube <ArrowUpRight size={11} aria-hidden="true" /></a></p>
  </div>;
}
