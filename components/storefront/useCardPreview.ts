"use client";

import { useEffect, useRef, useState } from "react";
import { focusedMobilePreview, previewAutoplayAllowed, previewVisibility } from "@/lib/product-preview";

export default function useCardPreview(collection: string, disabled: boolean) {
  const grid = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const mobile = window.matchMedia("(hover: none), (pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const links = [...element.querySelectorAll<HTMLElement>("[data-product-preview]")];
    const cleanups: (() => void)[] = [];
    let hovered: string | null = null;
    let focused: string | null = null;
    let selected: string | null = null;
    let pending: string | null = null;
    let timer: number | undefined;
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const cards = links.map(link => ({ slug: link.dataset.productPreview!, ...rect(link) }));
      const allowed = !disabled && previewAutoplayAllowed({ hidden: document.hidden, reducedMotion: reducedMotion.matches, saveData: !!connection?.saveData });
      const candidate = mobile.matches ? focusedMobilePreview(cards, viewport) : focused || hovered;
      const visible = cards.some(card => card.slug === candidate && previewVisibility(card, viewport) >= .65);
      const next = allowed && visible ? candidate : null;
      if (next === selected) { window.clearTimeout(timer); pending = null; setActiveSlug(selected); return; }
      if (next && next === pending) return;
      window.clearTimeout(timer);
      pending = next;
      // Stop immediately; wait briefly before downloading a new video while browsing.
      selected = null;
      setActiveSlug(null);
      if (next) timer = window.setTimeout(() => { selected = next; pending = null; setActiveSlug(next); }, focused === next ? 0 : 180);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    for (const link of links) {
      const card = link.closest("article")!;
      const slug = link.dataset.productPreview!;
      const enter = (event: PointerEvent) => { if (event.pointerType !== "touch") { hovered = slug; schedule(); } };
      const leave = () => { if (hovered === slug) { hovered = null; schedule(); } };
      const focus = () => { focused = slug; schedule(); };
      const blur = (event: FocusEvent) => { if (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget)) { focused = null; schedule(); } };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointerleave", leave);
      card.addEventListener("focusin", focus);
      card.addEventListener("focusout", blur);
      cleanups.push(() => { card.removeEventListener("pointerenter", enter); card.removeEventListener("pointerleave", leave); card.removeEventListener("focusin", focus); card.removeEventListener("focusout", blur); });
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", update);
    mobile.addEventListener("change", schedule);
    reducedMotion.addEventListener("change", schedule);
    connection?.addEventListener("change", schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      cleanups.forEach(cleanup => cleanup());
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", update);
      mobile.removeEventListener("change", schedule);
      reducedMotion.removeEventListener("change", schedule);
      connection?.removeEventListener("change", schedule);
    };
  }, [collection, disabled]);
  return { grid, activeSlug: disabled ? null : activeSlug };
}

function rect(element: HTMLElement) {
  const { top, left, width, height } = element.getBoundingClientRect();
  return { top, left, width, height };
}
