"use client";

import type { ReactNode } from "react";
import { BookOpen, Check, Clock3, Compass, Eye, Gift, HelpCircle, LockKeyhole, Mail } from "lucide-react";
import { InlineMediaGallery } from "@/components/MediaViewer";
import type { CreatorTemplateItem, QuestionAnswerItem, VenueToolConfig } from "@/lib/supabase/coupleTemplates";
import VenueDetails from "@/components/tools/VenueDetails";
import styles from "./creator-center.module.css";
import InvitationResponse from "./InvitationResponse";

export function receiverDate(value?: string | null, timeZone?: string | null, dateOnly = false): string {
  if (!value) return "Not provided";
  const plainDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  // Memory dates may be authored labels such as “Summer 2026”. Keep them intact.
  if (dateOnly && !plainDate && !/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
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

function Answer({ answer }: { answer?: QuestionAnswerItem }) {
  if (!answer) return <span className={styles.mutedAnswer}>No submitted answer</span>;
  if (answer.skipped) return <span className={styles.mutedAnswer}>Skipped by the receiver</span>;
  return <>{answer.selected_choice && <span className={styles.answerChoice}><Check size={13} aria-hidden="true" />{answer.selected_choice}</span>}{answer.answer_text && <p>{answer.answer_text}</p>}{!answer.selected_choice && !answer.answer_text && <span className={styles.mutedAnswer}>No answer provided</span>}</>;
}

export default function ReceiverDetails({ item, onUpdated }: { item: CreatorTemplateItem; onUpdated?: () => void }) {
  if (item.is_expired) return null;
  const { invitation, poll, questions, reveal, coupon, open_when: letters, our_story: story, bucket_list: bucket } = item;
  const venue = item.tools?.find((tool): tool is VenueToolConfig => tool.type === "venue" && tool.enabled);
  const submission = questions?.partner_submission?.is_draft === false ? questions.partner_submission : null;
  const questionIds = new Set(questions?.questions.map(question => question.id));
  const earlierAnswers = Object.entries(submission?.answers || {}).filter(([id]) => !questionIds.has(id));
  const choices = poll ? [...poll.options, ...(poll.custom_suggestions || []).filter(suggestion => !poll.options.some(option => option.id === suggestion.id))] : [];
  const partnerChoices = new Set(poll?.partner_votes || []);
  const creatorChoices = new Set(poll?.creator_votes || []);
  const activityHref = (anchor: string) => `/t/${encodeURIComponent(item.short_code)}${item.manage_token ? `?manage=${encodeURIComponent(item.manage_token)}` : ""}#${anchor}`;

  return <div className={styles.receiverDetails}>
    {invitation && <InvitationResponse item={item} onUpdated={onUpdated} />}
    {!invitation && venue && <VenueDetails venue={venue} palette={{ accent: "#481925", text: "#16232d", card: "#FFFFFF" }} />}

    {poll && <Block icon={<HelpCircle size={18} />} category="Vibe Check & Poll" title={poll.question} status={poll.status}>
      <div className={styles.receiverChoices}>{choices.map(choice => {
        const selected = partnerChoices.has(choice.id);
        const suggestion = poll.custom_suggestions?.find(entry => entry.id === choice.id);
        const agreed = poll.resolved_option_id === choice.id;
        const image = "image_url" in choice ? choice.image_url : undefined;
        return <div key={choice.id} className={`${styles.receiverChoice} ${selected ? styles.receiverChoiceSelected : ""}`}><span className={styles.choiceMarker} aria-hidden="true">{selected && <Check size={13} />}</span><div><p>{"icon" in choice && choice.icon && <span aria-hidden="true">{choice.icon} </span>}{choice.text}</p><div className={styles.choiceLabels}>{selected && <span>Selected by {item.partner_name}</span>}{creatorChoices.has(choice.id) && <span>Your choice</span>}{agreed && <span>Agreed choice</span>}{suggestion && <span>Suggested by {suggestion.suggested_by === "partner" ? item.partner_name : "you"} · {receiverDate(suggestion.created_at)}</span>}</div>{image && <InlineMediaGallery mediaItems={[{ url: image, type: "image" }]} shortCode={item.short_code} paletteTheme="cyan" />}</div></div>;
      })}</div>
      {!partnerChoices.size && <p className={styles.receiverWaiting}>No selection submitted yet.</p>}
      {[...partnerChoices].some(id => !choices.some(choice => choice.id === id)) && <p className={styles.receiverWaiting}>They also selected a choice whose label is no longer available.</p>}
      <p className={styles.receivedAt}>Updated {receiverDate(poll.updated_at)}</p><a className={styles.smallButton} href={activityHref("poll_t04")} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open poll</a>
    </Block>}

    {questions && <Block icon={<HelpCircle size={18} />} category="Heart-to-Heart Q&A" title={questions.title} status={submission ? "Submitted" : "Awaiting answers"}>
      {submission ? <><p className={styles.receivedAt}><Clock3 size={13} aria-hidden="true" />Submitted {receiverDate(submission.submitted_at)}</p><ol className={styles.receiverAnswers}>{questions.questions.map((question, index) => <li key={question.id}><span className={styles.answerNumber}>{String(index + 1).padStart(2, "0")}</span><div><h5>{question.prompt}</h5><div className={styles.answerBody}><Answer answer={submission.answers[question.id]} /></div></div></li>)}{earlierAnswers.map(([id, answer], index) => <li key={id}><span className={styles.answerNumber}>{String(questions.questions.length + index + 1).padStart(2, "0")}</span><div><h5>Earlier submitted answer</h5><div className={styles.answerBody}><Answer answer={answer} /></div></div></li>)}</ol></> : <p className={styles.receiverWaiting}>Submitted answers will appear here. Unfinished drafts stay private to the receiver.</p>}
    </Block>}

    {reveal && <Block icon={<LockKeyhole size={18} />} category="Synchronized Secret" title={reveal.prompt} status={reveal.status}>
      <dl className={styles.receiverFields}><Field label="Your answer">{reveal.creator_locked_at ? `Locked ${receiverDate(reveal.creator_locked_at)}` : "Not locked yet"}</Field><Field label={`${item.partner_name}’s answer`}>{reveal.partner_locked_at ? `Locked ${receiverDate(reveal.partner_locked_at)}` : "Not locked yet"}</Field><Field label="Revealed">{reveal.revealed_at ? receiverDate(reveal.revealed_at) : null}</Field></dl>
      {reveal.status === "revealed" && reveal.partner_answer && Object.keys(reveal.partner_answer).length > 0 ? <><p className={styles.receivedAt}><Check size={13} aria-hidden="true" />Revealed {receiverDate(reveal.revealed_at)}</p><ol className={styles.receiverAnswers}>{Object.entries(reveal.partner_answer).filter(([, answer]) => typeof answer === "string").map(([id, answer], index) => <li key={id}><span className={styles.answerNumber}>{String(index + 1).padStart(2, "0")}</span><div><h5>{id === "main" ? reveal.prompt : reveal.questions?.find(question => question.id === id)?.prompt || `Their answer ${index + 1}`}</h5><div className={styles.answerBody}><p>{answer}</p></div></div></li>)}</ol></> : <div className={styles.lockedResponse}><LockKeyhole size={18} aria-hidden="true" /><div><strong>{reveal.partner_locked_at ? "Their answer is locked in." : "Their answer is still private."}</strong><p>Answers appear here after you both complete the reveal.</p></div></div>}
      {reveal.status !== "cancelled" && <a className={styles.smallButton} href={activityHref("reveal_t06")} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{reveal.status === "revealed" ? "Open your shared reveal" : "Answer or reveal together"}</a>}
    </Block>}

    {item.scratch && <Block icon={<Eye size={18} />} category="Scratch Card Surprise" title={item.scratch.config.coverTitle} status={item.scratch.opened_at ? "Revealed" : "Still covered"}>
      {item.scratch.opened_at ? <><p className={styles.receivedAt}>Revealed {receiverDate(item.scratch.opened_at)} · {item.scratch.method === "scratch" ? "Scratched open" : "Opened with reveal button"}</p><Note label="Their revealed surprise" text={item.scratch.config.hiddenMessage}/>{item.scratch.config.contentType === "photo" && item.scratch.config.hiddenPhotoUrl && <InlineMediaGallery mediaItems={[{url:item.scratch.config.hiddenPhotoUrl,type:"image"}]} shortCode={item.short_code} paletteTheme="cyan"/>}</> : <p className={styles.receiverWaiting}>The receiver has not opened this surprise yet.</p>}
    </Block>}

    {coupon && <Block icon={<Gift size={18} />} category="Sweet Love Coupon" title={coupon.title} status={coupon.status}>
      <dl className={styles.receiverFields}><Field label="Requested">{coupon.requested_at ? receiverDate(coupon.requested_at) : null}</Field><Field label="Their preferred date">{coupon.preferred_date ? receiverDate(coupon.preferred_date) : null}</Field><Field label="Accepted">{coupon.accepted_at ? receiverDate(coupon.accepted_at) : null}</Field><Field label="Fulfilled">{coupon.fulfilled_at ? receiverDate(coupon.fulfilled_at) : null}</Field><Field label="Cancelled">{coupon.cancelled_at ? receiverDate(coupon.cancelled_at) : null}</Field></dl>
      <Note label="Their request note" text={coupon.partner_request_note} /><Note label="Cancellation reason" text={coupon.cancel_reason} />
      {coupon.expires_at && <p className={styles.receivedAt}>Valid until {receiverDate(coupon.expires_at)}</p>}
      {!!coupon.history?.length && <details className={styles.receiverHistory}><summary>Request history · {coupon.history.length} updates</summary><ol>{coupon.history.map((event,index)=><li key={`${event.at}-${index}`}><strong>{event.action.replaceAll("_"," ")}</strong><p className={styles.receivedAt}>{receiverDate(event.at)}</p>{event.request_note&&<Note label="Their request note" text={event.request_note}/>} {event.preferred_date&&<p>Their preferred date: {receiverDate(event.preferred_date)}</p>}{event.cancel_reason&&<Note label="Your response" text={event.cancel_reason}/>}</li>)}</ol></details>}
      <a className={styles.smallButton} href={activityHref("coupon_t08")} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Manage coupon</a>
      {!coupon.requested_at && !coupon.partner_request_note && !coupon.preferred_date && !coupon.history?.length && <p className={styles.receiverWaiting}>No request has been submitted yet.</p>}
    </Block>}

    {letters && <Block icon={<Mail size={18} />} category="Open when letters" title={letters.title}>
      <ul className={styles.letterActivity}>{letters.envelopes.map(envelope => <li key={envelope.id}><span className={envelope.opened_at ? styles.openedLetter : styles.sealedLetter}>{envelope.opened_at ? <Mail size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}</span><div><h5>{envelope.label}</h5><p>{envelope.opened_at ? `Opened ${receiverDate(envelope.opened_at)}` : "Still sealed"}</p>{envelope.opened_at&&<><Note label="The letter they opened" text={envelope.message}/>{envelope.media_url&&<InlineMediaGallery mediaItems={[{url:envelope.media_url,type:envelope.media_type||"image"}]} shortCode={item.short_code} paletteTheme="cyan"/>}</>}</div>{envelope.opened_at && <Check size={14} aria-label="Opened" />}</li>)}</ul>
    </Block>}

    {story && <Block icon={<BookOpen size={18} />} category="Their side of the story" title={story.title} status={story.partner_contributed_at || story.partner_caption || story.partner_photo_url ? "Memory received" : "Awaiting a memory"}>
      {story.partner_contributed_at || story.partner_caption || story.partner_photo_url ? <><dl className={styles.receiverFields}><Field label="From">{story.partner_author_name || item.partner_name}</Field><Field label="Memory date">{story.partner_memory_date ? receiverDate(story.partner_memory_date, null, true) : null}</Field><Field label="Shared">{story.partner_contributed_at ? receiverDate(story.partner_contributed_at) : null}</Field></dl><Note label="Their memory" text={story.partner_caption} />{story.partner_photo_url && <div className={styles.receiverMedia}><InlineMediaGallery mediaItems={[{ url: story.partner_photo_url, type: "image" }]} shortCode={item.short_code} authorName={story.partner_author_name || item.partner_name} createdDate={story.partner_contributed_at ? receiverDate(story.partner_contributed_at) : undefined} paletteTheme="cyan" /></div>}</> : <p className={styles.receiverWaiting}>Their photo and memory will appear here after they share them.</p>}
    </Block>}

    {bucket && <Block icon={<Compass size={18} />} category="Your shared bucket list" title={bucket.title} status={`${bucket.items.filter(entry=>entry.status==="completed").length} of ${bucket.items.length} enjoyed`}>
      <ul className={styles.receiverBucketList}>{bucket.items.map(entry => <li key={entry.id}><div className={styles.bucketEntryHeading}><h5>{entry.title}</h5><span className={styles.activityStatus}>{{wished:"Dreaming",planning:"Planning",completed:"Enjoyed"}[entry.status]}</span></div><p className={styles.bucketAttribution}>Added by {entry.created_by === "partner" ? item.partner_name : "you"}{entry.created_at ? ` · ${receiverDate(entry.created_at)}` : ""}</p>{entry.note && <p className={styles.bucketDescription}>{entry.note}</p>}<div className={styles.interestLabels}>{entry.partner_interested && <span><Check size={12} aria-hidden="true" />{item.partner_name} is interested</span>}{entry.creator_interested && <span>You’re interested</span>}</div><dl className={styles.receiverFields}><Field label="Planning started">{entry.planning_started_at ? receiverDate(entry.planning_started_at) : null}</Field><Field label="Completed">{entry.completed_at ? receiverDate(entry.completed_at) : null}</Field><Field label="Memory shared by">{entry.memory_by ? entry.memory_by==="partner" ? item.partner_name : "You" : null}</Field><Field label="Memory shared">{entry.memory_saved_at ? receiverDate(entry.memory_saved_at) : null}</Field></dl><Note label="A memory from this moment" text={entry.memory_note} />{entry.memory_photo_url && <div className={styles.receiverMedia}><InlineMediaGallery mediaItems={[{ url: entry.memory_photo_url, type: "image" }]} shortCode={item.short_code} authorName={entry.memory_by === "creator" ? item.partner_from : item.partner_name} paletteTheme="cyan" /></div>}{!!entry.history?.length&&<details className={styles.receiverHistory}><summary>Activity · {entry.history.length} updates</summary><ol>{entry.history.map((event,index)=><li key={index}><strong>{event.action.replaceAll("_"," ")}</strong><p className={styles.receivedAt}>{event.by==="partner"?item.partner_name:"You"} · {receiverDate(event.at)}</p><Note label="Memory note" text={event.note}/>{event.photo_url&&<InlineMediaGallery mediaItems={[{url:event.photo_url,type:"image"}]} shortCode={item.short_code} paletteTheme="cyan"/>}</li>)}</ol></details>}</li>)}</ul>
      <a className={styles.smallButton} href={activityHref("bucket_list_t11")} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open shared list</a>
    </Block>}
  </div>;
}
