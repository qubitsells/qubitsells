"use client";
import { useEffect, useRef, useState } from "react";
import { PHOTO_TYPES, REPLY_FILE_LIMIT } from "@/lib/template-reply";
type Upload = { url: string; public_id: string };
export function useMemoryPhoto() {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const cached = useRef<Upload | null>(null);
  const discard = () => { const value = cached.current; cached.current = null; if (value) void fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [value.url] }) }).catch(() => {}); };
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => () => { const value = cached.current; if (value) void fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [value.url] }), keepalive: true }).catch(() => {}); }, []);
  const choose = (next: File | null) => { if (next && (!PHOTO_TYPES.includes(next.type) || next.size > REPLY_FILE_LIMIT || !next.size)) throw Error("Choose a JPEG, PNG, WebP, or GIF photo up to 25 MB."); discard(); setFile(next); setPreview(""); };
  const upload = async () => { if (!file) return null; if (cached.current) return cached.current; const body = new FormData(); body.append("file", file); body.append("folder", "bonded/template_replies"); const response = await fetch("/api/upload", { method: "POST", body }); const value = await response.json(); if (!response.ok || !value.success) throw Error(value.error || "Your photo could not be uploaded. Try again."); cached.current = value; return value as Upload; };
  const commit = () => { cached.current = null; setFile(null); setPreview(""); };
  return { file, preview, choose, upload, commit };
}
