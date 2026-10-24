"use client";
import { useId, useState } from "react";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { activityPalette, questionAnswered } from "@/lib/template-activities";
import type { QuestionAnswerItem, QuestionItem, QuestionSubmission, TemplateQuestionCard } from "@/lib/supabase/coupleTemplates";
import { useActivityDraft, useTemplateTool } from "./useTemplateTool";
import styles from "./invitation.module.css";
import activity from "./activity.module.css";
type Props = { templateCode: string; manageToken?: string | null; partnerName?: string; senderName?: string; palette?: Partial<InvitationPalette> };
type Answers = Record<string, QuestionAnswerItem>;
type Data = { card: TemplateQuestionCard | null; is_creator: boolean; is_partner: boolean; my_draft?: Answers | null; my_submission?: QuestionSubmission | null; partner_submission?: QuestionSubmission | null };
function Answer({ question, answer, label }: { question: QuestionItem; answer?: QuestionAnswerItem; label?: string }) {
  return <div className={activity.answer}><h4>{question.prompt}</h4>{label && <small>{label}</small>}{answer?.skipped ? <p>Skipped</p> : answer ? <>{answer.selected_choice && <p>{answer.selected_choice}</p>}{answer.answer_text && <blockquote>{answer.answer_text}</blockquote>}</> : <p>No answer submitted.</p>}</div>;
}
export function QuestionTool({ templateCode, manageToken, partnerName = "Your partner", senderName = "The sender", palette }: Props) {
  const resource = useTemplateTool<Data>(templateCode, "questions", manageToken);
  const data = resource.data, card = data?.card;
  return <section id="questions_t05" aria-label="Heart-to-Heart Q&A" className={`${styles.root} ${activity.root}`} style={invitationStyle(activityPalette(palette))}>
    <p className={styles.eyebrow}>Heart-to-Heart Q&amp;A</p>
    {resource.loading ? <p className={styles.hint} role="status">Loading your questions…</p> : card ? <>
      <h2 className={styles.title}>{card.title}</h2>{card.description && <p className={activity.intro}>{card.description}</p>}
      {data.my_submission ? <><div className={styles.status}><h3>{data.is_creator ? "Your answer is saved." : "Answers saved & shared."}</h3>{data.my_submission.submitted_at && <p><time dateTime={data.my_submission.submitted_at}>{new Date(data.my_submission.submitted_at).toLocaleString()}</time></p>}</div>{card.questions.map(question => <div key={question.id}><Answer question={question} answer={data.my_submission?.answers[question.id]} label="Your answer" />{!data.is_creator && !data.partner_submission?.answers[question.id] && question.sender_answer && question.reveal_mode !== "hidden" && <div className={activity.answer}><small>{senderName}’s answer</small><p>{question.sender_answer}</p></div>}</div>)}</> : <QuestionForm key={card.revision} card={card} initial={data.my_draft || {}} creator={data.is_creator} busy={resource.busy} write={resource.write} />}
      {data.partner_submission && <div className={styles.status}><h3>{data.is_creator ? partnerName : senderName}’s answers</h3>{card.questions.map(question => <Answer key={question.id} question={question} answer={data.partner_submission?.answers[question.id]} />)}</div>}
    </> : !resource.error && <p className={styles.hint}>This activity is not available.</p>}
    {resource.error && <div className={styles.error} role="alert"><p>{resource.error}</p><button type="button" className={styles.secondary} disabled={resource.busy} onClick={() => { resource.clearError(); void resource.reload(); }}>Refresh questions</button></div>}
  </section>;
}
function QuestionForm({ card, initial, creator, busy, write }: { card: TemplateQuestionCard; initial: Answers; creator: boolean; busy: boolean; write: (body: unknown, method?: string, refresh?: boolean) => Promise<unknown> }) {
  const [answers, setAnswers] = useState(initial), [index, setIndex] = useState(0), [review, setReview] = useState(false);
  const group = useId(), question = card.questions[index];
  const draft = useActivityDraft(answers, value => write({ action: "draft", expected_revision: card.revision, answers: value, is_creator: creator }, "POST", false));
  if (!question) return <p className={styles.hint}>There are no questions in this card.</p>;
  const next = () => { if (index < card.questions.length - 1) setIndex(index + 1); else setReview(true); };
  const update = (value: QuestionAnswerItem) => { draft.changed(); setAnswers(previous => ({ ...previous, [question.id]: value })); };
  const complete = card.questions.every(item => item.skippable || questionAnswered(item, answers[item.id]));
  return <><div className={activity.meta}><span>{review ? "Review your answers" : `Question ${index + 1} of ${card.questions.length}`}</span><span role="status">{draft.status || "Drafts stay private until you submit."}</span></div><progress className={activity.progress} value={review ? card.questions.length : index} max={card.questions.length} aria-label="Question progress" />
    {review ? <>{card.questions.map((item, position) => <div key={item.id}><Answer question={item} answer={answers[item.id]} /><button className={styles.secondary} type="button" disabled={busy} onClick={() => { setIndex(position); setReview(false); }}>Edit answer {position + 1}</button></div>)}<div className={styles.actions}><button type="button" className={styles.primary} disabled={busy || !complete} onClick={() => { draft.cancel(); void write({ action: "submit", expected_revision: card.revision, answers, is_creator: creator }); }}>{busy ? "Saving…" : "Submit my answers"}</button><button type="button" disabled={busy} className={styles.secondary} onClick={() => setReview(false)}>Back to questions</button></div></> : <>
      <fieldset className={activity.choices} disabled={busy}><legend>{question.skippable ? "Optional question" : "Required question"}</legend>{question.type === "choice" ? <><h3 className={styles.field}>{question.prompt}</h3><div className={styles.options}>{question.options?.map(option => <label className={styles.option} key={option}><input type="radio" name={group} checked={!answers[question.id]?.skipped && answers[question.id]?.selected_choice === option} onChange={() => update({ question_id: question.id, skipped: false, selected_choice: option })} /><span>{option}</span></label>)}</div></> : <label className={styles.field}>{question.prompt}<textarea rows={question.type === "long" ? 5 : 3} value={answers[question.id]?.answer_text || ""} maxLength={2000} onChange={event => update({ question_id: question.id, skipped: false, answer_text: event.target.value })} /></label>}</fieldset>
      {question.sender_answer && question.reveal_mode === "always" && <div className={activity.answer}><small>The sender’s answer</small><p>{question.sender_answer}</p></div>}
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy || !questionAnswered(question, answers[question.id])} onClick={next}>{index === card.questions.length - 1 ? "Review answers" : "Next question"}</button>{question.skippable && <button type="button" className={styles.secondary} disabled={busy} onClick={() => { update({ question_id: question.id, skipped: true }); next(); }}>Skip question</button>}{index > 0 && <button type="button" className={styles.secondary} disabled={busy} onClick={() => setIndex(index - 1)}>Previous question</button>}<button type="button" className={styles.secondary} disabled={busy} onClick={() => void draft.save()}>Save draft</button></div>
    </>}
  </>;
}
