"use client";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole, Check } from "lucide-react";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { activityPalette, revealQuestions } from "@/lib/template-activities";
import type { RevealToolConfig, TemplatePrivateReveal } from "@/lib/supabase/coupleTemplates";
import { useActivityDraft, useTemplateTool } from "./useTemplateTool";
import styles from "./invitation.module.css";
import activity from "./activity.module.css";
type Props = { templateCode: string; manageToken?: string | null; partnerName?: string; senderName?: string; config?: RevealToolConfig; palette?: Partial<InvitationPalette> };
type Data = { reveal: TemplatePrivateReveal | null; is_creator: boolean; is_partner: boolean };
export function PrivateRevealTool({ templateCode, manageToken, partnerName = "Your partner", senderName = "The sender", config, palette }: Props) {
  const resource = useTemplateTool<Data>(templateCode, "reveal", manageToken, true);
  const reveal = resource.data?.reveal, creator = !!resource.data?.is_creator;
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const starting = useRef(false);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const begin = () => {
    if (!reveal?.is_eligible || starting.current) return;
    starting.current = true; let count = reveal.countdown_seconds || 3; setCountdown(count);
    timer.current = setInterval(() => {
      count--; setCountdown(count);
      if (count <= 0) { if (timer.current) clearInterval(timer.current); timer.current = null; void resource.write({ action: "confirm", expected_revision: reveal.revision, is_creator: creator }).finally(() => { starting.current = false; setCountdown(null); }); }
    }, 1000);
  };
  if (config?.enabled === false) return null;
  const questions = reveal ? revealQuestions(reveal.prompt, reveal.questions) : [];
  const myLocked = creator ? reveal?.creator_locked : reveal?.partner_locked, otherLocked = creator ? reveal?.partner_locked : reveal?.creator_locked;
  const other = creator ? partnerName : senderName;
  return <section id="reveal_t06" aria-label="Synchronized Secret" className={`${styles.root} ${activity.root}`} style={invitationStyle(activityPalette(palette))}>
    <div className={styles.heading}><p className={styles.eyebrow}>Synchronized Secret</p>{reveal && <span className={styles.badge}>{reveal.is_revealed ? "Revealed together" : reveal.status === "cancelled" ? "Cancelled" : myLocked ? "Your answer is locked" : "Just between you"}</span>}</div>
    {resource.loading ? <p className={styles.hint} role="status">Opening your private space…</p> : reveal ? <>
      <h2 className={styles.title}>{reveal.prompt}</h2>{reveal.description && <p className={activity.intro}>{reveal.description}</p>}
      {reveal.status === "cancelled" ? <p className={styles.hint}>This reveal round has been cancelled.</p> : reveal.is_revealed ? <><div className={styles.status}><h3>Both sides of the secret.</h3>{reveal.revealed_at && <p><time dateTime={reveal.revealed_at}>{new Date(reveal.revealed_at).toLocaleString()}</time></p>}</div>{questions.map(question => <div className={activity.answer} key={question.id}><h4>{question.prompt}</h4><small>Your answer</small><blockquote>{reveal.my_answer?.[question.id] || "No answer available."}</blockquote><small>{other}’s answer</small><blockquote>{reveal.partner_answer?.[question.id] || "No answer available."}</blockquote></div>)}</> : <>
        <div className={activity.lockStatus}><div>{myLocked ? <Check size={17} /> : <LockKeyhole size={17} />}<span><strong>You</strong><small>{myLocked ? "Answer locked" : "Still writing"}</small></span></div><div>{otherLocked ? <Check size={17} /> : <LockKeyhole size={17} />}<span><strong>{other}</strong><small>{otherLocked ? "Answer locked" : "Still writing"}</small></span></div></div>
        {myLocked ? <><p className={activity.intro}>{creator && reveal.sender_prepared ? "Your answer was locked during setup. Their answer will appear after they complete the reveal." : reveal.is_eligible ? "You have both locked your answers. Open the secret when you’re ready." : `Your words stay private while ${other} writes. This page checks for updates automatically.`}</p>{questions.map(question => <div className={activity.answer} key={question.id}><h4>{question.prompt}</h4><small>Your locked answer</small><blockquote>{reveal.my_answer?.[question.id]}</blockquote></div>)}{countdown !== null && <div className={activity.countdown} role="status" aria-live="polite">{countdown || "Opening…"}</div>}<div className={styles.actions}>{reveal.is_eligible && <button type="button" disabled={resource.busy || countdown !== null} className={styles.primary} onClick={begin}>Reveal our answers</button>}{!(creator && reveal.sender_prepared) && <button type="button" disabled={resource.busy || countdown !== null} className={styles.secondary} onClick={() => void resource.write({ action: "withdraw", expected_revision: reveal.revision, is_creator: creator })}>Withdraw to edit</button>}</div></> : <SecretForm key={`${reveal.id}:${reveal.revision}`} reveal={reveal} creator={creator} busy={resource.busy} write={resource.write} />}
      </>}
    </> : !resource.error && <p className={styles.hint}>This activity is not available.</p>}
    {resource.error && <div className={styles.error} role="alert"><p>{resource.error}</p><button type="button" className={styles.secondary} disabled={resource.busy} onClick={() => { resource.clearError(); void resource.reload(); }}>Refresh secret</button></div>}
  </section>;
}
function SecretForm({ reveal, creator, busy, write }: { reveal: TemplatePrivateReveal; creator: boolean; busy: boolean; write: (body: unknown, method?: string, refresh?: boolean) => Promise<unknown> }) {
  const [answers, setAnswers] = useState<Record<string, string>>(reveal.my_draft || {});
  const questions = revealQuestions(reveal.prompt, reveal.questions);
  const draft = useActivityDraft(answers, value => write({ action: "draft", expected_revision: reveal.revision, answers: value, is_creator: creator }, "POST", false));
  return <><p className={activity.intro}>Write independently. Answers stay private until you both lock them and the reveal is opened.</p><fieldset className={activity.choices} disabled={busy}>{questions.map(question => <label className={styles.field} key={question.id}>{question.prompt}<textarea rows={3} maxLength={2000} value={answers[question.id] || ""} onChange={event => { const value = event.target.value; draft.changed(); setAnswers(previous => ({ ...previous, [question.id]: value })); }} /></label>)}</fieldset><p className={styles.hint} role="status">{draft.status || "Only you can see your draft."}</p><div className={styles.actions}><button type="button" disabled={busy || !questions.every(question => answers[question.id]?.trim())} className={styles.primary} onClick={() => { draft.cancel(); void write({ action: "lock", expected_revision: reveal.revision, answers, is_creator: creator }); }}>Lock my answer{questions.length > 1 ? "s" : ""}</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => void draft.save()}>Save draft</button></div></>;
}
