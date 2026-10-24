import { venueLink } from "./template-venue";
import { replyMediaUrl } from "./template-reply";
import { validInvitationDate } from "./invitation";
export function surpriseMediaUrl(value: string | undefined, code: string) {
  if (!value) return "";
  if (/^\/api\/media\/[0-9a-f-]{36}(?:\?|$)/i.test(value)) return replyMediaUrl(value, code);
  return venueLink(value);
}
export function preferredCouponInstant(local: string) {
  if (!local) return undefined;
  const date = new Date(local);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !validInvitationDate(local.slice(0,10)) || !Number.isFinite(date.getTime())) throw Error("Choose a valid preferred date and time.");
  return date.toISOString();
}
export function openGiftReply() {
  const inline = document.querySelector('section[aria-label="Voice & Photo Notes"]');
  if (inline) { inline.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
  const trigger = [...document.querySelectorAll("button")].find(button => ["Leave Note", "Leave Love Note"].includes(button.textContent?.trim() || ""));
  trigger?.click();
}
