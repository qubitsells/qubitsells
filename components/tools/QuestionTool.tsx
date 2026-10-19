"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Sparkles,
  Save,
  Edit3,
  Heart,
  MessageSquare,
  Lock,
  Eye,
  Check,
  AlertCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  TemplateQuestionCard,
  QuestionItem,
  QuestionAnswerItem,
} from "@/lib/supabase/coupleTemplates";

interface QuestionToolProps {
  templateCode: string;
  manageToken?: string | null;
  partnerName?: string;
  senderName?: string;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function QuestionTool({
  templateCode,
  manageToken,
  partnerName = "You",
  senderName = "Me",
  palette: propPalette,
}: QuestionToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [card, setCard] = useState<TemplateQuestionCard | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Flow State: step index (0 to questions.length - 1), or "review"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReviewStep, setIsReviewStep] = useState(false);

  // Answers State: Record of question_id -> QuestionAnswerItem
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerItem>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, QuestionAnswerItem> | null>(null);
  const [partnerSubmittedAnswers, setPartnerSubmittedAnswers] = useState<Record<string, QuestionAnswerItem> | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = new URLSearchParams();
      if (manageToken) params.set("manage", manageToken);

      const res = await fetch(`/api/templates/${templateCode}/questions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 404) {
          setCard(null);
          return;
        }
        setErrorMsg(data.error || "Could not load questions.");
        return;
      }

      setCard(data.card);
      setIsCreator(data.is_creator);
      setIsPartner(data.is_partner);

      if (data.my_submission) {
        setSubmittedAnswers(data.my_submission.answers || {});
        setSubmittedAt(data.my_submission.submitted_at);
      } else if (data.my_draft) {
        setAnswers(data.my_draft);
      }

      if (data.partner_submission) {
        setPartnerSubmittedAnswers(data.partner_submission.answers || {});
      }
    } catch {
      setErrorMsg("Network error loading questions.");
    } finally {
      setLoading(false);
    }
  }, [templateCode, manageToken]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Debounced draft save
  const triggerSaveDraft = useCallback((latestAnswers: Record<string, QuestionAnswerItem>) => {
    if (!card || submittedAnswers) return;

    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    autoSaveTimeout.current = setTimeout(async () => {
      try {
        setSavingDraft(true);
        const res = await fetch(`/api/templates/${templateCode}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "draft",
            expected_revision: card.revision,
            answers: latestAnswers,
            is_creator: isCreator,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      } catch {
        // Silently swallow background draft save errors
      } finally {
        setSavingDraft(false);
      }
    }, 1200);
  }, [card, submittedAnswers, templateCode, isCreator]);

  const updateCurrentAnswer = (field: "answer_text" | "selected_choice", value: string) => {
    if (!card) return;
    const q = card.questions[currentIndex];
    if (!q) return;

    const updated: Record<string, QuestionAnswerItem> = {
      ...answers,
      [q.id]: {
        question_id: q.id,
        skipped: false,
        answer_text: field === "answer_text" ? value : answers[q.id]?.answer_text,
        selected_choice: field === "selected_choice" ? value : answers[q.id]?.selected_choice,
      },
    };
    setAnswers(updated);
    triggerSaveDraft(updated);
  };

  const handleSkipQuestion = () => {
    if (!card) return;
    const q = card.questions[currentIndex];
    if (!q) return;

    const updated: Record<string, QuestionAnswerItem> = {
      ...answers,
      [q.id]: {
        question_id: q.id,
        skipped: true,
      },
    };
    setAnswers(updated);
    triggerSaveDraft(updated);

    // Advance to next question or review
    if (currentIndex < card.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsReviewStep(true);
    }
  };

  const handleNextQuestion = () => {
    if (!card) return;
    if (currentIndex < card.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsReviewStep(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (isReviewStep) {
      setIsReviewStep(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!card) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/templates/${templateCode}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          expected_revision: card.revision,
          answers,
          is_creator: isCreator,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setErrorMsg("Questions were updated. Please refresh to answer the new version.");
          return;
        }
        setErrorMsg(data.error || "Failed to submit answers.");
        return;
      }

      setSubmittedAnswers(answers);
      setSubmittedAt(data.submitted_at || new Date().toISOString());

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: [palette.accent, "#ec4899", "#8b5cf6"],
        });
      } catch {
        // Confetti fallback
      }
    } catch {
      setErrorMsg("Network error submitting answers.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto my-6 p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-center animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded-full mx-auto mb-3" />
        <div className="h-4 w-64 bg-white/5 rounded-full mx-auto" />
      </div>
    );
  }

  if (!card || card.questions.length === 0) {
    return null; // Tool not added or empty
  }

  const questionsCount = card.questions.length;
  const currentQ = card.questions[currentIndex];
  const currentAns = currentQ ? answers[currentQ.id] : undefined;

  // Answered count (including skipped)
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(
    isReviewStep ? 100 : ((currentIndex) / questionsCount) * 100
  );

  return (
    <div
      id="questions_t05"
      className="w-full max-w-xl mx-auto my-6 rounded-3xl overflow-hidden border backdrop-blur-xl shadow-2xl relative transition-all"
      style={{
        backgroundColor: "rgba(18, 12, 28, 0.75)",
        borderColor: `${palette.accent}33`,
        boxShadow: `0 8px 32px -4px ${palette.glow}20`,
      }}
    >
      {/* Tool Header */}
      <div className="p-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: `${palette.accent}26` }}
            >
              <HelpCircle className="w-5 h-5" style={{ color: palette.accent }} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                {card.title || "A few questions for you"}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  v{card.revision}
                </span>
              </h3>
              {card.description && (
                <p className="text-xs text-white/60 line-clamp-1">{card.description}</p>
              )}
            </div>
          </div>

          {/* Draft indicator */}
          {!submittedAnswers && (
            <div className="text-[11px] flex items-center gap-1.5 text-white/50">
              {savingDraft ? (
                <>
                  <Save className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : draftSavedAt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Draft saved</span>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!submittedAnswers && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
              <span>
                {isReviewStep
                  ? "Review before submitting"
                  : `Question ${currentIndex + 1} of ${questionsCount}`}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: palette.accent }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="m-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {submittedAnswers ? (
          /* ================= ALREADY SUBMITTED RECEIPT ================= */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-white">Answers Saved & Shared</h4>
              <p className="text-xs text-white/60 mt-0.5">
                Submitted on{" "}
                {submittedAt
                  ? new Date(submittedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "recently"}
              </p>
            </div>

            <div className="space-y-3">
              {card.questions.map((q, idx) => {
                const myAns = submittedAnswers[q.id];
                const senderAns = q.sender_answer;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {idx + 1}. {q.prompt}
                      </span>
                      {myAns?.skipped ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">
                          Skipped
                        </span>
                      ) : (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shrink-0"
                          style={{ backgroundColor: `${palette.accent}40` }}
                        >
                          Answered
                        </span>
                      )}
                    </div>

                    {/* My Answer */}
                    {!myAns?.skipped && (
                      <div className="text-xs text-white/90 bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-white/40 block mb-0.5">
                          Your answer
                        </span>
                        {myAns?.selected_choice || myAns?.answer_text || "—"}
                      </div>
                    )}

                    {/* Sender's Revealed Answer (if available) */}
                    {senderAns && (
                      <div
                        className="text-xs p-2.5 rounded-xl border"
                        style={{
                          backgroundColor: `${palette.accent}15`,
                          borderColor: `${palette.accent}30`,
                        }}
                      >
                        <span
                          className="text-[10px] uppercase font-bold block mb-0.5"
                          style={{ color: palette.accent }}
                        >
                          {senderName}&apos;s answer
                        </span>
                        <span className="text-white/90">{senderAns}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : isReviewStep ? (
          /* ================= REVIEW BEFORE SUBMIT STEP ================= */
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h4 className="text-base font-bold text-white">Review your answers</h4>
              <p className="text-xs text-white/60">
                You can review or change any answer before sending.
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {card.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isSkipped = ans?.skipped;
                const hasValue = ans && !ans.skipped && (ans.answer_text || ans.selected_choice);

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {idx + 1}. {q.prompt}
                      </p>
                      <p className="text-xs text-white/70 mt-1 truncate">
                        {isSkipped ? (
                          <span className="italic text-white/40">Skipped (no penalty)</span>
                        ) : hasValue ? (
                          <span>{ans.selected_choice || ans.answer_text}</span>
                        ) : (
                          <span className="text-amber-300/80">Unanswered</span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsReviewStep(false);
                        setCurrentIndex(idx);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePreviousQuestion}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Back to questions
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitAnswers}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: palette.accent,
                  boxShadow: `0 4px 20px -2px ${palette.accent}50`,
                }}
              >
                {submitting ? (
                  <span>Sending answers...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit answers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : currentQ ? (
          /* ================= SINGLE QUESTION INPUT STEP ================= */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50 block mb-1">
                  Question {currentIndex + 1}
                </span>
                <h4 className="text-base font-bold text-white leading-snug">
                  {currentQ.prompt}
                </h4>
              </div>

              {/* Question Type: Choice */}
              {currentQ.type === "choice" && currentQ.options && (
                <div className="space-y-2 pt-1">
                  {currentQ.options.map((optText, optIdx) => {
                    const isSelected = currentAns?.selected_choice === optText;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => updateCurrentAnswer("selected_choice", optText)}
                        className={`w-full p-3.5 rounded-2xl text-left text-xs font-medium transition-all flex items-center justify-between border ${
                          isSelected
                            ? "text-white border-transparent shadow-md"
                            : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: palette.accent,
                                boxShadow: `0 4px 15px ${palette.accent}40`,
                              }
                            : {}
                        }
                      >
                        <span>{optText}</span>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Question Type: Short Text */}
              {currentQ.type === "short" && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={currentAns?.answer_text || ""}
                    onChange={(e) => updateCurrentAnswer("answer_text", e.target.value)}
                    placeholder="Type your answer..."
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                  <div className="text-right text-[10px] text-white/40 mt-1">
                    {(currentAns?.answer_text || "").length}/200
                  </div>
                </div>
              )}

              {/* Question Type: Long Text */}
              {currentQ.type === "long" && (
                <div className="pt-1">
                  <textarea
                    rows={4}
                    value={currentAns?.answer_text || ""}
                    onChange={(e) => updateCurrentAnswer("answer_text", e.target.value)}
                    placeholder="Write as much as you'd like..."
                    maxLength={1000}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                  />
                  <div className="text-right text-[10px] text-white/40 mt-1">
                    {(currentAns?.answer_text || "").length}/1000
                  </div>
                </div>
              )}

              {/* Sender Note / Answer (if revealed beforehand) */}
              {currentQ.sender_answer && (
                <div
                  className="p-3 rounded-xl border text-xs"
                  style={{
                    backgroundColor: `${palette.accent}12`,
                    borderColor: `${palette.accent}25`,
                  }}
                >
                  <span
                    className="text-[10px] uppercase font-bold block mb-0.5"
                    style={{ color: palette.accent }}
                  >
                    Note from {senderName}
                  </span>
                  <span className="text-white/80">{currentQ.sender_answer}</span>
                </div>
              )}

              {/* Navigation controls */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <div>
                  {currentIndex > 0 ? (
                    <button
                      type="button"
                      onClick={handlePreviousQuestion}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {/* Skip Button (neutral, no penalty) */}
                  {currentQ.skippable !== false && (
                    <button
                      type="button"
                      onClick={handleSkipQuestion}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 flex items-center gap-1 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip</span>
                    </button>
                  )}

                  {/* Next / Review Button */}
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                    style={{
                      backgroundColor: palette.accent,
                      boxShadow: `0 3px 12px ${palette.accent}40`,
                    }}
                  >
                    <span>{currentIndex === questionsCount - 1 ? "Review" : "Next"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
