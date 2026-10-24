"use client";
/* eslint-disable @next/next/no-img-element -- Private option images use their authorized media URLs. */
import { useId, useState } from "react";
import { Check } from "lucide-react";
import type { PollToolConfig, TemplatePoll } from "@/lib/supabase/coupleTemplates";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { activityPalette } from "@/lib/template-activities";
import { replyMediaUrl } from "@/lib/template-reply";
import { useTemplateTool } from "./useTemplateTool";
import styles from "./invitation.module.css";
import activity from "./activity.module.css";

type Props = { templateCode: string; manageToken?: string | null; partnerName?: string; senderName?: string; config?: PollToolConfig; palette?: Partial<InvitationPalette>; onCreateDateFromChoice?: (text: string) => void };
type PollData = { poll: TemplatePoll | null; is_creator: boolean; is_partner: boolean; is_closed: boolean; my_votes: string[] };
export function PollTool({ templateCode, manageToken, partnerName = "Your partner", senderName = "The sender", config, palette, onCreateDateFromChoice }: Props) {
  const resource = useTemplateTool<PollData>(templateCode, "poll", manageToken, true);
  const [selection, setSelection] = useState<string[] | null>(null), [suggestion, setSuggestion] = useState("");
  const group = useId(), poll = resource.data?.poll;
  const selected = selection || resource.data?.my_votes || [];
  if (config?.enabled === false) return null;
  const options = poll ? [...poll.options, ...(poll.custom_suggestions || []).filter(entry => !poll.options.some(option => option.id === entry.id))] : [];
  const resolved = options.find(option => option.id === poll?.resolved_option_id);
  const closed = resource.data?.is_closed || poll?.status === "closed";
  const creator = !!resource.data?.is_creator;
  const preparedCreator = creator && !!poll?.sender_prepared;
  const submit = async () => {
    if (!poll) return;
    const result = await resource.write({ expected_revision: poll.revision, selected_option_ids: selected, custom_suggestion_text: suggestion.trim() || undefined, is_creator_vote: creator });
    if (result) { setSelection(null); setSuggestion(""); }
  };
  return <section id="poll_t04" aria-label="Vibe Check & Poll" className={`${styles.root} ${activity.root}`} style={invitationStyle(activityPalette(palette))}>
    <div className={styles.heading}><p className={styles.eyebrow}>Vibe Check &amp; Poll</p>{poll && <span className={styles.badge}>{closed ? "Voting closed" : poll.selection_mode === "both_vote" ? "Both choose" : `${partnerName} chooses`}</span>}</div>
    {resource.loading ? <p className={styles.hint} role="status">Loading your choices…</p> : poll ? <>
      <h2 className={styles.title}>{poll.question}</h2>{preparedCreator && <p className={styles.hint}>Your side was completed during setup. The receiver’s choice will appear here.</p>}{poll.description && <p className={activity.intro}>{poll.description}</p>}
      {resolved && <div className={styles.status}><h3><Check size={16} aria-hidden="true" /> {poll.selection_mode === "partner_chooses" ? "The chosen idea" : "A shared choice"}</h3><p>{resolved.text}</p><p className={styles.hint}>An idea to plan together. Confirm its date and time in your invitation.</p>{onCreateDateFromChoice && <button type="button" className={styles.secondary} onClick={() => onCreateDateFromChoice(resolved.text)}>Plan this idea</button>}</div>}
      {poll.selection_mode === "both_vote" && poll.creator_voted && poll.partner_voted && !resolved && <div className={styles.status}><h3>Two different ideas.</h3><p>{poll.sender_prepared ? "Your choices are different. Talk it through and agree on an idea." : "You can change your choices to find a match."}{creator ? " You can also choose an agreed idea below." : ` Talk it through with ${senderName}.`}</p></div>}
      <fieldset className={activity.choices} disabled={resource.busy || !!closed || preparedCreator || (creator && poll.selection_mode === "partner_chooses")}><legend>{preparedCreator ? "Your saved choice." : poll.allow_multiple ? "Check every idea you like." : "Choose one idea."}</legend><div className={styles.options}>{options.map(option => <label key={option.id} className={styles.option}><input type={poll.allow_multiple ? "checkbox" : "radio"} name={group} checked={selected.includes(option.id)} onChange={() => setSelection(poll.allow_multiple ? selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id] : [option.id])} /><span>{"image_url" in option && option.image_url && <img className={activity.choiceImage} src={replyMediaUrl(option.image_url, templateCode)} alt="" />}{"icon" in option && option.icon && <span aria-hidden="true">{option.icon}</span>}{option.text}<small>{poll.creator_votes.includes(option.id) ? `${senderName} picked this. ` : ""}{poll.partner_votes.includes(option.id) ? `${partnerName} picked this.` : ""}{"suggested_by" in option ? ` Suggested by ${option.suggested_by === "creator" ? senderName : partnerName}.` : ""}</small></span></label>)}</div></fieldset>
      {!closed && !preparedCreator && !(creator && poll.selection_mode === "partner_chooses") && <>
        {poll.allow_custom_suggestion && <label className={styles.field}>Another idea (optional)<input value={suggestion} maxLength={200} disabled={resource.busy} onChange={event => setSuggestion(event.target.value)} placeholder="Something you would both enjoy" /></label>}
        <div className={styles.actions}><button type="button" className={styles.primary} disabled={resource.busy || (!selected.length && !suggestion.trim())} onClick={() => void submit()}>{resource.busy ? "Saving…" : resource.data?.my_votes.length ? "Update my choices" : "Send my choices"}</button></div>
      </>}
      {!!resource.data?.my_votes.length && <p className={styles.hint} role="status">Your choices are saved.</p>}
      {creator && poll.selection_mode === "both_vote" && poll.creator_voted && poll.partner_voted && !resolved && !closed && <div className={styles.actions}>{options.filter(option => poll.creator_votes.includes(option.id) || poll.partner_votes.includes(option.id)).map(option => <button key={option.id} type="button" disabled={resource.busy} className={styles.secondary} onClick={() => void resource.write({ agreed_option_id: option.id }, "PATCH")}>Agree on {option.text}</button>)}</div>}
    </> : !resource.error && <p className={styles.hint}>This activity is not available.</p>}
    {resource.error && <div className={`${styles.error} ${activity.error}`} role="alert"><p>{resource.error}</p><button type="button" className={styles.secondary} disabled={resource.busy} onClick={() => { resource.clearError(); void resource.reload(); }}>Refresh activity</button></div>}
  </section>;
}
