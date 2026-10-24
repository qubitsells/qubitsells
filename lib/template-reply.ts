import type { TemplateReply } from "./supabase/coupleTemplates";
export function replyMediaUrl(value: string, code: string) {
  if (!value.startsWith("/api/media/")) return value;
  const url = new URL(value, "https://media.invalid"); url.searchParams.set("template", code); return url.pathname + url.search;
}
export function replyReceipt(reply: TemplateReply, code: string): TemplateReply {
  return { ...reply, media_items: (reply.media_items || []).map(media => ({ ...media, url: replyMediaUrl(media.url, code) })) };
}
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const REPLY_FILE_LIMIT = 25 * 1024 * 1024;
// Used only by microphone event handlers, never to produce rendered content.
export function recordingTime() { return performance.now(); }
export function recordingExtension(mime: string) { return mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm"; }
