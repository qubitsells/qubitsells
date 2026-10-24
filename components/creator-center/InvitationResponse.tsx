"use client";

import { useState } from "react";
import { CalendarCheck, Check } from "lucide-react";
import type { CreatorTemplateItem, InvitationSlot, TemplateInvitation } from "@/lib/supabase/coupleTemplates";
import { invitationDate } from "@/lib/invitation";
import styles from "./creator-center.module.css";
import { venueLink } from "@/lib/template-venue";

export default function InvitationResponse({ item, onUpdated }: { item: CreatorTemplateItem; onUpdated?: () => void }) {
  const original = item.invitation;
  const [local, setLocal] = useState<{ source: typeof original; value: typeof original } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const invitation = local && local.source === original ? local.value : original;
  if (!invitation) return null;
  const zone = invitation.recipient_timezone || invitation.sender_timezone || "UTC";
  const dateOnly = invitation.date_mode === "date_only";
  const available = new Set(invitation.available_slots?.map(slot => slot.id) || []);
  const options = invitation.proposed_slots?.length ? invitation.proposed_slots : invitation.available_slots || [];
  const slotText = (slot: InvitationSlot) => invitationDate(slot.start_time, zone, dateOnly);
  const slot = (label: string, value?: InvitationSlot | null) => value ? <div className={styles.receiverSlot}><CalendarCheck size={17} aria-hidden="true" /><div><p>{label}</p><strong>{slotText(value)}{value.end_time && <> – {invitationDate(value.end_time, zone, dateOnly)}</>}</strong>{value.label && <span>{value.label}</span>}<small>{dateOnly ? "Calendar date" : zone}</small></div></div> : null;
  const manage = async (action: "confirm_slot" | "accept_counterproposal", selectedId?: string) => {
    setBusy(selectedId || action); setError("");
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(item.short_code)}/invitation`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(item.manage_token ? { "x-manage-token": item.manage_token } : {}) }, body: JSON.stringify({ action_type: action, selected_slot_id: selectedId, expected_revision: invitation.revision }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) onUpdated?.(); throw Error(data.error || "Could not confirm this date. Please refresh and try again."); }
      const saved: TemplateInvitation | undefined = data.result?.invitation;
      if (saved) setLocal({ source: original, value: { ...invitation, status: saved.status, confirmed_slot: saved.selected_slot, counter_proposal_slot: saved.counterproposal_slot, available_slots: saved.available_slots, recipient_activities: saved.recipient_activities, recipient_idea: saved.recipient_idea, revision: saved.revision, updated_at: saved.updated_at } });
      onUpdated?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not confirm this date."); }
    finally { setBusy(""); }
  };
  return <section className={styles.receiverBlock} aria-label="Date Night & RSVP"><div className={styles.receiverBlockHeading}><span className={styles.receiverBlockIcon} aria-hidden="true"><CalendarCheck size={18} /></span><div><p>Date Night &amp; RSVP</p><h4>{invitation.activity_title}</h4></div><span className={styles.activityStatus}>{invitation.status === "awaiting_confirmation" ? "Needs your confirmation" : invitation.status.replaceAll("_", " ")}</span></div>
    {invitation.sender_message && <div className={styles.receiverNote}><p>Your invitation</p><blockquote>{invitation.sender_message}</blockquote></div>}
    <dl className={styles.receiverFields}>
      <div><dt>Their response</dt><dd>{invitation.partner_response_status === "availability" ? "Available dates submitted" : invitation.partner_response_status?.replaceAll("_", " ") || "Waiting for a response"}</dd></div>
      {invitation.responded_at && <div><dt>Responded</dt><dd>{invitationDate(invitation.responded_at, zone)}</dd></div>}
      <div><dt>Format</dt><dd>{invitation.location_type === "online" ? "Online" : "In person"}</dd></div>
      {invitation.location_detail && <div><dt>Where</dt><dd>{invitation.location_detail}</dd></div>}
      {!dateOnly && !!invitation.duration_minutes && <div><dt>Duration</dt><dd>{invitation.duration_minutes} minutes</dd></div>}
      {invitation.sender_timezone && <div><dt>Your time zone</dt><dd>{invitation.sender_timezone}</dd></div>}
      {invitation.recipient_timezone && <div><dt>Receiver’s time zone</dt><dd>{invitation.recipient_timezone}</dd></div>}
      {invitation.response_deadline && <div><dt>Reply deadline</dt><dd>{invitationDate(invitation.response_deadline, zone)}</dd></div>}
      {venueLink(invitation.meeting_url) && <div><dt>Online meeting</dt><dd><a href={venueLink(invitation.meeting_url)} target="_blank" rel="noopener noreferrer">Open meeting link ↗</a></dd></div>}
      {venueLink(invitation.reservation_url) && <div><dt>Venue</dt><dd><a href={venueLink(invitation.reservation_url)} target="_blank" rel="noopener noreferrer">Open venue details ↗</a></dd></div>}
    </dl>
    {!!invitation.recipient_activities?.length && <div className={styles.receiverNote}><p>Activities they checked</p><ul className={styles.rsvpActivities}>{invitation.recipient_activities.map(choice => <li key={choice}><Check size={13} aria-hidden="true" />{choice}</li>)}</ul></div>}
    {invitation.recipient_idea && <div className={styles.receiverNote}><p>Their alternative idea</p><blockquote>{invitation.recipient_idea}</blockquote></div>}
    {invitation.partner_counter_note && <div className={styles.receiverNote}><p>{item.partner_name}’s note</p><blockquote>{invitation.partner_counter_note}</blockquote></div>}
    {options.length > 0 && <div className={styles.receiverNote}><p>Offered dates · {invitation.partner_response_status === "availability" ? "checked and unchecked" : "their availability"}</p><div className={styles.receiverChoices}>{options.map(option => { const checked = available.has(option.id); return <div key={option.id} className={`${styles.receiverChoice} ${checked ? styles.receiverChoiceSelected : ""}`}><span className={styles.rsvpMarker} aria-label={checked ? "Checked" : "Not checked"}>{checked && <Check size={13} aria-hidden="true" />}</span><div><p>{option.label || "Offered date"}</p><div className={styles.choiceLabels}><span>{slotText(option)}</span><span>{checked ? `Works for ${item.partner_name}` : invitation.partner_response_status === "availability" ? "Not selected" : "No availability submitted"}</span></div>{checked && invitation.status === "awaiting_confirmation" && <button type="button" className={styles.confirmDate} disabled={!!busy} onClick={() => void manage("confirm_slot", option.id)}>{busy === option.id ? "Confirming…" : "Confirm this date"}</button>}</div></div>; })}</div></div>}
    {invitation.status === "awaiting_confirmation" && <p className={styles.rsvpPending}>Your confirmation is needed. Choose one of {item.partner_name}’s checked dates above. No date is confirmed yet.</p>}
    {slot("Confirmed date", invitation.confirmed_slot)}
    {slot("Their suggested alternative", invitation.status === "confirmed" ? null : invitation.counter_proposal_slot)}
    {invitation.status === "counterproposed" && <button type="button" className={styles.confirmDate} disabled={!!busy} onClick={() => void manage("accept_counterproposal")}>{busy ? "Confirming…" : "Confirm their alternative"}</button>}
    {!invitation.partner_response_status && !invitation.responded_at && <p className={styles.receiverWaiting}>The invitation is waiting for a response.</p>}
    {error && <p className={styles.rsvpPending} role="alert">{error}</p>}
  </section>;
}
