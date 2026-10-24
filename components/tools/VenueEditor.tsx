"use client";
import { useId } from "react";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import type { InvitationFormat } from "@/lib/supabase/coupleTemplates";
import styles from "./invitation.module.css";

type Props = { format: InvitationFormat; onFormat: (value: InvitationFormat) => void; location: string; onLocation: (value: string) => void; meetingUrl: string; onMeetingUrl: (value: string) => void; reservationUrl: string; onReservationUrl: (value: string) => void; palette: InvitationPalette };
export default function VenueEditor(props: Props) {
  const group = useId();
  return <div className={`${styles.root} ${styles.editor}`} style={invitationStyle(props.palette)} aria-label="Date Venue & Format settings">
    <fieldset className={styles.venueFormats}><legend>Date format</legend>{([['in_person', 'In person'], ['online', 'Online']] as const).map(([value, label]) => <label key={value} className={styles.option}><input type="radio" name={group} checked={props.format === value} onChange={() => props.onFormat(value)} /><span>{label}</span></label>)}</fieldset>
    <label className={styles.field}>{props.format === "online" ? "Platform or meeting place" : "Venue or meeting place"}<input required value={props.location} maxLength={300} onChange={event => props.onLocation(event.target.value)} placeholder={props.format === "online" ? "Zoom, FaceTime, or a watch party" : "Cafe name or meeting spot"} /></label>
    {props.format === "online" ? <label className={styles.field}>Meeting link (optional)<input type="url" inputMode="url" value={props.meetingUrl} maxLength={1000} onChange={event => props.onMeetingUrl(event.target.value)} placeholder="https://…" /></label> : <label className={styles.field}>Venue or reservation link (optional)<input type="url" inputMode="url" value={props.reservationUrl} maxLength={1000} onChange={event => props.onReservationUrl(event.target.value)} placeholder="https://…" /></label>}
  </div>;
}
