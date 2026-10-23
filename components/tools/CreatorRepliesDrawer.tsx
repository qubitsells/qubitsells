"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  X,
  Heart,
  Clock,
  Camera,
  Volume2,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit3,
  MapPin,
  Video,
  ListFilter,
  Flame,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { InlineMediaGallery } from "@/components/MediaViewer";
import type {
  TemplateReply,
  TemplateInvitation,
  TemplatePoll,
  TemplateQuestionCard,
  TemplatePrivateReveal,
  QuestionAnswerItem,
  InvitationSlot,
} from "@/lib/supabase/coupleTemplates";

interface CreatorRepliesDrawerProps {
  templateCode: string;
  manageToken?: string | null;
  palette: {
    accent: string;
    glow: string;
    text: string;
    dark: string;
    card?: string;
  };
}

export function CreatorRepliesDrawer({
  templateCode,
  manageToken,
  palette,
}: CreatorRepliesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"replies" | "invitation" | "poll" | "questions" | "reveal">("replies");
  const [replies, setReplies] = useState<TemplateReply[]>([]);
  const [invitation, setInvitation] = useState<TemplateInvitation | null>(null);
  const [poll, setPoll] = useState<TemplatePoll | null>(null);
  const [questionCard, setQuestionCard] = useState<TemplateQuestionCard | null>(null);
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, QuestionAnswerItem> | null>(null);
  const [reveal, setReveal] = useState<TemplatePrivateReveal | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [managingAction, setManagingAction] = useState(false);
  const [privateNotes, setPrivateNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const fetchCreatorData = useCallback(async () => {
    try {
      const q = manageToken ? `?manage=${encodeURIComponent(manageToken)}` : "";
      const [repliesRes, invRes, pollRes, questionsRes, revealRes] = await Promise.all([
        fetch(`/api/templates/${encodeURIComponent(templateCode)}/replies${q}`),
        fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation${q}`),
        fetch(`/api/templates/${encodeURIComponent(templateCode)}/poll${q}`),
        fetch(`/api/templates/${encodeURIComponent(templateCode)}/questions${q}`),
        fetch(`/api/templates/${encodeURIComponent(templateCode)}/reveal${q}`),
      ]);

      const repliesData = await repliesRes.json();
      if (repliesRes.ok && repliesData.success && repliesData.is_creator) {
        setIsCreator(true);
        setReplies(repliesData.replies || []);
      } else {
        setIsCreator(false);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData.success && invData.invitation) {
          setInvitation(invData.invitation);
          setPrivateNotes(invData.invitation.sender_private_notes || "");
          if (invData.invitation.status === "counterproposed") {
            setActiveTab("invitation");
          }
        }
      }

      if (pollRes.ok) {
        const pollData = await pollRes.json();
        if (pollData.success && pollData.poll) {
          setPoll(pollData.poll);
        }
      }

      if (questionsRes.ok) {
        const qData = await questionsRes.json();
        if (qData.success && qData.card) {
          setQuestionCard(qData.card);
          if (qData.partner_submission?.answers) {
            setPartnerAnswers(qData.partner_submission.answers);
          }
        }
      }

      if (revealRes.ok) {
        const rData = await revealRes.json();
        if (rData.success && rData.reveal) {
          setReveal(rData.reveal);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [templateCode, manageToken]);

  useEffect(() => {
    void fetchCreatorData();
  }, [fetchCreatorData]);

  // If not creator, do not render creator drawer
  if (loading || !isCreator) return null;

  const copyManageLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const manageUrl = manageToken
      ? `${origin}/t/${templateCode}?manage=${manageToken}`
      : `${origin}/t/${templateCode}`;
    navigator.clipboard.writeText(manageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const togglePlayAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/reply`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_id: replyId,
          manage_token: manageToken || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplies((prev) => prev.filter((r) => r.id !== replyId));
      } else {
        alert(data.error || "Failed to delete reply.");
      }
    } catch {
      alert("Failed to delete reply.");
    }
  };

  const handleAcceptCounterproposal = async () => {
    if (!invitation) return;
    setManagingAction(true);
    try {
      const q = manageToken ? `?manage=${encodeURIComponent(manageToken)}` : "";
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation${q}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(manageToken ? { "x-manage-token": manageToken } : {}),
        },
        body: JSON.stringify({
          action_type: "accept_counterproposal",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvitation({
          ...invitation,
          status: "confirmed",
          selected_slot: invitation.counterproposal_slot,
          agreed_revision: invitation.revision,
        });
      } else {
        alert(data.error || "Failed to accept counterproposal.");
      }
    } catch {
      alert("Failed to accept counterproposal.");
    } finally {
      setManagingAction(false);
    }
  };

  const handleSavePrivateNotes = async () => {
    if (!invitation) return;
    setManagingAction(true);
    try {
      const q = manageToken ? `?manage=${encodeURIComponent(manageToken)}` : "";
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation${q}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(manageToken ? { "x-manage-token": manageToken } : {}),
        },
        body: JSON.stringify({
          action_type: "update_notes",
          new_private_notes: privateNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditingNotes(false);
        setInvitation({
          ...invitation,
          sender_private_notes: privateNotes.trim(),
        });
      } else {
        alert(data.error || "Failed to update private notes.");
      }
    } catch {
      alert("Failed to update private notes.");
    } finally {
      setManagingAction(false);
    }
  };

  const handleResolvePoll = async (agreedOptionId: string) => {
    if (!poll) return;
    setManagingAction(true);
    try {
      const q = manageToken ? `?manage=${encodeURIComponent(manageToken)}` : "";
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/poll${q}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(manageToken ? { "x-manage-token": manageToken } : {}),
        },
        body: JSON.stringify({ agreed_option_id: agreedOptionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPoll({
          ...poll,
          resolved_option_id: agreedOptionId,
          status: "resolved",
        });
      } else {
        alert(data.error || "Failed to resolve poll.");
      }
    } catch {
      alert("Failed to resolve poll.");
    } finally {
      setManagingAction(false);
    }
  };

  const hasCounterproposal = invitation?.status === "counterproposed";

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full backdrop-blur-xl border border-white/20 text-white font-medium shadow-2xl flex items-center gap-2.5 transition-all"
        style={{
          backgroundColor: "rgba(15, 12, 41, 0.85)",
          boxShadow: `0 8px 32px ${palette.glow}50`,
        }}
      >
        <div className="relative">
          <Inbox className="w-5 h-5 text-pink-300" />
          {(replies.length > 0 || hasCounterproposal) && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {replies.length + (hasCounterproposal ? 1 : 0)}
            </span>
          )}
        </div>
        <span className="text-xs md:text-sm">Creator Center</span>
      </motion.button>

      {/* Drawer Overlay & Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-over Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-[#0d0918]/95 border-l border-white/10 shadow-2xl flex flex-col z-10 text-white overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: palette.accent }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Creator Dashboard</h3>
                    <p className="text-xs text-white/50">Manage replies & invitations</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs: Replies, Date RSVP, Poll, Questions & Reveal */}
              {(invitation || poll || questionCard || reveal) && (
                <div className="flex border-b border-white/10 bg-black/20 px-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("replies")}
                    className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "replies"
                        ? "border-pink-500 text-white"
                        : "border-transparent text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>Replies ({replies.length})</span>
                  </button>

                  {invitation && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("invitation")}
                      className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "invitation"
                          ? "border-pink-500 text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Date & RSVP</span>
                      {hasCounterproposal && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </button>
                  )}

                  {poll && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("poll")}
                      className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "poll"
                          ? "border-pink-500 text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>Poll</span>
                      {poll.partner_voted && !poll.resolved_option_id && (
                        <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                      )}
                    </button>
                  )}

                  {questionCard && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("questions")}
                      className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "questions"
                          ? "border-pink-500 text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Questions</span>
                      {partnerAnswers && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  )}

                  {reveal && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("reveal")}
                      className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "reveal"
                          ? "border-pink-500 text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Reveal</span>
                      {reveal.is_eligible && !reveal.is_revealed && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Cross-Device Notice & Copy Manage Link */}
              <div className="p-4 bg-white/5 border-b border-white/10 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Authorized Creator View
                  </span>
                  <button
                    type="button"
                    onClick={copyManageLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy Manage Link"}</span>
                  </button>
                </div>
                <p className="text-white/40 leading-relaxed text-[11px]">
                  Bookmark or copy your secret manage link to view replies and invitation RSVP anytime from your phone or another device.
                </p>
              </div>

              {/* TAB 1: REPLIES */}
              {activeTab === "replies" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {replies.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/40">
                      <Inbox className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium text-white/60">No replies yet</p>
                      <p className="text-xs mt-1 max-w-xs">
                        When your partner leaves a text, photo, or voice message on your template link, it will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    replies.map((reply) => {
                      return (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3"
                        >
                          {/* Author & Timestamp */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                                style={{ backgroundColor: palette.accent }}
                              >
                                {reply.author_name ? reply.author_name[0]?.toUpperCase() : "M"}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">
                                  {reply.author_name || "My Love"}
                                </p>
                                <p className="text-[10px] text-white/40 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(reply.created_at).toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </p>
                              </div>
                            </div>

                            {reply.reaction && (
                              <span className="text-2xl">{reply.reaction}</span>
                            )}
                          </div>

                          {/* Message */}
                          {reply.message && (
                            <p className="text-xs md:text-sm text-white/90 font-serif italic bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                              &ldquo;{reply.message}&rdquo;
                            </p>
                          )}

                          {/* Media Attachments: Photos, Voice Notes & Videos */}
                          {Array.isArray(reply.media_items) && reply.media_items.length > 0 && (
                            <InlineMediaGallery
                              mediaItems={reply.media_items}
                              shortCode={templateCode}
                              authorName={reply.author_name || "My Love"}
                              createdDate={new Date(reply.created_at).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                              paletteTheme="dark"
                            />
                          )}

                          {/* Actions */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-[11px] text-rose-400/70 hover:text-rose-300 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: INVITATION & RSVP */}
              {activeTab === "invitation" && invitation && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Status</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          invitation.status === "confirmed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : invitation.status === "counterproposed"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                            : invitation.status === "declined"
                            ? "bg-neutral-800 text-neutral-400 border border-neutral-700"
                            : invitation.status === "deferred"
                            ? "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30"
                            : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                        }`}
                      >
                        {invitation.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white">{invitation.activity}</h4>

                    {invitation.recipient_note && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200">
                        <span className="text-[10px] text-pink-400 font-semibold block mb-1">
                          Partner&apos;s note:
                        </span>
                        &ldquo;{invitation.recipient_note}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Pending Counterproposal Card */}
                  {invitation.status === "counterproposed" && invitation.counterproposal_slot && (
                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>Partner Suggested Alternative Time</span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/50 border border-amber-500/30 text-xs text-amber-100">
                        <p className="font-medium">
                          {invitation.counterproposal_slot.start_time}
                        </p>
                        {invitation.counterproposal_slot.label && (
                          <p className="text-[11px] text-amber-300/80 mt-1">
                            Note: {invitation.counterproposal_slot.label}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={managingAction}
                        onClick={handleAcceptCounterproposal}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {managingAction ? "Accepting..." : "Accept Partner's Counterproposal"}
                      </button>
                    </div>
                  )}

                  {/* Confirmed Slot Details */}
                  {invitation.status === "confirmed" && invitation.selected_slot && (
                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Agreed Date & Time</span>
                      </div>
                      <p className="text-sm font-medium text-white">
                        {invitation.selected_slot.start_time}
                      </p>
                      <p className="text-[11px] text-emerald-400/80">
                        Agreed on revision {invitation.agreed_revision || invitation.revision}
                      </p>
                    </div>
                  )}

                  {/* Private Surprise Notes (Secret - only visible to creator) */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                        Private Surprise Notes
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingNotes(!isEditingNotes)}
                        className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditingNotes ? "Cancel" : "Edit"}
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Only you can see this. Keep secret plans, gift locations, or reservation codes here.
                    </p>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={privateNotes}
                          onChange={(e) => setPrivateNotes(e.target.value)}
                          placeholder="e.g. Flowers hidden in car, table #12 booked under Marsad..."
                          className="w-full rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white placeholder-neutral-500 focus:border-purple-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={managingAction}
                          onClick={handleSavePrivateNotes}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                        >
                          {managingAction ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5">
                        {invitation.sender_private_notes || "No secret notes yet."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: POLL & CHOICES */}
              {activeTab === "poll" && poll && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">Poll Status</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          poll.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : poll.status === "closed"
                            ? "bg-neutral-800 text-neutral-400 border border-neutral-700"
                            : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                        }`}
                      >
                        {poll.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white">{poll.question}</h4>

                    <div className="flex gap-2 text-[11px] text-neutral-400">
                      <span>Mode: {poll.selection_mode === "partner_chooses" ? "Partner Chooses" : "Both Vote"}</span>
                      <span>•</span>
                      <span>{poll.partner_voted ? "Partner Voted ✓" : "Partner Hasn't Voted Yet"}</span>
                    </div>
                  </div>

                  {/* Disagreement / Tie Manual Resolve */}
                  {poll.selection_mode === "both_vote" && poll.creator_voted && poll.partner_voted && !poll.resolved_option_id && (
                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                        <Flame className="w-4 h-4" />
                        <span>Tie or Different Choices</span>
                      </div>
                      <p className="text-xs text-neutral-300">
                        In QubitSells, different votes do not pick a fake winner. You can agree manually on either choice:
                      </p>
                      <div className="space-y-2">
                        {[...poll.options, ...poll.custom_suggestions.map((s) => ({ id: s.id, text: s.text }))].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={managingAction}
                            onClick={() => handleResolvePoll(opt.id)}
                            className="w-full text-left p-2.5 rounded-xl border border-amber-500/30 bg-black/50 hover:bg-amber-500/20 text-xs text-amber-200 font-medium transition-colors flex items-center justify-between"
                          >
                            <span>{opt.text}</span>
                            <span className="text-[10px] text-amber-400">Agree on this →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolved Winner */}
                  {poll.resolved_option_id && (
                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-center">
                      <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
                      <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                        Agreed / Selected Choice
                      </p>
                      <p className="text-base font-bold text-white">
                        {[...poll.options, ...poll.custom_suggestions.map((s) => ({ id: s.id, text: s.text }))].find(
                          (o) => o.id === poll.resolved_option_id
                        )?.text || poll.resolved_option_id}
                      </p>
                    </div>
                  )}

                  {/* All Options & Votes Breakdown */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Options &amp; Votes
                    </p>
                    {[...poll.options, ...poll.custom_suggestions.map((s) => ({ id: s.id, text: s.text }))].map((opt) => {
                      const creatorVotedThis = poll.creator_votes.includes(opt.id);
                      const partnerVotedThis = poll.partner_votes.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-white">{opt.text}</span>
                          <div className="flex gap-1.5">
                            {creatorVotedThis && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/30 text-purple-200 border border-purple-500/40">
                                You
                              </span>
                            )}
                            {partnerVotedThis && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/30 text-pink-200 border border-pink-500/40">
                                Partner
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Questions */}
              {activeTab === "questions" && questionCard && (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-pink-400" />
                      <span>{questionCard.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        v{questionCard.revision}
                      </span>
                    </h4>
                    {questionCard.description && (
                      <p className="text-xs text-neutral-400 mt-1">{questionCard.description}</p>
                    )}
                  </div>

                  {partnerAnswers ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Partner has submitted their answers!</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Answers are saved and synced for question revision v{questionCard.revision}.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-xs font-semibold text-white/80">No submission yet</p>
                      <p className="text-[11px] text-white/50 mt-1">
                        Your partner hasn&apos;t submitted their answers yet. Drafts remain private to their device until submitted.
                      </p>
                    </div>
                  )}

                  {/* List questions and answers */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Questions &amp; Responses
                    </p>
                    {questionCard.questions.map((q, idx) => {
                      const pAns = partnerAnswers ? partnerAnswers[q.id] : null;

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-white">
                              {idx + 1}. {q.prompt}
                            </span>
                            {pAns ? (
                              pAns.skipped ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50">
                                  Skipped
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/30 text-pink-200 border border-pink-500/40">
                                  Answered
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">
                                Pending
                              </span>
                            )}
                          </div>

                          {/* Partner answer */}
                          {pAns && !pAns.skipped && (
                            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-white/90">
                              <span className="text-[10px] uppercase font-bold text-pink-300 block mb-0.5">
                                Partner&apos;s answer
                              </span>
                              {pAns.selected_choice || pAns.answer_text || "—"}
                            </div>
                          )}

                          {/* Sender answer */}
                          {q.sender_answer && (
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-white/90">
                              <span className="text-[10px] uppercase font-bold text-purple-300 block mb-0.5">
                                Your note / answer
                              </span>
                              {q.sender_answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Private Reveal */}
              {activeTab === "reveal" && reveal && (
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Private Reveal</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        {reveal.is_revealed
                          ? "Revealed"
                          : reveal.is_eligible
                          ? "Ready"
                          : "Locked & Waiting"}
                      </span>
                    </h4>
                    <p className="text-xs text-neutral-300 mt-1 font-medium">{reveal.prompt}</p>
                  </div>

                  {reveal.is_revealed ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                        <h5 className="text-sm font-semibold text-white">Answers Unlocked</h5>
                        <p className="text-xs text-neutral-300 mt-0.5">
                          Information already seen cannot be made unseen.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                          <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                            Your Answer
                          </span>
                          <p className="text-white font-medium">
                            {reveal.my_answer?.main || Object.values(reveal.my_answer || {})[0] || "—"}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs">
                          <span className="text-[10px] uppercase font-bold text-pink-300 block mb-1">
                            Partner&apos;s Answer
                          </span>
                          <p className="text-white font-medium">
                            {reveal.partner_answer?.main || Object.values(reveal.partner_answer || {})[0] || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : reveal.is_eligible ? (
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center space-y-2">
                      <Sparkles className="w-6 h-6 text-purple-300 mx-auto" />
                      <h5 className="text-sm font-bold text-white">Both Answers Locked!</h5>
                      <p className="text-xs text-neutral-300">
                        Both you and your partner have submitted sealed answers. You can reveal them together on the template page.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Your Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          reveal.creator_locked ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"
                        }`}>
                          {reveal.creator_locked ? "Answer Locked" : "Not Locked Yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Partner Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          reveal.partner_locked ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"
                        }`}>
                          {reveal.partner_locked ? "Answer Locked" : "Waiting for partner"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 pt-1 border-t border-white/5">
                        * In accordance with privacy rules, partner answers are completely withheld until both sides lock.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
