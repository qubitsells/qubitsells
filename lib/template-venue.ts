import type { InvitationFormat, VenueToolConfig } from "./supabase/coupleTemplates";

export function venueLink(value?: string | null) {
  try { const url = new URL(value || ""); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}

export function buildVenue(format: InvitationFormat, location: string, meetingUrl: string, reservationUrl: string): VenueToolConfig {
  if (!location.trim()) throw Error(format === "online" ? "Add the platform or meeting place for your online date." : "Add a venue or meeting place for your date.");
  const link = (format === "online" ? meetingUrl : reservationUrl).trim();
  if (link && !venueLink(link)) throw Error("Use a complete http or https link for your date venue.");
  return { id: "venue_t03", type: "venue", enabled: true, format, location: location.trim(), ...(format === "online" && link ? { meetingUrl: link } : {}), ...(format === "in_person" && link ? { reservationUrl: link } : {}) };
}
