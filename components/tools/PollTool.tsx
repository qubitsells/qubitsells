"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListFilter,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  Plus,
  Send,
  Users,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Calendar,
  Check,
  Flame,
} from "lucide-react";
import type {
  PollOption,
  PollToolConfig,
  TemplatePoll,
} from "@/lib/supabase/coupleTemplates";

interface PollToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config?: PollToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
  onCreateDateFromChoice?: (choiceText: string) => void;
}

export function PollTool({
  templateCode,
  partnerName = "You",
  senderName = "Me",
  config,
  palette: propPalette,
  onCreateDateFromChoice,
}: PollToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [poll, setPoll] = useState<TemplatePoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCreator, setIsCreator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Custom suggestion input
  const [showSuggestInput, setShowSuggestInput] = useState(false);
  const [customText, setCustomText] = useState("");
  const inputId = useId();

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/poll`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.poll) {
          setPoll(data.poll);
          setIsCreator(Boolean(data.is_creator));
          setIsPartner(Boolean(data.is_partner));
          setMyVotes(data.my_votes || []);
          setSelectedIds(data.my_votes || []);
        }
      }
    } catch {
      // offline / network
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [templateCode]);

  const handleToggleOption = (optionId: string) => {
    if (!poll) return;
    if (poll.status === "closed") return;

    if (!poll.allow_multiple) {
      setSelectedIds([optionId]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleVote = async (customSuggestion?: string) => {
    if (!poll) return;
    setSubmitting(true);
    setErrorMsg(null);

    const votePayload = {
      expected_revision: poll.revision,
      selected_option_ids: selectedIds,
      custom_suggestion_text: customSuggestion || undefined,
      is_creator_vote: isCreator,
    };

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(votePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrorMsg("The poll options were recently updated. Refreshing...");
          setTimeout(fetchPoll, 1200);
          return;
        }
        throw new Error(data.error || "Failed to submit vote.");
      }

      setMyVotes(selectedIds);
      setShowSuggestInput(false);
      setCustomText("");
      await fetchPoll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to vote.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualResolve = async (optionId: string) => {
    if (!poll) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/poll`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreed_option_id: optionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to agree on option.");
      }

      await fetchPoll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to agree on option.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 text-center text-sm text-neutral-400">
        <Clock className="mx-auto h-5 w-5 animate-spin text-pink-400 mb-2" />
        Loading options...
      </div>
    );
  }

  if (!poll) return null;

  const allOptions: PollOption[] = [
    ...poll.options,
    ...poll.custom_suggestions.map((s) => ({
      id: s.id,
      text: s.text,
      icon: "💡",
    })),
  ];

  const hasVoted = myVotes.length > 0;
  const isClosed = poll.status === "closed" || (poll.closing_time && new Date(poll.closing_time) <= new Date());
  const resolvedOption = allOptions.find((o) => o.id === poll.resolved_option_id);

  // Check if there is a disagreement/tie in both_vote mode
  const bothHaveVoted = poll.creator_voted && poll.partner_voted;
  const isDisagreement = poll.selection_mode === "both_vote" && bothHaveVoted && !poll.resolved_option_id;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 via-black/60 to-black/80 backdrop-blur-2xl shadow-2xl transition-all"
    >
      {/* Header */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${palette.accent}25`,
                color: palette.accent,
                border: `1px solid ${palette.accent}50`,
              }}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Choice Cards &amp; Polls
            </span>

            {poll.selection_mode === "partner_chooses" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <UserCheck className="h-3 w-3" /> Partner Chooses
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Users className="h-3 w-3" /> Both Vote
              </span>
            )}
          </div>

          {isClosed && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-neutral-800 text-neutral-400 border border-neutral-700">
              Poll Closed
            </span>
          )}
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-white">
          {poll.question}
        </h2>

        {poll.description && (
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed italic">
            &ldquo;{poll.description}&rdquo;
          </p>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-5">
        {/* State A: Resolved Winner / Agreed Plan */}
        {resolvedOption && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-300">
              {poll.selection_mode === "partner_chooses"
                ? `${partnerName} Chose:`
                : "You Both Agree! 🎉"}
            </h3>

            <div className="my-3 inline-block px-5 py-2.5 rounded-xl bg-black/50 border border-emerald-500/30 text-base font-bold text-white shadow-lg">
              ✨ {resolvedOption.text}
            </div>

            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              * Note: A winning choice is not a confirmed plan until scheduled with an RSVP or date invitation.
            </p>

            {/* Next Action: Create a Date from this Choice */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onCreateDateFromChoice) {
                    onCreateDateFromChoice(resolvedOption.text);
                  } else {
                    const inviteEl = document.querySelector("#invitation_t02");
                    if (inviteEl) inviteEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Calendar className="h-4 w-4" />
                Create a Date from this Choice
              </button>
            </div>
          </div>
        )}

        {/* State B: Disagreement / Tie (No fake winner!) */}
        {isDisagreement && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-amber-200">Different Picks!</h3>
            <p className="text-xs text-neutral-300 max-w-md mx-auto">
              You both voted for different options. In QubitSells, ties remain unresolved without forced majority rules until you manually agree on one!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {allOptions
                .filter(
                  (o) =>
                    poll.creator_votes.includes(o.id) || poll.partner_votes.includes(o.id)
                )
                .map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleManualResolve(opt.id)}
                    className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-black/40 hover:bg-amber-500/20 text-xs text-amber-200 font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                    Agree on &ldquo;{opt.text}&rdquo;
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {allOptions.map((opt) => {
            const isSelected = selectedIds.includes(opt.id);
            const creatorPicked = poll.creator_votes.includes(opt.id);
            const partnerPicked = poll.partner_votes.includes(opt.id);
            const isWinner = poll.resolved_option_id === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isClosed || submitting}
                onClick={() => handleToggleOption(opt.id)}
                className={`relative text-left p-4 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                  isWinner
                    ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : isSelected
                    ? "border-pink-500 bg-pink-500/15 shadow-[0_0_20px_rgba(244,114,182,0.15)] ring-1 ring-pink-500/50"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {/* Optional Image */}
                {opt.image_url && (
                  <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={opt.image_url}
                      alt={opt.text}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex items-center gap-2">
                    {opt.icon && <span className="text-lg">{opt.icon}</span>}
                    <span className="font-bold text-sm text-white">{opt.text}</span>
                  </div>

                  {/* Radio / Checkbox Indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "border-pink-400 bg-pink-500"
                        : "border-white/30"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Vote Badges in Both Vote mode */}
                {poll.selection_mode === "both_vote" && (creatorPicked || partnerPicked) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {creatorPicked && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/25 text-purple-200 border border-purple-500/30">
                        {senderName}&apos;s Vote
                      </span>
                    )}
                    {partnerPicked && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-500/25 text-pink-200 border border-pink-500/30">
                        {partnerName}&apos;s Vote
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Suggest Something Else Form */}
        {poll.allow_custom_suggestion && !isClosed && (
          <div>
            {!showSuggestInput ? (
              <button
                type="button"
                onClick={() => setShowSuggestInput(true)}
                className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Suggest something else...
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 space-y-2.5">
                <label
                  htmlFor={`${inputId}-suggestion`}
                  className="block text-xs font-semibold text-neutral-300"
                >
                  Your Suggestion
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${inputId}-suggestion`}
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Try that new Italian gelato place!"
                    className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-400"
                  />
                  <button
                    type="button"
                    disabled={!customText.trim() || submitting}
                    onClick={() => handleVote(customText.trim())}
                    className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" /> Add &amp; Vote
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuggestInput(false);
                      setCustomText("");
                    }}
                    className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Voting Action Bar */}
        {!isClosed && (
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-neutral-400">
              {hasVoted ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Your vote is saved. You can change it anytime until closure.
                </span>
              ) : (
                <span>Pick your preference above and tap vote.</span>
              )}
            </div>

            <button
              type="button"
              disabled={selectedIds.length === 0 || submitting}
              onClick={() => handleVote()}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm shadow-[0_0_25px_rgba(244,114,182,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {submitting ? "Saving..." : hasVoted ? "Update Vote" : "Submit Vote"}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}
