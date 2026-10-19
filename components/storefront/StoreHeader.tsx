"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Brand from "./Brand";
import styles from "./storefront.module.css";

const links = [
  ["Templates", "/templates"], ["Occasions", "/#occasions"],
  ["How it works", "/#how-it-works"], ["Couple Space", "/couple-space"],
];

export default function StoreHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { user } = useAuth();
  const isCurrentPage = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  return <header className={styles.header} onKeyDown={event => {
    if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
  }}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div className={`${styles.container} ${styles.headerInner}`}>
      <Brand />
      <nav aria-label="Main navigation" className={styles.desktopNav}>
        {links.map(([label, href]) => <Link key={label} href={href} aria-current={isCurrentPage(href) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className={styles.headerActions}>
        <Link className={styles.signIn} href={user ? "/creator-center" : "/login"}><UserRound size={16} aria-hidden="true" />{user ? "My creations" : "Sign in"}</Link>
        <Link className={`${styles.button} ${styles.primary} ${styles.headerBrowse}`} href="/templates">Browse templates <span className={styles.headerCtaIcon} aria-hidden="true"><ArrowUpRight size={17} /></span></Link>
        <button ref={toggle} className={styles.iconButton} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className={styles.mobileNav}>
      {links.map(([label, href]) => <Link key={label} href={href} aria-current={isCurrentPage(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
      <Link href="/templates" onClick={() => setOpen(false)}>Browse all templates <ArrowUpRight size={17} /></Link>
    </nav>}
  </header>;
}
