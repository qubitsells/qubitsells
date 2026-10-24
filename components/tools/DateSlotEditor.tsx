"use client";

import { useState, useSyncExternalStore } from "react";
import { invitationDate, invitationLocalInstant, invitationStyle, type InvitationPalette } from "@/lib/invitation";
import type { InvitationSlot } from "@/lib/supabase/coupleTemplates";
import styles from "./invitation.module.css";
const subscribe = () => () => {};
const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export default function DateSlotEditor({ value, onChange, palette }: { value: InvitationSlot[]; onChange: (value: InvitationSlot[]) => void; palette: InvitationPalette }) {
  const [local, setLocal] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const zone = useSyncExternalStore(subscribe, deviceZone, () => "UTC");
  const add = () => {
    try {
      if (!label.trim()) throw Error("Enter a label for this date option.");
      const instant = invitationLocalInstant(local, zone);
      if (value.length >= 6) throw Error("You can offer up to six dates.");
      if (value.some(slot => slot.start_time === instant)) throw Error("That date and time is already offered.");
      onChange([...value, { id: crypto.randomUUID(), start_time: instant, label: label.trim() }]);
      setLocal(""); setLabel(""); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Choose a date and time."); }
  };
  return <div className={`${styles.root} ${styles.editor}`} style={invitationStyle(palette)} aria-label="Proposed date options">
    {value.length > 0 && <ul className={styles.slotList}>{value.map(slot => <li key={slot.id}><div><strong>{slot.label}</strong><small>{invitationDate(slot.start_time, zone)}</small></div><button type="button" aria-label={`Remove ${slot.label || "date"}`} onClick={() => onChange(value.filter(entry => entry.id !== slot.id))}>×</button></li>)}</ul>}
    <label className={styles.field}>Date and time<input type="datetime-local" value={local} onChange={event => setLocal(event.target.value)} /></label>
    <label className={styles.field}>Label<input required value={label} onChange={event => setLabel(event.target.value)} maxLength={200} placeholder="Dinner after work" /></label>
    <div className={styles.actions}><button type="button" className={styles.primary} onClick={add} disabled={!local || !label.trim() || value.length >= 6}>Add date option</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
