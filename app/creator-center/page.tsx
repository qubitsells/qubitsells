"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronRight, Clock3, Eye, Gift, MessageSquare, Plus, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import CreationCard from "@/components/creator-center/CreationCard";
import type { CreatorTemplateItem } from "@/lib/supabase/coupleTemplates";
import { PRODUCTS } from "@/lib/storefront";
import store from "@/components/storefront/storefront.module.css";
import styles from "@/components/creator-center/creator-center.module.css";

type Filter = "all" | "active" | "expired";

async function loadCreations(signal?: AbortSignal): Promise<CreatorTemplateItem[]> {
  let storedCodes: string[] = [];
  let storedTokens: string[] = [];
  try {
    const saved = JSON.parse(localStorage.getItem("bonded_creator_templates") || "[]");
    if (Array.isArray(saved)) {
      storedCodes = saved.map(item => item?.code || item?.short_code).filter(value => typeof value === "string");
      storedTokens = saved.map(item => item?.token || item?.manage_token).filter(value => typeof value === "string");
    }
  } catch { /* Cookie/account access still works if browser storage is unavailable. */ }
  const params = new URLSearchParams();
  if (storedCodes.length) params.set("codes", storedCodes.slice(0, 30).join(","));
  if (storedTokens.length) params.set("tokens", storedTokens.slice(0, 30).join(","));
  const response = await fetch(`/api/creator-center?${params}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Unable to load creations");
  const data = await response.json();
  if (!data.success || !Array.isArray(data.templates)) throw new Error("Invalid response");
  return data.templates;
}

export default function CreatorCenterPage() {
  const [templates, setTemplates] = useState<CreatorTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<Filter>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionHeading = useRef<HTMLHeadingElement>(null);

  const acceptCreations = useCallback((items: CreatorTemplateItem[]) => {
    setTemplates(items);
    setNow(Date.now());
    setLoadError("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCreations(controller.signal).then(items => {
      if (!controller.signal.aborted) acceptCreations(items);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("We couldn’t load your creations. Please try again.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [acceptCreations]);
  const refreshTemplates = () => {
    setRefreshing(true);
    setLoadError("");
    if (!templates.length) setLoading(true);
    void loadCreations().then(items => {
      acceptCreations(items);
      setNotice("Your creations are up to date.");
    }).catch(() => {
      setLoadError("We couldn’t refresh your creations. Please try again. Any gifts already loaded are still shown below.");
    }).finally(() => { setRefreshing(false); setLoading(false); });
  };
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(interval); if (copyTimeout.current) clearTimeout(copyTimeout.current); };
  }, []);

  const handleCopy = async (code: string) => {
    setActionError("");
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${code}`);
      setCopiedCode(code);
      setNotice("Gift link copied. It’s ready to share.");
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopiedCode(null), 2500);
    } catch { setActionError("The link couldn’t be copied. Open the gift and copy the address from your browser."); }
  };

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    setActionError("");
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setTemplates(previous => previous.filter(item => item.short_code !== code));
      try {
        const saved = JSON.parse(localStorage.getItem("bonded_creator_templates") || "[]");
        if (Array.isArray(saved)) localStorage.setItem("bonded_creator_templates", JSON.stringify(saved.filter(item => (item?.code || item?.short_code) !== code)));
      } catch { /* Keep the successful server deletion if storage is unavailable. */ }
      setNotice("The gift has been deleted.");
      collectionHeading.current?.focus({ preventScroll: true });
      return true;
    } catch {
      setActionError("We couldn’t delete this gift. Please try again from the browser where you created it, or use its private management link.");
      return false;
    } finally { setDeletingCode(null); }
  };

  // Hide responses when the link expires, including while this page stays open.
  const currentTemplates = useMemo(() => templates.map(item => ({ ...item,
    is_expired: item.is_expired || (now > 0 && new Date(item.expires_at).getTime() <= now),
  })), [templates, now]);
  const stats = useMemo(() => {
    const active = currentTemplates.filter(item => !item.is_expired);
    return {
      active: active.length, expired: currentTemplates.length - active.length,
      replies: active.reduce((total, item) => total + (item.replies?.length || 0), 0),
      views: currentTemplates.reduce((total, item) => total + (item.view_count || 0), 0),
    };
  }, [currentTemplates]);
  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return currentTemplates.filter(item => (filterTab === "all" || (filterTab === "expired") === item.is_expired) &&
      (!query || `${item.partner_name} ${item.partner_from} ${item.short_code}`.toLowerCase().includes(query)));
  }, [currentTemplates, filterTab, searchQuery]);
  const isFiltered = Boolean(searchQuery.trim()) || filterTab !== "all";
  const suggested = PRODUCTS[1];

  return <div className={`${store.storefront} ${styles.page}`}>
    <StoreHeader />
    <main id="main-content" className={`${store.container} ${styles.main}`}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">My creations</span></nav>
      <section className={styles.intro} aria-labelledby="creations-title">
        <div><p className={styles.eyebrow}>Your personal collection</p><h1 id="creations-title">My creations<span>.</span></h1><p className={styles.introText}>Little gifts. Lovely reactions.<br />Everything you’ve made, in one thoughtful place.</p></div>
        <Link href="/templates" className={`${styles.button} ${styles.primary}`}>Create a gift <span className={styles.buttonIcon}><Plus size={19} aria-hidden="true" /></span></Link>
      </section>
      <dl className={styles.stats} aria-label="Creation overview" aria-busy={loading}>
        {([["Gifts created", templates.length, Gift], ["Active links", stats.active, ArrowUpRight], ["Replies received", stats.replies, MessageSquare], ["Gift opens", stats.views, Eye]] as const).map(([label, value, Icon]) => <div key={label} className={styles.stat}><dt><Icon size={17} aria-hidden="true" />{label}</dt><dd>{loading ? <span className={styles.statPlaceholder}>—</span> : String(value).padStart(2, "0")}</dd></div>)}
      </dl>
      <div className={styles.workspace}>
        <section className={styles.collection} aria-labelledby="collection-title" aria-busy={loading || refreshing}>
          <div className={styles.collectionHeading}><div><h2 id="collection-title" ref={collectionHeading} tabIndex={-1}>Your gifts <span>{loading ? "—" : templates.length}</span></h2><p>Share a little joy. See what comes back.</p></div><button type="button" className={styles.refresh} onClick={refreshTemplates} disabled={loading || refreshing}><RefreshCw size={15} aria-hidden="true" className={refreshing ? styles.spinning : undefined} />{refreshing ? "Refreshing" : "Refresh"}</button></div>
          <div className={styles.toolbar}>
            <div className={styles.filters} role="group" aria-label="Filter gifts">{([['all', 'All gifts', templates.length], ['active', 'Active', stats.active], ['expired', 'Expired', stats.expired]] as const).map(([value, label, count]) => <button type="button" key={value} aria-pressed={filterTab === value} onClick={() => setFilterTab(value)}>{label}<span>{loading ? "—" : count}</span></button>)}</div>
            <div className={styles.search}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search gifts by name or code" placeholder="Search by name or code" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />{searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")}><X size={14} /></button>}</div>
          </div>
          {loadError && <div className={styles.error} role="alert"><p>{loadError}</p><button type="button" onClick={refreshTemplates} disabled={refreshing}>Try again <RefreshCw size={14} aria-hidden="true" /></button></div>}
          {actionError && <p className={styles.error} role="alert">{actionError}</p>}
          <p className={styles.srOnly} role="status">{notice}</p>
          {loading ? <div className={styles.loading} role="status"><span className={styles.loader} /><p>Gathering your little creations…</p><div className={styles.skeleton} /><div className={styles.skeleton} /></div>
            : !templates.length && loadError ? <div className={styles.unavailable}><Gift size={30} aria-hidden="true" /><h3>Your collection will be right here.</h3><p>We’re having trouble loading it at the moment. Please try refreshing.</p></div>
            : !filteredTemplates.length ? <div className={styles.empty}>
              {isFiltered ? <div className={styles.emptySearch}><Search size={28} aria-hidden="true" /></div> : <div className={styles.emptyArtwork} aria-hidden="true"><div className={styles.emptyBack} /><div className={styles.emptyPhoto}><Image src={suggested.image} alt="" fill sizes="240px" /><span>A little something, just for you.</span></div><span className={styles.emptySeal}><Gift size={22} /></span></div>}
              <p className={styles.eyebrow}>{isFiltered ? "A little more looking" : "Make someone’s day"}</p><h3>{isFiltered ? "No gifts here just yet." : "Your first gift starts here."}</h3>
              <p>{isFiltered ? "Try another name or code, or browse all your creations." : "Choose a design, add your own words and photos, and send a link they’ll love opening."}</p>
              {isFiltered ? <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => { setSearchQuery(""); setFilterTab("all"); }}>Show all gifts <ArrowRight size={16} aria-hidden="true" /></button> : <Link href="/templates" className={`${styles.button} ${styles.primary}`}>Find your first design <span className={styles.buttonIcon}><ArrowUpRight size={18} aria-hidden="true" /></span></Link>}
              {!isFiltered && <span className={styles.emptyFootnote}>Already made a gift? Open this page in the browser you used to create it.</span>}
            </div> : <div className={styles.cardList}>{filteredTemplates.map((item, index) => <CreationCard key={item.id} item={item} now={now} defaultExpanded={index === 0} copied={copiedCode === item.short_code} deleting={deletingCode === item.short_code} onCopy={handleCopy} onDelete={handleDelete} />)}</div>}
          {!loading && templates.length > 0 && <p className={styles.resultsNote}>{filteredTemplates.length} of {templates.length} gifts shown<span>Responses update when you refresh.</span></p>}
        </section>
        <aside className={styles.sidebar} aria-label="Ideas and collection help">
          <div className={styles.inspiration}><div className={styles.asideImage}><Image src={suggested.image} alt="An illustrated couple sharing a café date" fill sizes="(max-width: 700px) 90vw, 280px" /></div><div className={styles.inspirationCopy}><p className={styles.eyebrow}>A reason isn’t required</p><h2>Just because<br />is a lovely occasion.</h2><p>Find a little world that feels like them. Make it your own.</p><Link href="/templates">Explore the collection <ArrowUpRight size={17} aria-hidden="true" /></Link></div></div>
          <div className={styles.privacy}><ShieldCheck size={22} aria-hidden="true" /><h2>A little care for your privacy.</h2><p>Replies are available while a gift link is active. After expiry, the link closes and its content is scheduled for deletion.</p><p>Keep your original browser or private management link to access your gifts.</p><Link href="/privacy">How we handle your data <ArrowRight size={14} aria-hidden="true" /></Link></div>
          <Link href="/contact" className={styles.helpLink}>Need a hand? <span>We’re here to help <ArrowUpRight size={14} aria-hidden="true" /></span></Link>
        </aside>
      </div>
      <div className={styles.endnote}><Clock3 size={15} aria-hidden="true" /><span>Made for a moment. Keep an eye on your link’s expiry.</span></div>
    </main>
    <Footer />
  </div>;
}
