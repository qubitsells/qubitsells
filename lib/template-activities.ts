import type { InvitationPalette } from "./invitation";
import type { QuestionAnswerItem, QuestionItem, RevealQuestionItem } from "./supabase/coupleTemplates";
export function publicActivityTools(value: unknown) {
  return (Array.isArray(value) ? value : []).map(tool => tool.type === "question" ? { ...tool, questions: (Array.isArray(tool.questions) ? tool.questions : []).map((question: QuestionItem) => ({ ...question, sender_answer: undefined })) } : tool.type === "private_reveal" ? {...tool,senderAnswers:undefined} : tool.type === "poll" ? {...tool,senderOptionIds:undefined} : tool.type === "scratch_reveal" ? { ...tool, hiddenMessage: undefined, hiddenPhotoUrl: undefined } : tool.type === "open_when" ? { ...tool, envelopes: (Array.isArray(tool.envelopes) ? tool.envelopes : []).map((envelope: Record<string, unknown>) => ({ ...envelope, message: undefined, mediaUrl: undefined })) } : tool);
}
export function activityPalette(palette?: Partial<InvitationPalette>): InvitationPalette { return { accent: palette?.accent || "#E11D48", text: palette?.text || "#FFFFFF", card: palette?.card || palette?.surface || "#141019" }; }
export function questionAnswered(question: QuestionItem, answer?: QuestionAnswerItem) {
  if (!answer || answer.skipped) return !!question.skippable && !!answer?.skipped;
  return question.type === "choice" ? !!answer.selected_choice && !!question.options?.includes(answer.selected_choice) : !!answer.answer_text?.trim();
}
export function revealQuestions(prompt: string, questions?: RevealQuestionItem[]) { return questions?.length ? questions : [{ id: "main", prompt }]; }
