"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Heart,
  ShieldCheck,
  Send,
  Save,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  TemplatePrivateReveal,
  RevealToolConfig,
} from "@/lib/supabase/coupleTemplates";

interface PrivateRevealToolProps {
  templateCode: string;
  manageToken?: string | null;
  partnerName?: string;
  senderName?: string;
  config?: RevealToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function PrivateRevealTool({
  templateCode,
  manageToken,
  partnerName = "You",
  senderName = "Me",
  palette: propPalette,
}: PrivateRevealToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [reveal, setReveal] = useState<TemplatePrivateReveal | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Input state
  const [answerText, setAnswerText] = useState("");
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);

  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadRevealState = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = new URLSearchParams();
      if (manageToken) params.set("manage", manageToken);

      const res = await fetch(`/api/templates/${templateCode}/reveal?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 404) {
          setReveal(null);
          return;
        }
        setErrorMsg(data.error || "Could not load reveal tool.");
        return;
      }

      const r = data.reveal as TemplatePrivateReveal;
      setReveal(r);
      setIsCreator(data.is_creator);
      setIsPartner(data.is_partner);

      if (r.my_answer) {
        setAnswersMap(r.my_answer);
        setAnswerText(r.my_answer.main || Object.values(r.my_answer)[0] || "");
      } else if (r.my_draft) {
        setAnswersMap(r.my_draft);
        setAnswerText(r.my_draft.main || Object.values(r.my_draft)[0] || "");
      }
    } catch {
      setErrorMsg("Network error loading reveal tool.");
    } finally {
      setLoading(false);
    }
  }, [templateCode, manageToken]);

  useEffect(() => {
    loadRevealState();
  }, [loadRevealState]);

  // Debounced draft auto-save
  const triggerSaveDraft = useCallback((latestAnswer: string) => {
    if (!reveal || (isCreator ? reveal.creator_locked : reveal.partner_locked)) return;

    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    autoSaveTimeout.current = setTimeout(async () => {
      try {
        setSavingDraft(true);
        const res = await fetch(`/api/templates/${templateCode}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "draft",
            expected_revision: reveal.revision,
            answers: { main: latestAnswer },
            is_creator: isCreator,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      } catch {
        // silent
      } finally {
        setSavingDraft(false);
      }
    }, 1200);
  }, [reveal, isCreator, templateCode]);

  const handleAnswerChange = (val: string) => {
    setAnswerText(val);
    setAnswersMap({ main: val });
    triggerSaveDraft(val);
  };

  const handleLockAnswer = async () => {
    if (!reveal || !answerText.trim()) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/templates/${templateCode}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock",
          expected_revision: reveal.revision,
          answers: { main: answerText.trim() },
          is_creator: isCreator,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setErrorMsg("The question was updated. Please refresh.");
          return;
        }
        setErrorMsg(data.error || "Failed to lock answer.");
        return;
      }

      // Reload fresh state to get eligibility updates
      await loadRevealState();
    } catch {
      setErrorMsg("Network error locking answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawAnswer = async () => {
    if (!reveal) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/templates/${templateCode}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          expected_revision: reveal.revision,
          is_creator: isCreator,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Cannot withdraw answer.");
        return;
      }

      await loadRevealState();
    } catch {
      setErrorMsg("Network error withdrawing answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartReveal = async () => {
    if (!reveal || !reveal.is_eligible) return;

    // Start 3-second countdown
    let count = reveal.countdown_seconds || 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        confirmRevealCall();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const confirmRevealCall = async () => {
    if (!reveal) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/templates/${templateCode}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          expected_revision: reveal.revision,
          is_creator: isCreator,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try {
          confetti({
            particleCount: 65,
            spread: 80,
            origin: { y: 0.6 },
            colors: [palette.accent, "#ec4899", "#a855f7"],
          });
        } catch {
          // fallback
        }
        await loadRevealState();
      } else {
        setErrorMsg(data.error || "Failed to reveal answers.");
      }
    } catch {
      setErrorMsg("Network error revealing answers.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto my-6 p-6 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 text-center animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded-full mx-auto mb-3" />
        <div className="h-4 w-64 bg-white/5 rounded-full mx-auto" />
      </div>
    );
  }

  if (!reveal) {
    return null;
  }

  const isMyAnswerLocked = isCreator ? reveal.creator_locked : reveal.partner_locked;
  const isOtherLocked = isCreator ? reveal.partner_locked : reveal.creator_locked;
  const otherName = isCreator ? partnerName : senderName;

  return (
    <div
      id="reveal_t06"
      className="w-full max-w-xl mx-auto my-6 rounded-3xl overflow-hidden border backdrop-blur-xl shadow-2xl relative transition-all"
      style={{
        backgroundColor: "rgba(18, 12, 32, 0.8)",
        borderColor: `${palette.accent}33`,
        boxShadow: `0 8px 32px -4px ${palette.glow}25`,
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
              {reveal.is_revealed ? (
                <Eye className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5" style={{ color: palette.accent }} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                Private Reveal
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {reveal.is_revealed
                    ? "Revealed"
                    : reveal.is_eligible
                    ? "Ready to Reveal"
                    : isMyAnswerLocked
                    ? "Locked"
                    : "Writing"}
                </span>
              </h3>
              {reveal.description && (
                <p className="text-xs text-white/60 line-clamp-1">{reveal.description}</p>
              )}
            </div>
          </div>

          {/* Draft indicator */}
          {!isMyAnswerLocked && (
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

        {/* Question Prompt */}
        <div className="mt-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
            Prompt for both of you
          </span>
          <p className="text-sm font-semibold text-white leading-relaxed">{reveal.prompt}</p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="m-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {/* ================= STATE 4: REVEALED TOGETHER ================= */}
        {reveal.is_revealed ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <Sparkles className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">Revealed Together</h4>
              <p className="text-xs text-white/60 mt-1">
                Both independent answers are unlocked and revealed side by side!
              </p>
            </div>

            {/* Side-by-side or stacked answers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* My Answer */}
              <div
                className="p-4 rounded-2xl border flex flex-col justify-between"
                style={{
                  backgroundColor: `${palette.accent}12`,
                  borderColor: `${palette.accent}30`,
                }}
              >
                <div>
                  <span
                    className="text-[10px] uppercase font-bold block mb-1.5"
                    style={{ color: palette.accent }}
                  >
                    Your Answer
                  </span>
                  <p className="text-xs md:text-sm text-white/95 leading-relaxed font-medium">
                    {reveal.my_answer?.main || Object.values(reveal.my_answer || {})[0] || "—"}
                  </p>
                </div>
                <span className="text-[10px] text-white/40 mt-3 block">Locked &amp; Verified</span>
              </div>

              {/* Partner's Answer */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1.5">
                    {otherName}&apos;s Answer
                  </span>
                  <p className="text-xs md:text-sm text-white/95 leading-relaxed font-medium">
                    {reveal.partner_answer?.main ||
                      Object.values(reveal.partner_answer || {})[0] ||
                      "—"}
                  </p>
                </div>
                <span className="text-[10px] text-white/40 mt-3 block">Locked &amp; Verified</span>
              </div>
            </div>

            {/* Permanent Disclosure Message per IDE instruction */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <p className="text-xs text-white/70 italic">
                &ldquo;Information already seen cannot be made unseen.&rdquo;
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                Unlocked on{" "}
                {reveal.revealed_at
                  ? new Date(reveal.revealed_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "recently"}
              </p>
            </div>
          </div>
        ) : countdown !== null ? (
          /* ================= COUNTDOWN ACTIVE ================= */
          <div className="py-12 text-center space-y-4">
            <span className="text-xs text-white/60 uppercase tracking-widest block font-medium">
              Revealing in...
            </span>
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-6xl font-extrabold text-white"
              style={{ color: palette.accent }}
            >
              {countdown}
            </motion.div>
            <p className="text-xs text-white/50">Get ready!</p>
          </div>
        ) : reveal.is_eligible ? (
          /* ================= STATE 3: BOTH LOCKED / ELIGIBLE ================= */
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
              <h4 className="text-base font-bold text-white">Both Answers Are Locked!</h4>
              <p className="text-xs text-white/70 mt-1 max-w-sm mx-auto">
                You and {otherName} have both committed and sealed your private answers. You can
                now open the reveal together!
              </p>
            </div>

            {/* Locked Answer Preview */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                Your Sealed Answer
              </span>
              <p className="text-xs text-white/90 italic">
                &ldquo;{answerText || Object.values(reveal.my_answer || {})[0]}&rdquo;
              </p>
            </div>

            {/* Reveal Action Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleStartReveal}
              className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: palette.accent,
                boxShadow: `0 4px 20px -2px ${palette.accent}60`,
              }}
            >
              <Eye className="w-4 h-4" />
              <span>Open Reveal Now ({reveal.countdown_seconds || 3}s Countdown)</span>
            </button>
          </div>
        ) : isMyAnswerLocked ? (
          /* ================= STATE 2: WAITING FOR PARTNER ================= */
          <div className="space-y-4 text-center">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: `${palette.accent}20` }}
              >
                <Clock className="w-6 h-6 animate-spin" style={{ color: palette.accent }} />
              </div>
              <h4 className="text-sm font-bold text-white">
                Waiting for {otherName} to lock their answer
              </h4>
              <p className="text-xs text-white/60 max-w-sm mx-auto">
                Your answer is sealed in the vault. Once {otherName} submits their locked answer,
                the reveal will unlock for both of you!
              </p>

              {/* Status Pills */}
              <div className="flex items-center justify-center gap-3 pt-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> You locked
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/60 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {otherName} writing...
                </span>
              </div>
            </div>

            {/* My Locked Answer (Safe local preview) */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                Your sealed answer
              </span>
              <p className="text-xs text-white/80 italic">&ldquo;{answerText}&rdquo;</p>
            </div>

            {/* Withdraw button (Cancels round without releasing answers) */}
            <div className="pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleWithdrawAnswer}
                className="text-xs text-rose-300 hover:text-rose-200 underline underline-offset-4 flex items-center justify-center gap-1 mx-auto transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Withdraw answer to edit</span>
              </button>
              <p className="text-[10px] text-white/40 mt-1">
                Withdrawing unlocks your draft and resets the round before reveal.
              </p>
            </div>
          </div>
        ) : (
          /* ================= STATE 1: WRITING PRIVATE ANSWER ================= */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-200 leading-relaxed">
                <span className="font-semibold block text-white mb-0.5">Honest &amp; Independent</span>
                Write your honest answer. {otherName} cannot see what you write until both of you
                have submitted and locked your answers.
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50 block mb-1.5">
                Your Private Answer
              </label>
              <textarea
                rows={4}
                value={answerText}
                onChange={(e) => handleAnswerChange(e.target.value)}
                maxLength={1000}
                placeholder="Write your private answer here..."
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                <span>Once locked, it cannot be edited without withdrawing.</span>
                <span>{answerText.length}/1000</span>
              </div>
            </div>

            {/* Lock Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={submitting || !answerText.trim()}
                onClick={handleLockAnswer}
                className="w-full py-3.5 px-4 rounded-2xl text-xs md:text-sm font-semibold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                style={{
                  backgroundColor: palette.accent,
                  boxShadow: `0 4px 18px -2px ${palette.accent}50`,
                }}
              >
                {submitting ? (
                  <span>Locking answer...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Lock my answer &amp; wait for {otherName}</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-white/40 mt-2">
                🔒 Lock explanation: your answer stays hidden in the vault until both lock.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
