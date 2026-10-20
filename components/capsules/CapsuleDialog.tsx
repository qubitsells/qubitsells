"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./capsules.module.css";

export default function CapsuleDialog({children, label, onClose, className = ""}: {children: ReactNode; label: string; onClose: () => void; className?: string}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = root.current;
    if (!dialog) return;
    dialog.focus();
    const keyboard = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll("[data-capsule-dialog]");
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div ref={root} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} data-capsule-dialog className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${styles.dialogOverlay} ${className}`}>{children}</div>;
}
