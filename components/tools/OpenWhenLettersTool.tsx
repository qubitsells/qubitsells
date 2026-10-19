"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MailOpen,
  Heart,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { OpenWhenToolConfig, OpenWhenEnvelope, TemplateOpenWhenLetters } from "@/lib/supabase/coupleTemplates";

interface OpenWhenLettersToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config: OpenWhenToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function OpenWhenLettersTool({
  templateCode,
  partnerName = "You",
  senderName = "Me",
  config,
  palette: propPalette,
}: OpenWhenLettersToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [openedEnvelopes, setOpenedEnvelopes] = useState<Record<string, { opened_at: string }>>({});
  const [activeEnvelopeId, setActiveEnvelopeId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  // Read opened state from localStorage on mount
  useEffect(() => {
    try {
      const localOpened: Record<string, { opened_at: string }> = {};
      config.envelopes.forEach((env) => {
        const val = localStorage.getItem(`bonded_open_when_${templateCode}_${env.id}`);
        if (val) {
          localOpened[env.id] = { opened_at: val };
        }
      });
      if (Object.keys(localOpened).length > 0) {
        setOpenedEnvelopes((prev) => ({ ...localOpened, ...prev }));
      }
    } catch {
      // silent
    }
  }, [templateCode, config.envelopes]);

  // Fetch server state
  const fetchLetters = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/open-when`);
      if (!res.ok) throw new Error("Could not load letters.");
      const data = await res.json();
      if (data.letters?.opened_envelopes) {
        setOpenedEnvelopes((prev) => ({
          ...prev,
          ...data.letters.opened_envelopes,
        }));
      }
      setIsCreator(Boolean(data.is_creator));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [templateCode]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  // Open an envelope
  const handleOpenEnvelope = async (envelope: OpenWhenEnvelope) => {
    const isAlreadyOpened = Boolean(openedEnvelopes[envelope.id]);
    setActiveEnvelopeId(envelope.id);

    if (!isAlreadyOpened) {
      const nowIso = new Date().toISOString();

      // Optimistic update
      setOpenedEnvelopes((prev) => ({
        ...prev,
        [envelope.id]: { opened_at: nowIso },
      }));

      try {
        localStorage.setItem(`bonded_open_when_${templateCode}_${envelope.id}`, nowIso);
      } catch {
        // silent
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: [palette.accent, "#ec4899", "#f59e0b"],
        });
      } catch {
        // silent
      }

      // Persist to server
      try {
        await fetch(`/api/templates/${encodeURIComponent(templateCode)}/open-when`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envelope_id: envelope.id }),
        });
      } catch {
        // silent
      }
    }
  };

  const scrollToReply = (envelopeOccasion: string) => {
    const el = document.getElementById("reply_t01");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading && config.envelopes.length === 0) {
    return (
      <div
        className="w-full max-w-xl mx-auto my-6 p-6 rounded-3xl border animate-pulse backdrop-blur-xl"
        style={{ backgroundColor: "rgba(18, 12, 28, 0.6)", borderColor: `${palette.accent}25` }}
      >
        <div className="h-5 w-48 bg-white/10 rounded-full mb-3" />
        <div className="h-4 w-72 bg-white/5 rounded-full" />
      </div>
    );
  }

  return (
    <div
      id="open_when_t09"
      className="w-full max-w-xl mx-auto my-6 rounded-3xl overflow-hidden border backdrop-blur-xl shadow-2xl relative transition-all"
      style={{
        backgroundColor: "rgba(18, 12, 28, 0.8)",
        borderColor: `${palette.accent}35`,
        boxShadow: `0 12px 40px -8px ${palette.glow}25`,
      }}
    >
      {/* Header */}
      <div className="p-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
              style={{
                backgroundColor: palette.accent,
                boxShadow: `0 4px 14px ${palette.accent}50`,
              }}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-pink-300">
                  Open When Letters
                </span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {config.envelopes.length} {config.envelopes.length === 1 ? "Letter" : "Letters"}
                </span>
              </div>
              <h3 className="font-bold text-white text-base md:text-lg tracking-tight mt-0.5">
                {config.title || "Open When Letters"}
              </h3>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/60 mt-2 leading-relaxed">
          {config.description ||
            "These envelopes open whenever you choose — for comfort, love, and sweet memories."}
        </p>

        {/* Explicit choice reminder */}
        <div className="mt-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white/70">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
          <span>
            Open by choice: Open each letter whenever the moment feels right for you.
          </span>
        </div>
      </div>

      {/* Envelopes List */}
      <div className="p-5 space-y-4">
        {config.envelopes.map((env, idx) => {
          const isOpened = Boolean(openedEnvelopes[env.id]);
          const isExpanded = activeEnvelopeId === env.id;
          const openedAt = openedEnvelopes[env.id]?.opened_at;

          return (
            <div
              key={env.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded ? "ring-2 ring-pink-500/40" : ""
              }`}
              style={{
                backgroundColor: isExpanded
                  ? "rgba(255, 255, 255, 0.07)"
                  : "rgba(255, 255, 255, 0.03)",
                borderColor: isExpanded ? `${palette.accent}60` : "rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Envelope Card Header / Button */}
              <button
                type="button"
                onClick={() => {
                  if (isExpanded) {
                    setActiveEnvelopeId(null);
                  } else {
                    handleOpenEnvelope(env);
                  }
                }}
                className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/5 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Wax Seal / Envelope Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform ${
                      isOpened ? "bg-rose-500/20 text-rose-300" : "text-white"
                    }`}
                    style={{
                      backgroundColor: isOpened ? undefined : `${palette.accent}25`,
                    }}
                  >
                    {isOpened ? (
                      <MailOpen className="w-5 h-5 text-rose-300" />
                    ) : (
                      <div className="relative">
                        <Mail className="w-5 h-5 text-white/90" />
                        {/* Wax seal dot */}
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full shadow-md flex items-center justify-center text-[7px]"
                          style={{ backgroundColor: palette.accent }}
                        >
                          ♥
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                      Letter #{idx + 1}
                    </span>
                    <h4 className="font-bold text-sm md:text-base text-white truncate">
                      {env.occasion.toLowerCase().startsWith("open when")
                        ? env.occasion
                        : `Open when ${env.occasion}`}
                    </h4>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">
                      {isOpened && openedAt ? (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 inline" />
                          <span>
                            Opened on{" "}
                            {new Date(openedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            • Tap to reread
                          </span>
                        </span>
                      ) : (
                        "Sealed • Tap to open when you're ready"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOpened && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 hidden sm:inline-block">
                      Reread
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  )}
                </div>
              </button>

              {/* Opened Letter Content Expansion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-white/10 p-5 space-y-4 bg-black/30"
                  >
                    {/* Decorative Letter Paper Container */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 relative space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-white/50 border-b border-white/10 pb-2.5">
                        <span className="font-medium">
                          From: <strong className="text-white">{senderName}</strong>
                        </span>
                        {openedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>First opened {new Date(openedAt).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      {/* Letter message */}
                      <div className="text-sm md:text-base text-white/95 leading-relaxed whitespace-pre-wrap select-text font-serif italic py-1">
                        &ldquo;{env.message}&rdquo;
                      </div>

                      {/* Attached media if present */}
                      {env.mediaUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/15 max-h-80 relative shadow-xl bg-black/50">
                          {env.mediaType === "video" ? (
                            <video
                              src={env.mediaUrl}
                              controls
                              className="w-full h-auto max-h-80 object-cover"
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={env.mediaUrl}
                              alt={`Memory for ${env.occasion}`}
                              className="w-full h-auto max-h-80 object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions: Reply and Close */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {config.attachReply !== false && (
                        <button
                          type="button"
                          onClick={() => scrollToReply(env.occasion)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
                          style={{
                            backgroundColor: palette.accent,
                            boxShadow: `0 4px 14px ${palette.accent}40`,
                          }}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reply to this letter</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveEnvelopeId(null)}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-auto"
                      >
                        Fold letter
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
