"use client";

import { useId, useRef, useState } from "react";
import ReceiverDetails from "./ReceiverDetails";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Clock3, Copy, Eye, Mail, MessageSquare, ShieldCheck, Trash2 } from "lucide-react";
import { InlineMediaGallery } from "@/components/MediaViewer";
import { PRODUCTS } from "@/lib/storefront";
import { SCENES } from "@/lib/constants/scenes";
import type { CreatorTemplateItem } from "@/lib/supabase/coupleTemplates";
import styles from "./creator-center.module.css";

type Props = {
  item: CreatorTemplateItem;
  now: number;
  defaultExpanded?: boolean;
  copied: boolean;
  deleting: boolean;
  onCopy: (code: string) => Promise<void>;
  onDelete: (code: string) => Promise<boolean>;
  onUpdated?: () => void;
};

export default function CreationCard({ item, now, defaultExpanded, copied, deleting, onCopy, onDelete, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded || item.invitation?.status === "awaiting_confirmation"));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  const responseTrigger = useRef<HTMLButtonElement>(null);
  const responseId = useId();
  const confirmationId = useId();
  const reducedMotion = useReducedMotion();
  const product = PRODUCTS.find(product => product.slug === item.theme);
  const scene = SCENES[item.scene_index] || SCENES[0];
  const replies = item.is_expired ? [] : item.replies || [];
  const expiresIn = Math.max(0, new Date(item.expires_at).getTime() - now);
  const days = Math.floor(expiresIn / 86400000);
  const hours = Math.floor(expiresIn / 3600000) % 24;
  const minutes = Math.floor(expiresIn / 60000) % 60;
  const expiryLabel = days > 0 ? `${days}d ${hours}h left` : expiresIn >= 3600000 ? `${hours}h ${minutes}m left` : expiresIn >= 60000 ? `${minutes}m left` : "Less than a minute left";

  return <article id={`creation-${item.id}`} className={`${styles.creationCard} ${item.is_expired ? styles.expiredCard : ""}`} aria-label={`Gift for ${item.partner_name}`}>
    <div className={styles.cardHeader}>
      <div className={styles.cardArtwork}><Image src={product?.image || scene.bg} alt={product ? `${product.name} artwork` : `${scene.label} artwork`} fill sizes="(max-width: 600px) 90vw, 190px" /><span>{product?.name || scene.label}</span></div>
      <div className={styles.cardIdentity}>
        <div className={styles.cardTitleRow}><p className={styles.cardEyebrow}>A gift for</p><span className={`${styles.status} ${item.is_expired ? styles.expiredStatus : styles.activeStatus}`}>{item.is_expired ? <Clock3 size={12} aria-hidden="true" /> : <span className={styles.statusDot} />}{item.is_expired ? "Expired" : "Active"}</span></div>
        <h3>{item.partner_name}</h3><p className={styles.sender}>From {item.partner_from}</p>
        <div className={styles.cardMeta}><span><Eye size={13} aria-hidden="true" />{item.view_count} {item.view_count === 1 ? "open" : "opens"}</span><span><Clock3 size={13} aria-hidden="true" />{item.is_expired ? `Expired ${formatDate(item.expires_at)}` : expiryLabel}</span></div>
        <p className={styles.code}>Created {formatDate(item.created_at)}<span>·</span><code>{item.short_code}</code></p>
      </div>
    </div>
    <div className={styles.cardActions}>
      <div>{!item.is_expired && <><button type="button" className={`${styles.smallButton} ${styles.copyButton}`} onClick={() => void onCopy(item.short_code)}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? "Link copied" : "Copy gift link"}</button><a href={`/t/${encodeURIComponent(item.short_code)}`} target="_blank" rel="noopener noreferrer" className={styles.smallButton}>Open gift <ArrowUpRight size={14} aria-hidden="true" /><span className={styles.srOnly}> (opens in a new tab)</span></a>{item.manage_token && <a href={`/t/${encodeURIComponent(item.short_code)}?manage=${encodeURIComponent(item.manage_token)}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={styles.manageLink}><ShieldCheck size={14} aria-hidden="true" />Manage<span className={styles.srOnly}> gift (opens in a new tab)</span></a>}</>}</div>
      <button type="button" className={styles.deleteTrigger} ref={deleteTrigger} aria-label={`Delete gift for ${item.partner_name}`} aria-expanded={confirmDelete} aria-controls={confirmationId} onClick={() => setConfirmDelete(!confirmDelete)} disabled={deleting}><Trash2 size={15} aria-hidden="true" /><span>Delete</span></button>
    </div>
    {confirmDelete && <div className={styles.deleteConfirm} id={confirmationId} onKeyDown={event => { if (event.key === "Escape" && !deleting) { setConfirmDelete(false); deleteTrigger.current?.focus(); } }}><div><strong>Delete this gift permanently?</strong><p>The link will stop working. Its replies and content cannot be recovered.</p></div><div><button type="button" className={styles.cancelDelete} disabled={deleting} onClick={() => { setConfirmDelete(false); deleteTrigger.current?.focus(); }}>Keep gift</button><button type="button" className={styles.confirmDelete} disabled={deleting} onClick={() => void onDelete(item.short_code)}>{deleting ? "Deleting…" : "Yes, delete gift"}</button></div></div>}
    {item.is_expired ? <div className={styles.expiryNotice}><Clock3 size={16} aria-hidden="true" /><p>This link has expired. Replies and interactive content are no longer available.</p></div> : <div className={styles.responseSection}>
      <button type="button" className={styles.responseToggle} ref={responseTrigger} aria-expanded={expanded} aria-controls={responseId} onClick={() => setExpanded(!expanded)}><span><MessageSquare size={16} aria-hidden="true" />Replies &amp; tool responses <span className={styles.replyCount}>{replies.length} {replies.length === 1 ? "message" : "messages"}</span></span><span>{expanded ? "Hide" : "View"}<ChevronDown size={16} aria-hidden="true" className={expanded ? styles.chevronOpen : undefined} /></span></button>
      <AnimatePresence initial={false}>{expanded && <motion.div key="responses" id={responseId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .25, ease: [.2, .8, .2, 1] }} className={styles.responseReveal} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); responseTrigger.current?.focus(); } }}><div className={styles.responseContent}><section aria-label="Replies"><div className={styles.responseSubheading}><h4>Replies <span className={styles.replyCount}>{replies.length}</span></h4><p>Personal messages, reactions, photos, and voice notes.</p></div>
        {replies.length > 0 ? <div className={styles.replies}>{replies.map(reply => <div className={styles.reply} key={reply.id}><div className={styles.replyHeading}><span className={styles.replyAvatar} aria-hidden="true">{(reply.author_name || item.partner_name).slice(0, 1).toUpperCase()}</span><strong>{reply.author_name || item.partner_name}</strong>{reply.reaction && <span className={styles.replyReaction} role="img" aria-label={`Reaction: ${reply.reaction}`}>{reply.reaction}</span>}<time dateTime={reply.created_at}>{formatDate(reply.created_at, true)}</time></div>{reply.message && <p className={styles.replyMessage}>{reply.message}</p>}{Array.isArray(reply.media_items) && reply.media_items.length > 0 && <div className={styles.mediaWell}><InlineMediaGallery mediaItems={reply.media_items} shortCode={item.short_code} authorName={reply.author_name || item.partner_name} createdDate={formatDate(reply.created_at, true)} paletteTheme="cyan" /></div>}</div>)}</div> : <div className={styles.waiting}><Mail size={21} aria-hidden="true" /><div><h4>A little anticipation.</h4><p>No messages yet. Share your gift with {item.partner_name}, then refresh to check for a reply.</p></div></div>}
        </section>
        <section aria-label="Tool responses"><div className={styles.responseSubheading}><h4>Tool responses</h4><p>Date plans, checked options, answers, and other activity from this gift.</p></div><ReceiverDetails item={item} onUpdated={onUpdated} /></section>
      </div></motion.div>}</AnimatePresence>
    </div>}
  </article>;
}

function formatDate(date: string, includeTime = false) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", ...(includeTime ? { hour: "numeric", minute: "2-digit" } as const : {}) }).format(value);
}
