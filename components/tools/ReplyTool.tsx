"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews and private media use native image URLs. */

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Send, Square, Trash2 } from "lucide-react";
import type { ReplyToolConfig, TemplateReply } from "@/lib/supabase/coupleTemplates";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { PHOTO_TYPES, recordingExtension, recordingTime, REPLY_FILE_LIMIT, replyReceipt } from "@/lib/template-reply";
import styles from "./invitation.module.css";
import note from "./reply.module.css";

type Props = { templateCode: string; partnerName?: string; senderName?: string; config?: ReplyToolConfig; palette?: Partial<InvitationPalette>; onReplySubmitted?: (reply: TemplateReply) => void };
type Photo = { id: string; file: File; preview: string };
type Upload = { url: string; public_id: string; duration?: number };

export function ReplyTool({ templateCode, partnerName = "My Love", senderName = "Me", config, palette, onReplySubmitted }: Props) {
  const colors = { accent: "#E11D48", text: "#fff", card: "#141019", ...palette } as InvitationPalette;
  const formats = config?.enabledFormats || { text: true, photo: true, voice: true };
  const maxChars = config?.maxChars ?? 2000, maxPhotos = config?.maxPhotos ?? 3, maxVoice = config?.maxVoiceSeconds ?? 60;
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [author, setAuthor] = useState(partnerName);
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [voice, setVoice] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<TemplateReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const urls = useRef(new Set<string>());
  const uploads = useRef(new Map<string, Upload>());
  const mounted = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const started = useRef(0);
  const elapsed = useRef(0);
  const locked = useRef(false);
  const objectUrl = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.current.add(url); return url; };
  const revoke = (url: string) => { URL.revokeObjectURL(url); urls.current.delete(url); };

  useEffect(() => {
    mounted.current = true;
    const activeUrls = urls.current;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/templates/${encodeURIComponent(templateCode)}/replies`, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) throw Error(data.error || "Could not load your saved notes.");
      if (!controller.signal.aborted) { setSaved(data.my_reply ? replyReceipt(data.my_reply, templateCode) : null); setLoadFailed(false); }
    }).catch(reason => { if (!controller.signal.aborted) { setError(reason.message || "Could not load your notes."); setLoadFailed(true); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [templateCode, version]);

  const stop = () => {
    elapsed.current = Math.min(maxVoice, Math.max(.1, (recordingTime() - started.current) / 1000));
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const start = async () => {
    if (requestingMic || recording || busy) return;
    setError(""); setRequestingMic(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw Error("Voice recording isn’t supported here. Try another browser, or send a photo or message.");
      const capture = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { capture.getTracks().forEach(track => track.stop()); return; }
      stream.current = capture;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].find(value => MediaRecorder.isTypeSupported(value));
      const next = mimeType ? new MediaRecorder(capture, { mimeType }) : new MediaRecorder(capture);
      recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        capture.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        const blob = new Blob(chunks, { type: next.mimeType || mimeType || "audio/webm" });
        if (!blob.size || blob.size > REPLY_FILE_LIMIT) setError("The recording couldn’t be kept. Please record a shorter note.");
        else setVoice({ blob, url: objectUrl(blob), duration: elapsed.current });
        setRecording(false);
      };
      next.onerror = () => { stop(); if (mounted.current) setError("Recording was interrupted. Please try again."); };
      next.start(250); started.current = recordingTime(); elapsed.current = 0; setSeconds(0); setRecording(true);
      timer.current = setInterval(() => { const duration = (recordingTime() - started.current) / 1000; setSeconds(Math.min(maxVoice, Math.floor(duration))); if (duration >= maxVoice) stop(); }, 200);
    } catch (reason) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (mounted.current) setError(reason instanceof Error && reason.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access and try again, or send a photo or message." : reason instanceof Error ? reason.message : "Could not start the microphone.");
    } finally { if (mounted.current) setRequestingMic(false); }
  };
  const discardUpload = (key: string) => {
    const uploaded = uploads.current.get(key); uploads.current.delete(key);
    if (uploaded) void fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [uploaded.url] }) }).catch(() => {});
  };
  const clearDraft = () => {
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); uploads.current.clear();
    setPhotos([]); setVoice(null); setSeconds(0); setMessage(""); setReaction(null); setClientId(crypto.randomUUID()); setError(""); setConfirmDelete(false);
  };
  const upload = async (key: string, file: File) => {
    const cached = uploads.current.get(key); if (cached) return cached;
    const body = new FormData(); body.append("file", file); body.append("folder", "bonded/template_replies");
    const response = await fetch("/api/upload", { method: "POST", body }); const data = await response.json();
    if (!response.ok || !data.success) throw Error(data.error || "Could not upload the attachment.");
    uploads.current.set(key, data); return data as Upload;
  };
  const submit = async () => {
    if (locked.current || recording || requestingMic) return;
    if (!message.trim() && !reaction && !photos.length && !voice) { setError("Add a message, reaction, photo, or voice note first."); return; }
    locked.current = true; setBusy(true); setError("");
    try {
      const media: { url: string; public_id: string; type: "image" | "video"; media_type: "photo" | "voice"; duration?: number }[] = [];
      for (const [index, photo] of photos.entries()) { setProgress(`Uploading photo ${index + 1} of ${photos.length}…`); media.push({ ...await upload(photo.id, photo.file), type: "image", media_type: "photo" }); }
      if (voice) { setProgress("Uploading voice note…"); const result = await upload("voice", new File([voice.blob], `voice_reply.${recordingExtension(voice.blob.type)}`, { type: voice.blob.type })); media.push({ ...result, type: "video", media_type: "voice", duration: result.duration || voice.duration }); }
      setProgress("Sending your note…");
      const response = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, author_name: author.trim() || partnerName, message: message.trim(), reaction, media_items: media }) });
      const data = await response.json(); if (!response.ok || !data.success || !data.receipt) throw Error(data.error || "Your note couldn’t be saved. Please try again.");
      const receipt = replyReceipt(data.receipt, templateCode); setSaved(receipt); clearDraft(); onReplySubmitted?.(receipt);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your note couldn’t be saved."); }
    finally { locked.current = false; setBusy(false); setProgress(""); }
  };
  const removeSaved = async () => {
    if (!saved || locked.current) return; locked.current = true; setBusy(true); setError("");
    try { const response = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/reply`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply_id: saved.id }) }); const data = await response.json(); if (!response.ok) throw Error(data.error || "Could not delete your note."); setSaved(null); setConfirmDelete(false); clearDraft(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete your note."); }
    finally { locked.current = false; setBusy(false); }
  };
  if (config?.enabled === false) return null;
  return <section className={`${styles.root} ${note.root}`} style={{ ...invitationStyle(colors), colorScheme: colors.card === "#FFFFFF" ? "light" : "dark" }} aria-label="Voice & Photo Notes">
    <p className={styles.eyebrow}>Voice &amp; Photo Notes</p><h3 className={styles.title}>{saved ? "Your note, sent." : `A little note for ${senderName}.`}</h3>
    {loading ? <p className={styles.hint} role="status">Loading your notes…</p> : loadFailed ? <><p role="alert" className={styles.error}>{error}</p><button type="button" className={styles.secondary} onClick={() => { setLoading(true); setError(""); setVersion(value => value + 1); }}>Try again</button></> : saved ? <>
      <p className={styles.hint}>From {saved.author_name} · <time dateTime={saved.created_at}>{new Date(saved.created_at).toLocaleString()}</time></p>
      {saved.reaction && <p className={note.savedReaction} aria-label={`Reaction: ${saved.reaction}`}>{saved.reaction}</p>}{saved.message && <blockquote className={note.message}>{saved.message}</blockquote>}
      <div className={note.photos}>{saved.media_items.filter(media => media.type === "image").map((media, index) => <a href={media.url} target="_blank" rel="noopener noreferrer" key={media.url} aria-label={`Open photo ${index + 1}`}><img src={media.url} alt={`Photo ${index + 1} from ${saved.author_name}`} /></a>)}</div>
      {saved.media_items.filter(media => media.type === "audio" || media.type === "video").map(media => <div className={note.voice} key={media.url}><p>Voice note{media.duration ? ` · ${Math.ceil(media.duration)} seconds` : ""}</p><audio controls preload="metadata" src={media.url} /></div>)}
      <p className={styles.hint}>Saved for {senderName} to see in My Creations.</p><div className={styles.actions}>{config?.allowMultiple && <button type="button" className={styles.primary} disabled={busy} onClick={() => { setSaved(null); clearDraft(); }}>Write another note</button>}<button type="button" className={styles.secondary} disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}><Trash2 size={14} aria-hidden="true" />Delete this note</button></div>
      {confirmDelete && <div className={styles.status}><p>Delete this note and its attachments? Copies already downloaded cannot be removed.</p><div className={styles.actions}><button type="button" className={styles.primary} disabled={busy} onClick={() => void removeSaved()}>{busy ? "Deleting…" : "Yes, delete note"}</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => setConfirmDelete(false)}>Keep note</button></div></div>}
    </> : <><p className={styles.hint}>{config?.prompt || "A photo, a few words, or the sound of your voice."}</p><fieldset className={note.fields} disabled={busy}>
      <div className={note.reactions} role="group" aria-label="Quick reactions">{(config?.quickReactions || ["❤️", "🥰", "✨"]).map(emoji => <button type="button" key={emoji} aria-label={`React ${emoji}`} aria-pressed={reaction === emoji} onClick={() => setReaction(reaction === emoji ? null : emoji)}>{emoji}</button>)}</div>
      <label className={styles.field}>Your name<input maxLength={100} value={author} onChange={event => setAuthor(event.target.value)} /></label>
      {formats.text && <label className={styles.field}>Your message<textarea value={message} maxLength={maxChars} onChange={event => setMessage(event.target.value)} rows={3} /><small className={styles.hint}>{message.length} / {maxChars}</small></label>}
      {formats.photo && <><input ref={picker} type="file" accept={PHOTO_TYPES.join(",")} multiple hidden aria-label="Choose photos" onChange={event => {
        const files = Array.from(event.target.files || []); event.target.value = "";
        if (files.some(file => !PHOTO_TYPES.includes(file.type) || !file.size || file.size > REPLY_FILE_LIMIT)) { setError("Choose JPG, PNG, WebP, or GIF photos up to 25 MB each."); return; }
        if (files.length + photos.length > maxPhotos) { setError(`You can attach up to ${maxPhotos} photos.`); return; }
        const added = files.map(file => ({ id: crypto.randomUUID(), file, preview: objectUrl(file) }));
        setPhotos(previous => [...previous, ...added]); setError("");
      }} /><div className={note.photos}>{photos.map((photo, index) => <div key={photo.id}><img src={photo.preview} alt={`Attached photo ${index + 1}`} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => { revoke(photo.preview); discardUpload(photo.id); setPhotos(previous => previous.filter(value => value.id !== photo.id)); }}>×</button></div>)}</div><div className={styles.actions}><button type="button" className={styles.secondary} disabled={photos.length >= maxPhotos} onClick={() => picker.current?.click()}><Camera size={15} aria-hidden="true" />Add photos ({photos.length}/{maxPhotos})</button></div></>}
      {formats.voice && <div className={note.voice}>{voice ? <><p>Voice note · {Math.ceil(voice.duration)} seconds</p><audio controls src={voice.url} /><button type="button" className={styles.secondary} onClick={() => { revoke(voice.url); discardUpload("voice"); setVoice(null); setSeconds(0); }}>Discard recording</button></> : <div className={styles.actions}><button type="button" className={styles.secondary} disabled={requestingMic} onClick={() => recording ? stop() : void start()}>{recording ? <Square size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}{recording ? `Stop recording (${seconds}/${maxVoice}s)` : requestingMic ? "Waiting for microphone…" : `Record voice note · up to ${maxVoice}s`}</button></div>}</div>}
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy || recording || requestingMic} onClick={() => void submit()}><Send size={15} aria-hidden="true" />{busy ? progress : `Send note to ${senderName}`}</button></div>
    </fieldset></>}
    {error && !loadFailed && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
