"use client";

import type { ReactNode } from "react";
import { BookOpen, CalendarCheck, Check, Clock3, Compass, Gift, HelpCircle, LockKeyhole, Mail } from "lucide-react";
import { InlineMediaGallery } from "@/components/MediaViewer";
import type { CreatorTemplateItem, InvitationSlot, QuestionAnswerItem } from "@/lib/supabase/coupleTemplates";
import styles from "./creator-center.module.css";

export function receiverDate(value?: string | null, timeZone?: string | null, dateOnly = false): string {
  if (!value) return "Not provided";
  const plainDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(plainDate ? `${value}T12:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", ...(!dateOnly && !plainDate ? { hour: "numeric", minute: "2-digit" } as const : {}) };
  try { return new Intl.DateTimeFormat(undefined, { ...options, ...(!plainDate && timeZone ? { timeZone } : {}) }).format(parsed); }
  catch { return new Intl.DateTimeFormat(undefined, options).format(parsed); }
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function Note({ label, text }: { label: string; text?: string | null }) {
  return text ? <div className={styles.receiverNote}><p>{label}</p><blockquote>{text}</blockquote></div> : null;
}

function Block({ icon, category, title, status, children }: { icon: ReactNode; category: string; title: string; status?: string; children: ReactNode }) {
  return <section className={styles.receiverBlock} aria-label={category}><div className={styles.receiverBlockHeading}><span className={styles.receiverBlockIcon} aria-hidden="true">{icon}</span><div><p>{category}</p><h4>{title}</h4></div>{status && <span className={styles.activityStatus}>{status.replaceAll("_", " ")}</span>}</div>{children}</section>;
}

function Slot({ label, slot, zone, dateOnly }: { label: string; slot?: InvitationSlot | null; zone?: string | null; dateOnly?: boolean }) {
  return slot ? <div className={styles.receiverSlot}><CalendarCheck size={17} aria-hidden="true" /><div><p>{label}</p><strong>{receiverDate(slot.start_time, zone, dateOnly)}{slot.end_time && <> – {receiverDate(slot.end_time, zone, dateOnly)}</>}</strong>{slot.label && <span>{slot.label}</span>}{zone && <small>{zone}</small>}</div></div> : null;
}

function Answer({ answer }: { answer?: QuestionAnswerItem }) {
  if (!answer) return <span className={styles.mutedAnswer}>No submitted answer</span>;
  if (answer.skipped) return <span className={styles.mutedAnswer}>Skipped by the receiver</span>;
  return <>{answer.selected_choice && <span className={styles.answerChoice}><Check size={13} aria-hidden="true" />{answer.selected_choice}</span>}{answer.answer_text && <p>{answer.answer_text}</p>}{!answer.selected_choice && !answer.answer_text && <span className={styles.mutedAnswer}>No answer provided</span>}</>;
}

export default function ReceiverDetails({ item }: { item: CreatorTemplateItem }) {
  if (item.is_expired) return null;
  const { invitation, poll, questions, reveal, coupon, open_when: letters, our_story: story, bucket_list: bucket } = item;
  const submission = questions?.partner_submission?.is_draft === false ? questions.partner_submission : null;
  const questionIds = new Set(questions?.questions.map(question => question.id));
  const earlierAnswers = Object.entries(submission?.answers || {}).filter(([id]) => !questionIds.has(id));
  const choices = poll ? [...poll.options, ...(poll.custom_suggestions || []).filter(suggestion => !poll.options.some(option => option.id === suggestion.id))] : [];
  const partnerChoices = new Set(poll?.partner_votes || []);
  const creatorChoices = new Set(poll?.creator_votes || []);

  return <div className={styles.receiverDetails}>
    {invitation && <Block icon={<CalendarCheck size={18} />} category="Invitation & RSVP" title={invitation.activity_title} status={invitation.status}>
      <dl className={styles.receiverFields}><Field label="Their response">{invitation.partner_response_status?.replaceAll("_", " ")}</Field><Field label="Responded">{invitation.responded_at ? receiverDate(invitation.responded_at) : null}</Field><Field label="Where">{invitation.location_detail || (invitation.location_type === "online" ? "Online" : null)}</Field><Field label="Duration">{invitation.duration_minutes ? `${invitation.duration_minutes} minutes` : null}</Field><Field label="Receiver’s time zone">{invitation.recipient_timezone}</Field></dl>
      <Slot label="Selected date" slot={invitation.confirmed_slot} zone={invitation.recipient_timezone || invitation.sender_timezone} dateOnly={invitation.date_mode === "date_only"} />
      <Slot label="Their suggested alternative" slot={invitation.counter_proposal_slot} zone={invitation.recipient_timezone || invitation.sender_timezone} dateOnly={invitation.date_mode === "date_only"} />
      <Note label={`${item.partner_name}’s note`} text={invitation.partner_counter_note} />
      {!invitation.partner_response_status && !invitation.responded_at && <p className={styles.receiverWaiting}>The invitation is waiting for a response.</p>}
    </Block>}

    {poll && <Block icon={<HelpCircle size={18} />} category="Polls & choices" title={poll.question} status={poll.status}>
      <div className={styles.receiverChoices}>{choices.map(choice => {
        const selected = partnerChoices.has(choice.id);
        const suggestion = poll.custom_suggestions?.find(entry => entry.id === choice.id);
        const agreed = poll.resolved_option_id === choice.id;
        const image = "image_url" in choice ? choice.image_url : undefined;
        return <div key={choice.id} className={`${styles.receiverChoice} ${selected ? styles.receiverChoiceSelected : ""}`}><span className={styles.choiceMarker} aria-hidden="true">{selected && <Check size={13} />}</span><div><p>{"icon" in choice && choice.icon && <span aria-hidden="true">{choice.icon} </span>}{choice.text}</p><div className={styles.choiceLabels}>{selected && <span>Selected by {item.partner_name}</span>}{creatorChoices.has(choice.id) && <span>Your choice</span>}{agreed && <span>Agreed choice</span>}{suggestion && <span>Suggested by {suggestion.suggested_by === "partner" ? item.partner_name : "you"} · {receiverDate(suggestion.created_at)}</span>}</div>{image && <InlineMediaGallery mediaItems={[{ url: image, type: "image" }]} shortCode={item.short_code} paletteTheme="cyan" />}</div></div>;
      })}</div>
      {!partnerChoices.size && <p className={styles.receiverWaiting}>No selection submitted yet.</p>}
      {[...partnerChoices].some(id => !choices.some(choice => choice.id === id)) && <p className={styles.receiverWaiting}>They also selected a choice whose label is no longer available.</p>}
    </Block>}

    {questions && <Block icon={<HelpCircle size={18} />} category="Their answers" title={questions.title} status={submission ? "Submitted" : "Awaiting answers"}>
      {submission ? <><p className={styles.receivedAt}><Clock3 size={13} aria-hidden="true" />Submitted {receiverDate(submission.submitted_at)}</p><ol className={styles.receiverAnswers}>{questions.questions.map((question, index) => <li key={question.id}><span className={styles.answerNumber}>{String(index + 1).padStart(2, "0")}</span><div><h5>{question.prompt}</h5><div className={styles.answerBody}><Answer answer={submission.answers[question.id]} /></div></div></li>)}{earlierAnswers.map(([id, answer], index) => <li key={id}><span className={styles.answerNumber}>{String(questions.questions.length + index + 1).padStart(2, "0")}</span><div><h5>Earlier submitted answer</h5><div className={styles.answerBody}><Answer answer={answer} /></div></div></li>)}</ol></> : <p className={styles.receiverWaiting}>Submitted answers will appear here. Unfinished drafts stay private to the receiver.</p>}
    </Block>}

    {reveal && <Block icon={<LockKeyhole size={18} />} category="Reveal together" title={reveal.prompt} status={reveal.status}>
      {reveal.status === "revealed" && reveal.partner_answer && Object.keys(reveal.partner_answer).length > 0 ? <><p className={styles.receivedAt}><Check size={13} aria-hidden="true" />Revealed {receiverDate(reveal.revealed_at)}</p><ol className={styles.receiverAnswers}>{Object.entries(reveal.partner_answer).filter(([, answer]) => typeof answer === "string").map(([id, answer], index) => <li key={id}><span className={styles.answerNumber}>{String(index + 1).padStart(2, "0")}</span><div><h5>{id === "main" ? reveal.prompt : reveal.questions?.find(question => question.id === id)?.prompt || `Their answer ${index + 1}`}</h5><div className={styles.answerBody}><p>{answer}</p></div></div></li>)}</ol></> : <div className={styles.lockedResponse}><LockKeyhole size={18} aria-hidden="true" /><div><strong>{reveal.partner_locked_at ? "Their answer is locked in." : "Their answer is still private."}</strong><p>Answers appear here after you both complete the reveal.</p></div></div>}
    </Block>}

    {coupon && <Block icon={<Gift size={18} />} category="Coupon request" title={coupon.title} status={coupon.status}>
      <dl className={styles.receiverFields}><Field label="Requested">{coupon.requested_at ? receiverDate(coupon.requested_at) : null}</Field><Field label="Their preferred date">{coupon.preferred_date ? receiverDate(coupon.preferred_date) : null}</Field><Field label="Accepted">{coupon.accepted_at ? receiverDate(coupon.accepted_at) : null}</Field><Field label="Fulfilled">{coupon.fulfilled_at ? receiverDate(coupon.fulfilled_at) : null}</Field><Field label="Cancelled">{coupon.cancelled_at ? receiverDate(coupon.cancelled_at) : null}</Field></dl>
      <Note label="Their request note" text={coupon.partner_request_note} /><Note label="Cancellation reason" text={coupon.cancel_reason} />
      {!coupon.requested_at && !coupon.partner_request_note && !coupon.preferred_date && <p className={styles.receiverWaiting}>No request has been submitted yet.</p>}
    </Block>}

    {letters && <Block icon={<Mail size={18} />} category="Open when letters" title={letters.title}>
      <ul className={styles.letterActivity}>{letters.envelopes.map(envelope => <li key={envelope.id}><span className={envelope.opened_at ? styles.openedLetter : styles.sealedLetter}>{envelope.opened_at ? <Mail size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}</span><div><h5>{envelope.label}</h5><p>{envelope.opened_at ? `Opened ${receiverDate(envelope.opened_at)}` : "Still sealed"}</p></div>{envelope.opened_at && <Check size={14} aria-label="Opened" />}</li>)}</ul>
    </Block>}

    {story && <Block icon={<BookOpen size={18} />} category="Their side of the story" title={story.title} status={story.partner_contributed_at || story.partner_caption || story.partner_photo_url ? "Memory received" : "Awaiting a memory"}>
      {story.partner_contributed_at || story.partner_caption || story.partner_photo_url ? <><dl className={styles.receiverFields}><Field label="From">{story.partner_author_name || item.partner_name}</Field><Field label="Memory date">{story.partner_memory_date ? receiverDate(story.partner_memory_date, null, true) : null}</Field><Field label="Shared">{story.partner_contributed_at ? receiverDate(story.partner_contributed_at) : null}</Field></dl><Note label="Their memory" text={story.partner_caption} />{story.partner_photo_url && <div className={styles.receiverMedia}><InlineMediaGallery mediaItems={[{ url: story.partner_photo_url, type: "image" }]} shortCode={item.short_code} authorName={story.partner_author_name || item.partner_name} createdDate={story.partner_contributed_at ? receiverDate(story.partner_contributed_at) : undefined} paletteTheme="cyan" /></div>}</> : <p className={styles.receiverWaiting}>Their photo and memory will appear here after they share them.</p>}
    </Block>}

    {bucket && <Block icon={<Compass size={18} />} category="Your shared bucket list" title={bucket.title}>
      <ul className={styles.receiverBucketList}>{bucket.items.map(entry => <li key={entry.id}><div className={styles.bucketEntryHeading}><h5>{entry.title}</h5><span className={styles.activityStatus}>{entry.status}</span></div><p className={styles.bucketAttribution}>Added by {entry.created_by === "partner" ? item.partner_name : "you"}{entry.created_at ? ` · ${receiverDate(entry.created_at)}` : ""}</p>{entry.note && <p className={styles.bucketDescription}>{entry.note}</p>}<div className={styles.interestLabels}>{entry.partner_interested && <span><Check size={12} aria-hidden="true" />{item.partner_name} is interested</span>}{entry.creator_interested && <span>You’re interested</span>}</div><dl className={styles.receiverFields}><Field label="Planning started">{entry.planning_started_at ? receiverDate(entry.planning_started_at) : null}</Field><Field label="Completed">{entry.completed_at ? receiverDate(entry.completed_at) : null}</Field></dl><Note label="A memory from this moment" text={entry.memory_note} />{entry.memory_photo_url && <div className={styles.receiverMedia}><InlineMediaGallery mediaItems={[{ url: entry.memory_photo_url, type: "image" }]} shortCode={item.short_code} authorName={entry.created_by === "partner" ? item.partner_name : item.partner_from} paletteTheme="cyan" /></div>}</li>)}</ul>
    </Block>}
  </div>;
}
