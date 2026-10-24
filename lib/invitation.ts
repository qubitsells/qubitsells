import type { CSSProperties } from "react";
import type { InvitationSlot, TemplateInvitation } from "./supabase/coupleTemplates";

export type InvitationPalette = { accent: string; text: string; glow?: string; dark?: string; card?: string; surface?: string; background?: string };
export type DateActivity = { id: string; label: string; description?: string };

export function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return !!value; } catch { return false; }
}

export function validInvitationDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function validInvitationInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && validInvitationDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}

// Interpret the input in the displayed zone, rather than the device's zone.
// Reject nonexistent local times during a daylight-saving clock change.
export function invitationLocalInstant(local: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !validTimeZone(timeZone)) throw Error("Choose a valid date, time, and time zone.");
  const desired = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(desired) || new Date(desired).toISOString().slice(0, 16) !== local) throw Error("Choose a valid date and time.");
  const format = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(format.formatToParts(instant).map(part => [part.type, part.value]));
    const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    const correction = desired - represented;
    if (!correction) return new Date(instant).toISOString();
    instant += correction;
  }
  throw Error("That time falls in a daylight-saving clock change. Choose another time.");
}

export function invitationDate(value: string, timeZone = "UTC", dateOnly = false) {
  if (dateOnly) {
    const day = value.slice(0, 10);
    if (!validInvitationDate(day)) return value;
    return new Intl.DateTimeFormat("en", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${day}T12:00:00Z`));
  }
  if (!validInvitationInstant(value)) return value; // Keep legacy labels readable.
  return new Intl.DateTimeFormat("en", { timeZone: validTimeZone(timeZone) ? timeZone : "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

export function invitationStyle(palette: InvitationPalette): CSSProperties {
  const rgb = palette.accent.replace("#", "");
  const channels = [0, 2, 4].map(offset => parseInt(rgb.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return { "--invite-accent": palette.accent, "--invite-text": palette.text, "--invite-card": palette.card || palette.surface || palette.background || "#141019", "--invite-on-accent": luminance > .179 ? "#140e13" : "#fff" } as CSSProperties;
}

export function invitationCalendar(invitation: TemplateInvitation, slot: InvitationSlot) {
  const dateOnly = invitation.date_mode === "date_only";
  if (dateOnly ? !validInvitationDate(slot.start_time.slice(0, 10)) : !validInvitationInstant(slot.start_time)) throw Error("The sender needs to provide an exact date before you can add this to your calendar.");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const utc = (value: Date) => value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = new Date(dateOnly ? `${slot.start_time.slice(0, 10)}T00:00:00Z` : slot.start_time);
  const end = dateOnly ? new Date(start.getTime() + 86400000) : new Date(slot.end_time && validInvitationInstant(slot.end_time) ? slot.end_time : start.getTime() + invitation.duration_minutes * 60000);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QubitSells//Date Night//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:qubitsells-${invitation.id}@qubitsells.com`, `DTSTAMP:${utc(new Date())}`, dateOnly ? `DTSTART;VALUE=DATE:${slot.start_time.slice(0, 10).replaceAll("-", "")}` : `DTSTART:${utc(start)}`, dateOnly ? `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}` : `DTEND:${utc(end)}`, `SUMMARY:${escape(invitation.activity)}`, `DESCRIPTION:${escape([invitation.invitation_message, ...(invitation.recipient_activities || []), invitation.recipient_idea || "", invitation.recipient_note || ""].filter(Boolean).join("\n"))}`, `LOCATION:${escape(invitation.format === "online" ? invitation.meeting_url || "Online" : invitation.location || "")}`, "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR", ""].map(line => {
    let folded = "", bytes = 0;
    for (const character of line) { const size = new TextEncoder().encode(character).length; if (bytes + size > 73) { folded += "\r\n "; bytes = 1; } folded += character; bytes += size; }
    return folded;
  }).join("\r\n");
}
