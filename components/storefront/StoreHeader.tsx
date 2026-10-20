"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, FolderHeart, Heart, HeartHandshake, LogOut, Package, Star, UserRound } from "lucide-react";
import NotificationBell from "@/components/commerce/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import Brand from "./Brand";
import styles from "./storefront.module.css";
import MobileNavigation from "./MobileNavigation";
import {STORE_LINKS} from "./navigation";

export default function StoreHeader() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const accountToggle = useRef<HTMLButtonElement>(null);
  const accountMenu = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, fullName, signOut } = useAuth();
  useEffect(() => {
    if (!accountOpen) return;
    const closeOutside = (event: MouseEvent) => { if (!accountMenu.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [accountOpen]);
  const handleSignOut = async () => {
    setSigningOut(true); setSignOutError("");
    try { await signOut(); setAccountOpen(false); } catch { setSignOutError("You couldn’t be signed out. Please try again."); }
    finally { setSigningOut(false); }
  };
  const isCurrentPage = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  return <header className={styles.header} onKeyDown={event => {
    if (event.key === "Escape") {
      if (accountOpen) { setAccountOpen(false); accountToggle.current?.focus(); }
    }
  }}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div className={`${styles.container} ${styles.headerInner}`}>
      <Brand />
      <nav aria-label="Main navigation" className={styles.desktopNav}>
        {STORE_LINKS.map(({label, href}) => <Link key={label} href={href} aria-current={isCurrentPage(href) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className={styles.headerActions}>
        <NotificationBell/>
        {user ? <div className={styles.accountControl} ref={accountMenu}>
          <button type="button" className={styles.signIn} ref={accountToggle} onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen} aria-controls="account-navigation"><UserRound size={16} aria-hidden="true" />My account<ChevronDown size={13} aria-hidden="true" /></button>
          {accountOpen && <nav id="account-navigation" className={styles.accountDropdown} aria-label="Account navigation"><p>{fullName || "Your account"}</p><Link href="/profile" onClick={() => setAccountOpen(false)} aria-current={pathname === "/profile" ? "page" : undefined}><UserRound size={15} aria-hidden="true" />My profile</Link><Link href="/profile?view=orders" onClick={() => setAccountOpen(false)}><Package size={15} aria-hidden="true" />My orders</Link><Link href="/profile?view=wishlist" onClick={() => setAccountOpen(false)}><Heart size={15} aria-hidden="true" />Wishlist</Link><Link href="/profile?view=reviews" onClick={() => setAccountOpen(false)}><Star size={15} aria-hidden="true" />My reviews</Link><Link href="/creator-center" onClick={() => setAccountOpen(false)} aria-current={pathname === "/creator-center" ? "page" : undefined}><FolderHeart size={15} aria-hidden="true" />My creations</Link><Link href="/couple-space" onClick={() => setAccountOpen(false)} aria-current={pathname.startsWith("/couple-space") ? "page" : undefined}><HeartHandshake size={15} aria-hidden="true" />Couple Space<span>Open hub</span></Link><button type="button" onClick={() => void handleSignOut()} disabled={signingOut}><LogOut size={15} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button>{signOutError && <p role="alert">{signOutError}</p>}</nav>}
        </div> : <Link className={styles.signIn} href="/login"><UserRound size={16} aria-hidden="true" />Sign in</Link>}
        <Link className={`${styles.button} ${styles.primary} ${styles.headerBrowse}`} href="/templates">Browse templates <span className={styles.headerCtaIcon} aria-hidden="true"><ArrowUpRight size={17} /></span></Link>
        <MobileNavigation pathname={pathname} signedIn={!!user} onOpen={()=>setAccountOpen(false)}/>
      </div>
    </div>
  </header>;
}
