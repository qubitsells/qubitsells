"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, MapPin, Video } from "lucide-react";
import type { InvitationToolConfig, TemplateInvitation } from "@/lib/supabase/coupleTemplates";
import { invitationCalendar, invitationDate, invitationLocalInstant, invitationStyle, validInvitationInstant, validInvitationDate, type DateActivity, type InvitationPalette } from "@/lib/invitation";
import styles from "./invitation.module.css";
import { venueLink } from "@/lib/template-venue";

interface Props {
  templateCode: string; partnerName: string; senderName: string; config?: InvitationToolConfig;
  palette: InvitationPalette; activities?: readonly DateActivity[];
  onStatusChanged?: (invitation: TemplateInvitation) => void;
}
const COMMON_ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"];
const responseTitles: Record<string, string> = { proposed: "Your invitation", awaiting_confirmation: "Availability sent. Waiting for confirmation.", confirmed: "It’s a date.", counterproposed: "Alternative sent. Waiting for confirmation.", declined: "Invitation declined.", deferred: "You can decide later.", cancelled: "This invitation was cancelled." };

export function InvitationTool({ templateCode, partnerName, senderName, config, palette, activities = [], onStatusChanged }: Props) {
  const [invitation, setInvitation] = useState<TemplateInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zone, setZone] = useState("UTC");
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [idea, setIdea] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [counter, setCounter] = useState(false);
  const [counterDay, setCounterDay] = useState("");
  const [counterTime, setCounterTime] = useState("19:00");
  const [counterLabel, setCounterLabel] = useState("");

  const apply = useCallback((value: TemplateInvitation) => {
    setInvitation(value);
    setSlotIds(value.available_slots?.map(slot => slot.id) || (value.selected_slot ? [value.selected_slot.id] : []));
    setChoices(value.recipient_activities || []);
    setIdea(value.recipient_idea || "");
    setNote(value.recipient_note || "");
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation`, { cache: "no-store", signal });
    const value = await response.json();
    if (!response.ok || !value.success || !value.invitation) throw Error(value.error || "The invitation is unavailable. Try refreshing the details.");
    return value.invitation as TemplateInvitation;
  }, [templateCode]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(value => { if (!controller.signal.aborted) { apply(value); setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); } }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the invitation."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, apply]);
  // Keep a waiting receiver up to date when the sender confirms a date.
  useEffect(() => {
    if (!invitation || busy || editing || ["proposed", "deferred", "cancelled"].includes(invitation.status)) return;
    const controller = new AbortController();
    const refresh = () => { if (!document.hidden) void load(controller.signal).then(apply).catch(() => { /* Keep the last saved response during a temporary outage. */ }); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [invitation, busy, editing, load, apply]);

  const respond = async (responseType: "availability" | "counterproposed" | "declined" | "decide_later") => {
    if (!invitation || busy) return;
    setBusy(true); setError("");
    try {
      if (responseType === "availability" && !slotIds.length) throw Error("Check at least one date that works for you.");
      const suggested = responseType === "counterproposed" ? { id: `counter_${crypto.randomUUID()}`, start_time: invitation.date_mode === "date_only" ? counterDay : invitationLocalInstant(`${counterDay}T${counterTime}`, zone), label: counterLabel.trim() || "Suggested alternative" } : undefined;
      if (suggested && invitation.date_mode === "date_only" && !validInvitationDate(counterDay)) throw Error("Choose a valid alternative date.");
      const response = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: invitation.revision, response_type: responseType, available_slot_ids: slotIds, suggested_slot: suggested, partner_tz: zone, partner_note_text: note.trim(), activity_choices: choices, alternative_idea: idea.trim() }) });
      const value = await response.json();
      if (response.status === 409) { apply(await load()); setEditing(false); setCounter(false); throw Error("The sender updated this invitation. Review the latest dates and send your response again."); }
      if (!response.ok || !value.success) throw Error(value.error || "Your response could not be saved. Please try again.");
      if (value.invitation) { apply(value.invitation); onStatusChanged?.(value.invitation); }
      else { apply(await load()); }
      setEditing(false); setCounter(false);
      window.dispatchEvent(new Event("qubitsells-notifications-updated"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your response could not be saved."); }
    finally { setBusy(false); }
  };
  const download = () => {
    if (!invitation?.selected_slot) return;
    try {
      const url = URL.createObjectURL(new Blob([invitationCalendar(invitation, invitation.selected_slot)], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "qubitsells-date.ics"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the calendar file."); }
  };
  const style = invitationStyle(palette);
  if (config?.enabled === false) return null;
  if (!invitation) return <section id="invitation_t02" className={styles.root} style={style} aria-label="Date Night & RSVP"><p role={error ? "alert" : "status"}>{loading ? "Loading your invitation…" : error}</p>{!loading && <button type="button" className={styles.secondary} onClick={() => { setLoading(true); setError(""); void load().then(apply).catch(reason => setError(reason.message)).finally(() => setLoading(false)); }}>Try again</button>}</section>;
  const dateOnly = invitation.date_mode === "date_only";
  const editable = invitation.status !== "cancelled" && (editing || invitation.status === "proposed" || invitation.status === "deferred");
  const zones = [...new Set([zone, invitation.sender_timezone, ...COMMON_ZONES])];
  const describe = (value: string) => invitationDate(value, zone, dateOnly);
  const meeting = venueLink(invitation.meeting_url), reservation = venueLink(invitation.reservation_url);
  return <section id="invitation_t02" className={styles.root} style={style} aria-label="Date Night & RSVP">
    <div className={styles.heading}><p className={styles.eyebrow}>Date Night &amp; RSVP</p><span className={styles.badge}>{invitation.format === "online" ? <Video size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}{invitation.format === "online" ? "An online date" : "Together, in person"}</span></div>
    <h2 className={styles.title}>{invitation.activity}</h2>
    <p className={styles.message}>{invitation.invitation_message || `${partnerName}, a little time together?`}</p>
    <div className={styles.details}>
      {invitation.location && <span><MapPin size={14} aria-hidden="true" />{invitation.location}</span>}
      {!dateOnly && <span><Clock3 size={14} aria-hidden="true" />{invitation.duration_minutes} minutes</span>}
      {meeting && <a href={meeting} target="_blank" rel="noopener noreferrer">Join the online date <ExternalLink size={12} aria-hidden="true" /></a>}
      {reservation && <a href={reservation} target="_blank" rel="noopener noreferrer">Venue details <ExternalLink size={12} aria-hidden="true" /></a>}
      {invitation.deadline && <span>Reply by {invitationDate(invitation.deadline, zone)}</span>}
    </div>
    {!dateOnly && <label className={styles.zone}>Show dates and suggest times in<select aria-label="Your time zone" value={zone} onChange={event => setZone(event.target.value)} disabled={busy}>{zones.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>}
    {invitation.recipient_response && !editing && <div className={styles.status} role="status"><h3>{responseTitles[invitation.status]}</h3>
      <p>{invitation.status === "confirmed" ? `Your date with ${senderName} is confirmed.` : invitation.status === "counterproposed" || invitation.status === "awaiting_confirmation" ? `${senderName} will choose and confirm one date. Nothing is booked yet.` : invitation.status === "deferred" ? "Your reply has been saved. Come back when you know what works." : "Your reply has been saved."}</p>
      {invitation.status === "awaiting_confirmation" && <ul>{invitation.available_slots?.map(slot => <li key={slot.id}>{slot.label} · {describe(slot.start_time)}</li>)}</ul>}
      {invitation.selected_slot && <p><strong>{invitation.selected_slot.label}</strong><br />{describe(invitation.selected_slot.start_time)}</p>}
      {invitation.status === "counterproposed" && invitation.counterproposal_slot && <p><strong>{invitation.counterproposal_slot.label}</strong><br />{describe(invitation.counterproposal_slot.start_time)}</p>}
      {!!invitation.recipient_activities?.length && <ul>{invitation.recipient_activities.map(choice => <li key={choice}>{choice}</li>)}</ul>}
      {invitation.recipient_idea && <p>Alternative idea: {invitation.recipient_idea}</p>}{invitation.recipient_note && <p>Your note: {invitation.recipient_note}</p>}
      {invitation.status === "confirmed" && invitation.selected_slot && (dateOnly ? validInvitationDate(invitation.selected_slot.start_time.slice(0, 10)) : validInvitationInstant(invitation.selected_slot.start_time)) && <div className={styles.actions}><button type="button" className={styles.primary} onClick={download}><CalendarDays size={15} aria-hidden="true" />Add to calendar</button></div>}
    </div>}
    {invitation.status === "cancelled" ? <p className={styles.hint}>The sender cancelled this invitation. It can no longer receive a response.</p> : !editable ? <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setEditing(true)}>Change my response</button></div> : <fieldset className={styles.fieldset} disabled={busy}>
      <legend className={styles.eyebrow}>Make a little time for each other</legend>
      {activities.length > 0 && <fieldset className={styles.fieldset}><legend>What sounds good to you?</legend><p className={styles.hint}>Check any activities you like. Check again to deselect.</p><div className={styles.options}>{activities.map(activity => <label className={styles.option} key={activity.id}><input type="checkbox" checked={choices.includes(activity.label)} onChange={event => setChoices(previous => event.target.checked ? [...previous, activity.label] : previous.filter(choice => choice !== activity.label))} /><span>{activity.label}{activity.description && <small>{activity.description}</small>}</span></label>)}</div></fieldset>}
      <label className={styles.field}>Another idea, if you have one<input value={idea} onChange={event => setIdea(event.target.value)} maxLength={500} placeholder="Something you’d love to do together…" /></label>
      <fieldset className={styles.fieldset}><legend>{dateOnly ? "Which dates work for you?" : "Which dates and times work for you?"}</legend><p className={styles.hint}>Check every option that works. Check again to deselect. {senderName} will confirm one date.</p><div className={styles.options}>{invitation.proposed_slots.map(slot => <label className={styles.option} key={slot.id}><input type="checkbox" checked={slotIds.includes(slot.id)} onChange={event => { setSlotIds(previous => event.target.checked ? [...previous, slot.id] : previous.filter(value => value !== slot.id)); setCounter(false); }} /><span>{slot.label || "Offered date"}<small>{describe(slot.start_time)}</small>{slot.end_time && <small>Until {describe(slot.end_time)}</small>}{!dateOnly && zone !== invitation.sender_timezone && <small>{senderName}’s time: {invitationDate(slot.start_time, invitation.sender_timezone)}</small>}</span></label>)}</div></fieldset>
      <label className={styles.field}>A note for {senderName}<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} placeholder="Anything you’d like them to know…" /></label>
      {counter && <div className={styles.status}><h3>Suggest another {dateOnly ? "date" : "time"}</h3><p>Your suggestion stays pending until {senderName} confirms.</p><div className={styles.row}><label className={styles.field}>Date<input type="date" value={counterDay} onChange={event => setCounterDay(event.target.value)} /></label>{!dateOnly && <label className={styles.field}>Time in {zone}<input type="time" value={counterTime} onChange={event => setCounterTime(event.target.value)} /></label>}</div><label className={styles.field}>Label or reason<input value={counterLabel} onChange={event => setCounterLabel(event.target.value)} maxLength={200} /></label><div className={styles.actions}><button type="button" className={styles.primary} disabled={!counterDay || busy} onClick={() => void respond("counterproposed")}>{busy ? "Sending…" : "Send alternative"}</button><button type="button" className={styles.secondary} onClick={() => setCounter(false)}>Keep offered dates</button></div></div>}
      {!counter && <div className={styles.actions}><button type="button" className={styles.primary} disabled={!slotIds.length || busy} onClick={() => void respond("availability")}>{busy ? "Saving…" : "Send my availability"}</button>{invitation.allow_counterproposal && <button type="button" className={styles.secondary} onClick={() => setCounter(true)}>Suggest another time</button>}<button type="button" className={styles.secondary} onClick={() => void respond("decide_later")}>Decide later</button><button type="button" className={styles.secondary} onClick={() => void respond("declined")}>Decline</button></div>}
    </fieldset>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
