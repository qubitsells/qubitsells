import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, FolderHeart, HeartHandshake, LayoutGrid, LifeBuoy, ShieldCheck, UserRound } from "lucide-react";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import store from "@/components/storefront/storefront.module.css";
import styles from "./account.module.css";

export default function AccountShell({ children }: { children: ReactNode }) {
  return <div className={`${store.storefront} ${styles.page}`}><StoreHeader />
    <main id="main-content" className={`${store.container} ${styles.main}`}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">My profile</span></nav>
      <header className={styles.pageHeading}><p className={styles.eyebrow}>Your QubitSells account</p><h1>Your profile<span>.</span></h1><p>For your ideas, your people, and whatever comes next.</p></header>
      <div className={styles.accountLayout}>
        <aside className={styles.accountSidebar}>
          <nav aria-label="Account navigation" className={styles.accountNav}>
            <Link href="/profile" aria-current="page"><UserRound size={17} aria-hidden="true" />My profile</Link>
            <Link href="/my-templates"><LayoutGrid size={17} aria-hidden="true" />My Templates<ArrowUpRight size={13} aria-hidden="true" /></Link><Link href="/creator-center"><FolderHeart size={17} aria-hidden="true" />My creations<ArrowUpRight size={13} aria-hidden="true" /></Link>
            <Link href="/templates"><LayoutGrid size={17} aria-hidden="true" />Browse templates<ArrowUpRight size={13} aria-hidden="true" /></Link>
          </nav>
          <div className={styles.optionalNav}><p>Couple Space <span>Optional</span></p><Link href="/couple-space"><HeartHandshake size={18} aria-hidden="true"/><span>Open Couple Space<small>Your shared profile, plans, and memories</small></span><ChevronRight size={14} aria-hidden="true"/></Link></div>
          <div className={styles.sidebarHelp}><ShieldCheck size={20} aria-hidden="true" /><p>Made for your own way of creating.</p><span>One account for personal moments, professional projects, and more.</span><Link href="/contact"><LifeBuoy size={14} aria-hidden="true" />Contact &amp; help</Link></div>
        </aside>
        <div className={styles.accountContent}>{children}</div>
      </div>
    </main><Footer /></div>;
}
