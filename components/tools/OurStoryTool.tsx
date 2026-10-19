"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
  Upload,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Eye,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  OurStoryToolConfig,
  StoryCard,
  StoryPartnerContribution,
  TemplateOurStory,
} from "@/lib/supabase/coupleTemplates";

interface OurStoryToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config: OurStoryToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function OurStoryTool({
  templateCode,
  partnerName = "You",
  senderName = "Me",
  config,
  palette: propPalette,
}: OurStoryToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  // Sort cards by order
  const sortedCards = [...(config?.cards || [])].sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [partnerSide, setPartnerSide] = useState<StoryPartnerContribution | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Partner contribution form state
  const [isContributing, setIsContributing] = useState(false);
  const [authorName, setAuthorName] = useState(partnerName || "My Love");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Zoomed photo modal
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Total slides = sortedCards.length + (partnerSide ? 1 : (isCreator ? 1 : 1))
  const hasPartnerContributed = Boolean(partnerSide);
  const totalSlides = sortedCards.length + (hasPartnerContributed ? 1 : 1);
  const isEndingSlide = currentIndex === sortedCards.length;

  // 1. Fetch story state from API
  const fetchStoryState = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/our-story`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && data.story) {
        setIsCreator(Boolean(data.is_creator));
        setIsPartner(Boolean(data.is_partner));
        if (data.story.partner_contribution) {
          setPartnerSide(data.story.partner_contribution);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [templateCode]);

  useEffect(() => {
    fetchStoryState();
  }, [fetchStoryState]);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select an image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setSubmitError("Photo must be smaller than 25 MB.");
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress("Uploading photo...");
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "bonded/template_replies");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Upload failed.");
      }

      setPhotoUrl(data.url);
      setAssetId(data.public_id || null);
      setUploadProgress(null);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Partner Side
  const handleSubmitPartnerSide = async () => {
    if (!photoUrl) {
      setSubmitError("Please add a photo for your side of the story.");
      return;
    }
    if (!caption.trim()) {
      setSubmitError("Please write a short caption or memory.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/our-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: authorName.trim() || partnerName || "My Love",
          caption: caption.trim(),
          photo_url: photoUrl,
          date: date.trim() || null,
          asset_id: assetId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to submit your story contribution.");
      }

      setPartnerSide(data.partner_contribution);
      setIsContributing(false);
      setIsPartner(true);

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [palette.accent, "#ec4899", "#f43f5e", "#fbbf24"],
        });
      } catch {
        // Confetti non-fatal
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error saving contribution.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Partner Contribution
  const handleDeletePartnerSide = async () => {
    if (!confirm("Are you sure you want to remove your side of the story?")) return;

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/our-story`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPartnerSide(null);
        setPhotoUrl("");
        setCaption("");
        setDate("");
      } else {
        alert(data.message || "Failed to remove contribution.");
      }
    } catch {
      alert("Connection error. Could not remove contribution.");
    }
  };

  const nextSlide = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentCard = !isEndingSlide ? sortedCards[currentIndex] : null;

  return (
    <div
      className="my-10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl border relative overflow-hidden transition-all duration-300"
      style={{
        background: palette.card || "rgba(15, 23, 42, 0.75)",
        borderColor: `${palette.accent}33`,
        boxShadow: `0 20px 40px -15px ${palette.glow}`,
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: palette.accent }} />
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: palette.text }}>
              {config?.title || "Our Story Memories"}
            </h3>
          </div>
          {config?.description && (
            <p className="text-sm mt-1 text-slate-300/80 font-light max-w-xl">
              {config.description}
            </p>
          )}
        </div>

        {/* Slide Indicator Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full text-xs font-medium border bg-white/5 border-white/10 text-slate-300">
            {isEndingSlide ? "Ending: Partner's Side" : `Moment ${currentIndex + 1} of ${sortedCards.length}`}
          </div>
        </div>
      </div>

      {/* Main Slide Carousel Area */}
      <div className="relative min-h-[420px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!isEndingSlide && currentCard ? (
            /* Sender Story Card */
            <motion.div
              key={`card-${currentCard.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
            >
              {/* Photo Frame */}
              <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 aspect-[4/3] flex items-center justify-center">
                <img
                  src={currentCard.photo_url}
                  alt={currentCard.caption || "Story moment"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                  onClick={() => setZoomedPhoto(currentCard.photo_url)}
                />
                <button
                  type="button"
                  onClick={() => setZoomedPhoto(currentCard.photo_url)}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View full photo"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Caption & Metadata */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                    style={{
                      background: `${palette.accent}20`,
                      color: palette.accent,
                      border: `1px solid ${palette.accent}40`,
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Chapter {currentCard.order + 1}
                  </span>

                  {currentCard.date && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {currentCard.date}
                    </span>
                  )}
                </div>

                <div
                  className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 relative"
                  style={{
                    boxShadow: `inset 0 0 20px ${palette.glow}`,
                  }}
                >
                  <p className="text-base sm:text-lg text-slate-200 leading-relaxed italic font-light">
                    &ldquo;{currentCard.caption}&rdquo;
                  </p>
                  <div className="mt-3 text-right text-xs font-medium text-slate-400">
                    — Written by {senderName || "Sender"}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Ending Slide: "Add your side" */
            <motion.div
              key="ending-slide"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {hasPartnerContributed && partnerSide ? (
                /* Partner Contributed Card (Grand Finale) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 aspect-[4/3] flex items-center justify-center">
                    <img
                      src={partnerSide.photo_url}
                      alt={partnerSide.caption || "Partner's side"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                      onClick={() => setZoomedPhoto(partnerSide.photo_url)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomedPhoto(partnerSide.photo_url)}
                      className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{
                          background: `${palette.accent}25`,
                          color: palette.accent,
                          border: `1px solid ${palette.accent}50`,
                        }}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        {partnerSide.author_name}&apos;s Side
                      </span>

                      {(isPartner || isCreator) && (
                        <button
                          type="button"
                          onClick={handleDeletePartnerSide}
                          className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1 transition-colors"
                          title="Remove contribution"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div
                      className="p-5 rounded-2xl bg-white/[0.05] border border-white/15 relative"
                      style={{
                        boxShadow: `0 10px 25px -10px ${palette.glow}`,
                      }}
                    >
                      <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-normal">
                        &ldquo;{partnerSide.caption}&rdquo;
                      </p>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span>Contributed by {partnerSide.author_name}</span>
                        {partnerSide.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {partnerSide.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : isCreator ? (
                /* Creator Waiting Card */
                <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: palette.accent }} />
                  <h4 className="text-lg font-semibold text-slate-200">
                    Waiting for {partnerName || "your partner"}&apos;s side
                  </h4>
                  <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
                    When {partnerName || "your partner"} views this story, they can add their own photo and memory right here.
                  </p>
                </div>
              ) : !isContributing ? (
                /* Partner "Add your side" Prompt */
                <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-white/20 bg-white/[0.03]">
                  <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: palette.accent }} />
                  <h4 className="text-lg sm:text-xl font-bold text-slate-100">
                    Add Your Side of Our Story
                  </h4>
                  <p className="text-sm text-slate-300/80 max-w-md mx-auto mt-2">
                    Complete this story with your favorite photo and your own personal memory.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsContributing(true)}
                    className="mt-6 px-6 py-2.5 rounded-full font-medium text-sm text-white shadow-lg transition-transform hover:scale-105 inline-flex items-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, #ec4899)`,
                      boxShadow: `0 8px 20px -6px ${palette.accent}80`,
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Contribute Your Photo & Caption
                  </button>
                </div>
              ) : (
                /* Partner Contribution Form */
                <div className="p-6 rounded-2xl border border-white/15 bg-white/[0.04] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" style={{ color: palette.accent }} />
                      <h4 className="font-semibold text-sm sm:text-base text-slate-100">
                        Add Your Side of the Story
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsContributing(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Photo picker & preview */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">Your Photo (1 photo)</label>
                    {photoUrl ? (
                      <div className="relative w-full max-w-xs h-40 rounded-xl overflow-hidden border border-white/20">
                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl("");
                            setAssetId(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-dashed border-white/25 hover:border-white/50 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingPhoto ? (uploadProgress || "Uploading...") : "Upload a photo from your device"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Caption & Date inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-300">Your caption or memory</label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write your side of our story..."
                        rows={2}
                        maxLength={500}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/40 resize-none"
                      />
                      <div className="text-[10px] text-slate-400 text-right">{caption.length}/500</div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">Date (optional)</label>
                      <input
                        type="text"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        placeholder="e.g. October 2024"
                        maxLength={50}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/40"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsContributing(false)}
                      className="px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPartnerSide}
                      disabled={submitting || uploadingPhoto}
                      className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-transform hover:scale-105 disabled:opacity-50"
                      style={{
                        background: palette.accent,
                        boxShadow: `0 4px 15px -3px ${palette.glow}`,
                      }}
                    >
                      {submitting ? "Saving..." : "Save My Side"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Carousel Navigation Footer */}
      <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className="p-2.5 rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Previous moment"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel Dots */}
        <div className="flex items-center gap-1.5">
          {sortedCards.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? "w-6 bg-white"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              style={{
                backgroundColor: currentIndex === idx ? palette.accent : undefined,
              }}
              title={`Go to moment ${idx + 1}`}
            />
          ))}
          {/* Ending dot */}
          <button
            type="button"
            onClick={() => setCurrentIndex(sortedCards.length)}
            className={`h-2 rounded-full transition-all duration-300 ${
              isEndingSlide
                ? "w-6 bg-white"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            style={{
              backgroundColor: isEndingSlide ? palette.accent : undefined,
            }}
            title="Go to ending"
          />
        </div>

        <button
          type="button"
          onClick={nextSlide}
          disabled={currentIndex === totalSlides - 1}
          className="p-2.5 rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Next moment"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Privacy and Retention Notice */}
      <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-light">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          Private to the couple. Contributions follow template expiration &amp; deletion rules.
        </span>
        <span className="hidden sm:inline">Not permanent album storage</span>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img
                src={zoomedPhoto}
                alt="Enlarged view"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
