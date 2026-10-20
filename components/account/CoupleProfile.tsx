"use client";

import { useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, Copy, HeartHandshake, Hourglass, Link2, Loader2, Music2, Play, Save, ShieldCheck, Unlink, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { CoupleData } from "@/lib/supabase/couple";
import { saveCoupleProfile } from "@/lib/supabase/accountProfile";
import { coupleProfileSchema, LOVE_LANGUAGES, type CoupleProfileValues } from "@/lib/couple-profile";
import CoupleShell from "@/components/couple/CoupleShell";
import styles from "./account.module.css";

type Message = { error: boolean; text: string } | null;
const notice = (message: Message) => message && <p className={message.error ? styles.errorMessage : styles.successMessage} role={message.error ? "alert" : "status"}>{!message.error && <CheckCircle2 size={16} aria-hidden="true" />}{message.text}</p>;

export default function CoupleProfile({ inviteCode = "" }: { inviteCode?: string }) {
  const { user, loading, couple, coupleLoading, coupleError, createCoupleSpace, refreshCouple } = useAuth();
  const [message, setMessage] = useState<Message>(null);
  const create = async () => { const result = await createCoupleSpace(); setMessage({ error: !result.success, text: result.message }); };
  const destination = `/couple-space/profile${inviteCode ? `?code=${encodeURIComponent(inviteCode)}` : ""}`;
  return <CoupleShell title="Your couple profile." description="Your shared story, partner connection, and relationship settings."><div className={styles.coupleProfileContent}>{loading || (user && coupleLoading && !couple) ? <div className={styles.loading} role="status"><Loader2 size={24} aria-hidden="true" /><p>Loading your couple profile…</p></div>
    : !user ? <div className={styles.signInState}><HeartHandshake size={32} aria-hidden="true" /><h2>A shared space, when you’re ready.</h2><p>Sign in to create a couple profile or review an invitation. Your individual account stays separate.</p><Link href={`/login?redirect=${encodeURIComponent(destination)}`} className={`${styles.button} ${styles.primary}`}>Sign in to continue <ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/profile" className={styles.textLink}>Go to my individual profile <ArrowRight size={14} aria-hidden="true" /></Link></div>
    : <>{notice(message)}{coupleError && <div className={styles.errorMessage} role="alert">{coupleError}<button type="button" onClick={() => void refreshCouple()} disabled={coupleLoading}>Try again</button></div>}
      {!couple ? <><section className={styles.optIn}><div className={styles.optInImage}><Image src="/couple-space-shared-memories.png" alt="A couple opening a memory box together" fill sizes="(max-width: 700px) 90vw, 400px" /></div><div><p className={styles.eyebrow}>A separate chapter</p><h2>Something just<br />for the two of you.</h2><p>Create an optional couple profile for your relationship details, shared memories, and partner connection.</p><button type="button" onClick={() => void create()} disabled={coupleLoading || Boolean(coupleError)} className={`${styles.button} ${styles.primary}`}>Create Couple Space <ArrowUpRight size={17} aria-hidden="true" /></button><span>Your account and creations work independently.</span></div></section><ConnectionPanel inviteCode={inviteCode} /></>
        : <><CoupleSummary couple={couple} /><ConnectionPanel inviteCode={inviteCode} /><RelationshipForm key={`${user.id}:${couple.id}`} user={user} couple={couple} /><div className={styles.coupleTools}><Link href="/couple-space/time-capsules"><Hourglass size={23} aria-hidden="true" /><div><h3>Keep a memory for later.</h3><p>Open the time capsules you keep together.</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/couple-space/date-ideas"><CalendarDays size={23} aria-hidden="true" /><div><h3>Make time for a date.</h3><p>Generate a date idea that fits the two of you.</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link></div><DisconnectPanel /></>}
    </>}</div></CoupleShell>;
}

function CoupleSummary({ couple }: { couple: CoupleData }) {
  const { fullName, partnerName } = useAuth();
  return <section className={styles.coupleIdentity}><div className={styles.coupleAvatars}><span>{[...(fullName || "You")][0].toUpperCase()}</span><span>{couple.is_connected ? [...(partnerName || "Partner")][0].toUpperCase() : <HeartHandshake size={23} aria-hidden="true" />}</span></div><div><p className={styles.eyebrow}>{couple.is_connected ? "Connected, with care" : "Ready when you both are"}</p><h2>{couple.is_connected ? `${fullName || "You"} & ${partnerName || "your partner"}` : "Your Couple Space"}</h2><p>{couple.is_connected ? "Your relationship profile and shared settings." : "Invite your partner to share this space."}</p></div><span className={styles.accountBadge}><span className={styles.statusDot} />{couple.is_connected ? "Connected" : "Awaiting partner"}</span></section>;
}

function ConnectionPanel({ inviteCode }: { inviteCode: string }) {
  const { couple, coupleCode, isConnected, pairWithCode } = useAuth();
  const [code, setCode] = useState(inviteCode);
  const [pairing, setPairing] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const copy = async (kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(kind === "code" ? coupleCode : `${window.location.origin}/signup?code=${encodeURIComponent(coupleCode)}`);
      setCopied(kind); setMessage({ error: false, text: kind === "code" ? "Invitation code copied." : "Invitation link copied. Your partner can review it before connecting." });
    } catch { setMessage({ error: true, text: "The invitation couldn’t be copied. You can select and copy the code below." }); }
  };
  const pair = async (event: React.FormEvent) => {
    event.preventDefault(); setPairing(true); setMessage(null);
    try { const result = await pairWithCode(code); setMessage({ error: !result.success, text: result.message }); if (result.success) setCode(""); }
    finally { setPairing(false); }
  };
  if (isConnected) return null;
  return <section className={styles.connectionPanel} aria-labelledby="connection-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>By invitation</p><h2 id="connection-title">Bring your partner into the story.</h2></div><ShieldCheck size={22} aria-hidden="true" /></div><div className={styles.connectionGrid}>
    {couple && <div><h3>Your private invitation</h3><p>Share your code or link with your partner. They choose whether to connect.</p><code className={styles.inviteCode}>{coupleCode}</code><div className={styles.inlineActions}><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => void copy("code")}>{copied === "code" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}Copy code</button><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => void copy("link")}><Link2 size={14} aria-hidden="true" />Copy invite link</button></div></div>}
    <form onSubmit={pair}><h3>{inviteCode ? "You have an invitation." : "Already have an invitation?"}</h3><p>Enter your partner’s code to connect your accounts in Couple Space.</p><label htmlFor="partner-invite-code">Partner’s invitation code</label><input id="partner-invite-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setMessage(null); }} maxLength={70} placeholder="LOVE-…" autoComplete="off" spellCheck={false} required disabled={pairing} /><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={pairing || !code.trim()}>{pairing ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <HeartHandshake size={16} aria-hidden="true" />}{pairing ? "Connecting…" : "Accept & connect"}</button></form>
  </div>{notice(message)}</section>;
}

function RelationshipForm({ user, couple }: { user: User; couple: CoupleData }) {
  const { refreshCouple } = useAuth();
  const initial = (): CoupleProfileValues => {
    const meta = user.user_metadata;
    const language = (value: unknown) => LOVE_LANGUAGES.some(([key]) => key === value) ? value as CoupleProfileValues["love_language"] : "";
    const song = couple.couple_anthem;
    return { partner_nickname: typeof meta.partner_nickname === "string" ? meta.partner_nickname : "", anniversary_date: couple.anniversary_date || "", couple_motto: couple.couple_motto || "",
      love_language: language(meta.love_language), partner_love_language: language(meta.partner_love_language),
      couple_anthem: song?.youtubeId ? { url: song.url || "", youtubeId: song.youtubeId, title: song.title || "Your song", artist: song.artist || "", thumbnail: song.thumbnail || "", duration: song.duration || 0, startAt: song.startAt || 0, autoplay: Boolean(song.autoplay) } : null,
    };
  };
  const [saved, setSaved] = useState<CoupleProfileValues>(initial);
  const [form, setForm] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [soundtrackVersion, setSoundtrackVersion] = useState(0);
  const changed = JSON.stringify(saved) !== JSON.stringify(form);
  const change = <K extends keyof CoupleProfileValues>(key: K, value: CoupleProfileValues[K]) => { setForm(previous => ({ ...previous, [key]: value })); setMessage(null); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    const parsed = coupleProfileSchema.safeParse(form);
    if (!parsed.success) { setMessage({ error: true, text: parsed.error.issues[0].message }); return; }
    setSaving(true);
    try { const result = await saveCoupleProfile(createClient(), user.id, couple.id, parsed.data); setSaved(result); setForm(result); await refreshCouple(); setMessage({ error: false, text: "Your couple profile has been saved." }); }
    catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "Your changes couldn’t be saved. Please try again." }); }
    finally { setSaving(false); }
  };
  return <form onSubmit={save} className={styles.profileForm}>
    <fieldset disabled={saving} className={styles.formSection}><legend>Your shared story</legend><p className={styles.sectionDescription}>The dates and details that mean something to you both.</p><div className={styles.formGrid}><div className={styles.field}><label htmlFor="couple-nickname">Your nickname for your partner</label><input id="couple-nickname" value={form.partner_nickname} onChange={event => change("partner_nickname", event.target.value)} maxLength={100} placeholder="Their name or a name just for them" /></div><div className={styles.field}><label htmlFor="couple-anniversary">Anniversary date <span>Optional</span></label><input id="couple-anniversary" type="date" value={form.anniversary_date} onChange={event => change("anniversary_date", event.target.value)} /></div><div className={`${styles.field} ${styles.fullWidth}`}><label htmlFor="couple-motto">A message for your shared space</label><textarea id="couple-motto" value={form.couple_motto} onChange={event => change("couple_motto", event.target.value)} maxLength={500} rows={3} placeholder="A line that feels like the two of you." /><small>Your shared date, message, and soundtrack are visible to both connected partners.</small></div></div></fieldset>
    <fieldset disabled={saving} className={styles.formSection}><legend>Ways you feel appreciated</legend><p className={styles.sectionDescription}>Optional relationship preferences. These stay with your couple profile.</p><div className={styles.formGrid}><div className={styles.field}><label htmlFor="your-love-language">Your love language</label><select id="your-love-language" value={form.love_language} onChange={event => change("love_language", event.target.value as CoupleProfileValues["love_language"])}><option value="">Not set</option>{LOVE_LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className={styles.field}><label htmlFor="partner-love-language">Your partner’s love language</label><select id="partner-love-language" value={form.partner_love_language} onChange={event => change("partner_love_language", event.target.value as CoupleProfileValues["partner_love_language"])}><option value="">Not set</option>{LOVE_LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div></fieldset>
    <fieldset disabled={saving} className={styles.formSection}><legend><Music2 size={18} aria-hidden="true" />A soundtrack for two</legend><p className={styles.sectionDescription}>Choose a YouTube song for your couple profile. Your individual profile stays quiet.</p><Soundtrack key={soundtrackVersion} value={form.couple_anthem} onChange={value => change("couple_anthem", value)} /></fieldset>
    {notice(message)}<div className={styles.saveBar}><span>{changed ? "You have unsaved changes." : "Your relationship details live here."}</span><div><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={saving || !changed} onClick={() => { setForm(saved); setMessage(null); setSoundtrackVersion(version => version + 1); }}>Cancel</button><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={saving || !changed}>{saving ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{saving ? "Saving…" : "Save couple profile"}</button></div></div>
  </form>;
}

function Soundtrack({ value, onChange }: { value: CoupleProfileValues["couple_anthem"]; onChange: (value: CoupleProfileValues["couple_anthem"]) => void }) {
  const [url, setUrl] = useState(value?.url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const validId = value?.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(value.youtubeId) ? value.youtubeId : "";
  const [playing, setPlaying] = useState(Boolean(value?.autoplay && validId));
  const fetchSong = async () => {
    setLoading(true); setError(""); setPlaying(false);
    try {
      const response = await fetch(`/api/music/youtube?url=${encodeURIComponent(url.trim())}`);
      const data = await response.json();
      if (!response.ok || !data.track || !/^[A-Za-z0-9_-]{11}$/.test(data.track.youtubeId)) throw new Error("That song couldn’t be loaded. Check the YouTube link and try again.");
      const track = data.track;
      onChange({ url: url.trim(), youtubeId: track.youtubeId, title: track.title || "Your song", artist: track.artist || "", thumbnail: track.thumbnail || "", duration: track.duration || 0, startAt: 0, autoplay: false });
    } catch (error) { setError(error instanceof Error ? error.message : "The song couldn’t be loaded. Please try again."); }
    finally { setLoading(false); }
  };
  return <div className={styles.soundtrack}><div className={styles.field}><label htmlFor="anthem-url">YouTube song link</label><div className={styles.songInput}><input id="anthem-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" maxLength={2048} /><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={loading || !url.trim()} onClick={() => void fetchSong()}>{loading ? <Loader2 size={15} className={styles.spinner} aria-hidden="true" /> : <Music2 size={15} aria-hidden="true" />}{loading ? "Loading…" : "Load song"}</button></div></div>{error && <p className={styles.errorMessage} role="alert">{error}</p>}
    {value && validId && <div className={styles.songCard}><div className={styles.songTitle}><span><Music2 size={22} aria-hidden="true" /></span><div><h3>{value.title}</h3><p>{value.artist}</p></div><button type="button" aria-label="Remove couple soundtrack" onClick={() => { setPlaying(false); onChange(null); setUrl(""); }}><X size={17} aria-hidden="true" /></button></div><div className={styles.songSettings}><div className={styles.field}><label htmlFor="anthem-start">Start at (seconds)</label><input id="anthem-start" type="number" min={0} max={value.duration ? Math.max(value.duration - 1, 0) : 86400} step={1} value={value.startAt} onChange={event => onChange({ ...value, startAt: Number(event.target.value) })} /></div><button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setPlaying(!playing)}><Play size={14} aria-hidden="true" />{playing ? "Stop preview" : "Preview song"}</button></div><label className={styles.checkbox}><input type="checkbox" checked={value.autoplay} onChange={event => onChange({ ...value, autoplay: event.target.checked })} /><span>Play when I open my couple profile<small>Your browser may ask you to press play first.</small></span></label>{playing && <iframe key={`${validId}:${value.startAt}`} className={styles.songPlayer} src={`https://www.youtube-nocookie.com/embed/${validId}?autoplay=1&start=${Math.floor(value.startAt)}&rel=0`} title={`Couple soundtrack: ${value.title}`} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}</div>}
  </div>;
}

function DisconnectPanel() {
  const { isConnected, disconnect } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const performDisconnect = async () => {
    setBusy(true); setMessage(null);
    try { const result = await disconnect(); setMessage({ error: !result.success, text: result.message }); if (result.success) setConfirm(false); }
    finally { setBusy(false); }
  };
  if (!isConnected) return null;
  return <section className={styles.disconnectSection}><div><Unlink size={20} aria-hidden="true" /><div><h3>Partner connection</h3><p>Manage the connection for this Couple Space.</p></div><button ref={trigger} type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setConfirm(!confirm)} disabled={busy} aria-expanded={confirm} aria-controls="disconnect-confirmation">Disconnect partner</button></div>{confirm && <div id="disconnect-confirmation" className={styles.disconnectConfirm} onKeyDown={event => { if (event.key === "Escape" && !busy) { setConfirm(false); trigger.current?.focus(); } }}><h4>Disconnect this Couple Space?</h4><p>This removes shared access and deletes shared couple capsules. Each person keeps their own personal capsules. Your individual accounts and templates remain available.</p><div><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => { setConfirm(false); trigger.current?.focus(); }}>Keep connection</button><button type="button" className={`${styles.button} ${styles.dangerButton}`} disabled={busy} onClick={() => void performDisconnect()}>{busy ? "Disconnecting…" : "Disconnect & remove shared capsules"}</button></div></div>}{notice(message)}</section>;
}
