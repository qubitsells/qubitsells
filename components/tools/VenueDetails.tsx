import { ExternalLink, MapPin, Video } from "lucide-react";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { venueLink } from "@/lib/template-venue";
import type { VenueToolConfig } from "@/lib/supabase/coupleTemplates";
import styles from "./invitation.module.css";

export default function VenueDetails({ venue, palette }: { venue: VenueToolConfig; palette: InvitationPalette }) {
  if (!venue.enabled) return null;
  const link = venueLink(venue.format === "online" ? venue.meetingUrl : venue.reservationUrl);
  return <section className={styles.root} style={invitationStyle(palette)} aria-label="Date Venue & Format"><div className={styles.heading}><p className={styles.eyebrow}>Date Venue &amp; Format</p><span className={styles.badge}>{venue.format === "online" ? <Video size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}{venue.format === "online" ? "Online" : "In person"}</span></div><h2 className={styles.title}>{venue.location}</h2>{link && <div className={styles.details}><a href={link} target="_blank" rel="noopener noreferrer">{venue.format === "online" ? "Join the online date" : "View venue details"}<ExternalLink size={13} aria-hidden="true" /></a></div>}</section>;
}
