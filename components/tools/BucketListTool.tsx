"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Heart,
  Calendar,
  CheckCircle2,
  Sparkles,
  Plus,
  Camera,
  Upload,
  X,
  Clock,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Filter,
  Check,
  AlertCircle,
  HelpCircle,
  PartyPopper,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  BucketListToolConfig,
  BucketListItem,
  BucketItemStatus,
  TemplateBucketList,
} from "@/lib/supabase/coupleTemplates";

interface BucketListToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config: BucketListToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function BucketListTool({
  templateCode,
  partnerName = "You",
  senderName = "Me",
  config,
  palette: propPalette,
}: BucketListToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [items, setItems] = useState<BucketListItem[]>(config?.items || []);
  const [isCreator, setIsCreator] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [filter, setFilter] = useState<"all" | BucketItemStatus>("all");
  const [loading, setLoading] = useState(true);

  // New Idea form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Memory capture state
  const [capturingMemoryItemId, setCapturingMemoryItemId] = useState<string | null>(null);
  const [memoryNote, setMemoryNote] = useState("");
  const [memoryPhotoUrl, setMemoryPhotoUrl] = useState("");
  const [memoryAssetId, setMemoryAssetId] = useState<string | null>(null);
  const [uploadingMemoryPhoto, setUploadingMemoryPhoto] = useState(false);
  const [memoryUploadError, setMemoryUploadError] = useState<string | null>(null);
  const [savingMemory, setSavingMemory] = useState(false);

  // Planning feedback banner
  const [planningBanner, setPlanningBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Fetch live bucket list from API
  const fetchBucketList = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/bucket-list`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && data.bucket_list) {
        setIsCreator(Boolean(data.is_creator));
        setIsPartner(Boolean(data.is_partner));
        if (Array.isArray(data.bucket_list.items)) {
          setItems(data.bucket_list.items);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [templateCode]);

  useEffect(() => {
    fetchBucketList();
  }, [fetchBucketList]);

  // Handle action mutations
  const handleMutate = async (
    action: "add_item" | "toggle_interest" | "plan_item" | "complete_item" | "attach_memory" | "revert_status",
    itemId?: string,
    payload?: Record<string, unknown>
  ) => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/bucket-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          item_id: itemId || null,
          payload: payload || {},
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Action failed.");
      }

      if (Array.isArray(data.items)) {
        setItems(data.items);
      }

      return data;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update bucket list.");
      throw err;
    }
  };

  // 2. Add New Idea
  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAddError("Please enter an adventure or idea title.");
      return;
    }

    setAddingLoading(true);
    setAddError(null);

    try {
      await handleMutate("add_item", undefined, {
        title: newTitle.trim(),
        note: newNote.trim() || null,
      });

      setNewTitle("");
      setNewNote("");
      setIsAdding(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add idea.");
    } finally {
      setAddingLoading(false);
    }
  };

  // 3. Toggle Interest
  const handleToggleInterest = async (itemId: string) => {
    await handleMutate("toggle_interest", itemId);
  };

  // 4. "Let's plan this" Action
  const handlePlanThis = async (item: BucketListItem) => {
    try {
      await handleMutate("plan_item", item.id);

      setPlanningBanner(
        `Draft created for "${item.title}"! Scroll down to the Date Invitation flow to pick a time together. (This does not automatically confirm an event until you both agree.)`
      );

      // Check if invitation tool is present on page and scroll smoothly
      const inviteEl = document.getElementById("invitation_t02");
      if (inviteEl) {
        inviteEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // handled
    }
  };

  // 5. Explicit Completion Action
  const handleComplete = async (itemId: string) => {
    try {
      await handleMutate("complete_item", itemId);

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [palette.accent, "#ec4899", "#10b981", "#fbbf24"],
        });
      } catch {
        // Confetti non-fatal
      }
    } catch {
      // handled
    }
  };

  // 6. Memory photo upload for completed item
  const handleMemoryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMemoryUploadError("Please choose an image file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setMemoryUploadError("Photo must be smaller than 25 MB.");
      return;
    }

    setUploadingMemoryPhoto(true);
    setMemoryUploadError(null);

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

      setMemoryPhotoUrl(data.url);
      setMemoryAssetId(data.public_id || null);
    } catch (err: unknown) {
      setMemoryUploadError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingMemoryPhoto(false);
    }
  };

  // Save attached memory
  const handleSaveMemory = async (itemId: string) => {
    if (!memoryPhotoUrl && !memoryNote.trim()) {
      setMemoryUploadError("Please upload a photo or write a memory note.");
      return;
    }

    setSavingMemory(true);
    setMemoryUploadError(null);

    try {
      await handleMutate("attach_memory", itemId, {
        memory_photo_url: memoryPhotoUrl || null,
        memory_note: memoryNote.trim() || null,
        asset_id: memoryAssetId || null,
      });

      setCapturingMemoryItemId(null);
      setMemoryPhotoUrl("");
      setMemoryNote("");
      setMemoryAssetId(null);
    } catch (err: unknown) {
      setMemoryUploadError(err instanceof Error ? err.message : "Failed to save memory.");
    } finally {
      setSavingMemory(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const countWished = items.filter((i) => i.status === "wished").length;
  const countPlanning = items.filter((i) => i.status === "planning").length;
  const countCompleted = items.filter((i) => i.status === "completed").length;

  return (
    <div
      id="bucket_list_t11"
      className="my-10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl border relative overflow-hidden transition-all duration-300 select-text"
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
            <Compass className="w-5 h-5" style={{ color: palette.accent }} />
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: palette.text }}>
              {config?.title || "Mini Couple Bucket List"}
            </h3>
          </div>
          <p className="text-sm mt-1 text-slate-300/80 font-light max-w-xl">
            {config?.description || "Dreams and adventures we want to experience together."}
          </p>
        </div>

        {/* Add Idea Button */}
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-md self-start sm:self-auto cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${palette.accent}, #ec4899)`,
              boxShadow: `0 4px 15px -3px ${palette.glow}`,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add an Idea</span>
          </button>
        )}
      </div>

      {/* Add Idea Inline Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddIdea}
            className="mb-6 p-4 rounded-2xl bg-white/[0.04] border border-white/15 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: palette.accent }} />
                Suggest a New Adventure or Idea
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Midnight stargazing with hot cocoa..."
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Optional note: Why this would be special or what to prepare..."
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-none focus:border-white/40 resize-none"
              />
            </div>

            {addError && (
              <div className="text-xs text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {addError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 rounded-full text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingLoading}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-transform hover:scale-105 disabled:opacity-50"
                style={{
                  background: palette.accent,
                  boxShadow: `0 4px 15px -3px ${palette.glow}`,
                }}
              >
                {addingLoading ? "Adding..." : "Add to List"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Planning Draft Feedback Toast */}
      <AnimatePresence>
        {planningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-100">Planning in Progress</p>
                <p className="mt-0.5 text-amber-200/90 text-xs font-light">{planningBanner}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPlanningBanner(null)}
              className="text-amber-400 hover:text-amber-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            filter === "all"
              ? "bg-white text-slate-900 font-bold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("wished")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            filter === "wished"
              ? "bg-[var(--brand-highlight)] text-slate-900 font-bold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          💭 Wishlist ({countWished})
        </button>
        <button
          type="button"
          onClick={() => setFilter("planning")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            filter === "planning"
              ? "bg-amber-400 text-slate-900 font-bold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          🗓️ Planning ({countPlanning})
        </button>
        <button
          type="button"
          onClick={() => setFilter("completed")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            filter === "completed"
              ? "bg-emerald-400 text-slate-900 font-bold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          🎉 Completed ({countCompleted})
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
            <Compass className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: palette.accent }} />
            <p className="text-sm text-slate-300 font-medium">No ideas in this section yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Add your favorite wishes and adventures to start planning!
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.status === "completed";
            const isPlanning = item.status === "planning";
            const bothInterested = item.creator_interested && item.partner_interested;
            const myInterest = isCreator ? item.creator_interested : item.partner_interested;

            return (
              <motion.div
                key={item.id}
                layout
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative ${
                  isCompleted
                    ? "bg-emerald-950/20 border-emerald-500/30"
                    : isPlanning
                    ? "bg-amber-950/20 border-amber-500/30"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Status badge & Creator attribution */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : isPlanning
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30"
                        }`}
                      >
                        {isCompleted ? "🎉 Completed" : isPlanning ? "🗓️ Planning" : "💭 Wishlist"}
                      </span>

                      {bothInterested && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <Heart className="w-2.5 h-2.5 fill-current" /> Both Interested!
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-light">
                        Added by {item.created_by === "creator" ? (senderName || "Sender") : (partnerName || "Partner")}
                      </span>
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-base font-bold ${
                        isCompleted
                          ? "line-through text-slate-400"
                          : "text-slate-100"
                      }`}
                    >
                      {item.title}
                    </h4>

                    {/* Note */}
                    {item.note && (
                      <p className="text-xs text-slate-300/80 font-light leading-relaxed">
                        {item.note}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 self-end sm:self-start">
                    {/* Mark Interest Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleInterest(item.id)}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        myInterest
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                      title={myInterest ? "You marked interest" : "Click to show interest"}
                    >
                      <Heart
                        className={`w-4 h-4 ${myInterest ? "fill-rose-400 text-rose-400" : ""}`}
                      />
                      <span className="text-[11px] hidden sm:inline">
                        {myInterest ? "I'm in! ❤️" : "Interested?"}
                      </span>
                    </button>

                    {/* "Let's plan this" action (only in wished state) */}
                    {!isCompleted && !isPlanning && (
                      <button
                        type="button"
                        onClick={() => handlePlanThis(item)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-white flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${palette.accent}, #fbbf24)`,
                          borderColor: `${palette.accent}60`,
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Let&apos;s plan this</span>
                      </button>
                    )}

                    {/* Mark Completed (Explicit action) */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleComplete(item.id)}
                        className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>We did it!</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMutate("revert_status", item.id, { status: "wished" })}
                        className="text-[11px] text-slate-400 hover:text-slate-300 underline underline-offset-4"
                      >
                        Re-open
                      </button>
                    )}
                  </div>
                </div>

                {/* Offer Memory Capture Afterward (Completed items) */}
                {isCompleted && (
                  <div className="mt-4 pt-3 border-t border-emerald-500/20">
                    {item.memory_photo_url || item.memory_note ? (
                      /* Attached Memory Display */
                      <div className="p-3 rounded-xl bg-black/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {item.memory_photo_url && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/20 shrink-0">
                            <img
                              src={item.memory_photo_url}
                              alt="Captured memory"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-0.5 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Captured Memory
                          </span>
                          {item.memory_note && (
                            <p className="text-xs text-slate-200 italic font-light leading-relaxed">
                              &ldquo;{item.memory_note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ) : capturingMemoryItemId === item.id ? (
                      /* Memory Capture Inline Form */
                      <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" />
                            Capture a Photo &amp; Memory of this Adventure
                          </span>
                          <button
                            type="button"
                            onClick={() => setCapturingMemoryItemId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Photo input */}
                        <div>
                          {memoryPhotoUrl ? (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-emerald-400/50">
                              <img src={memoryPhotoUrl} alt="Memory" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setMemoryPhotoUrl("");
                                  setMemoryAssetId(null);
                                }}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleMemoryPhotoUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingMemoryPhoto}
                                className="px-3 py-2 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{uploadingMemoryPhoto ? "Uploading..." : "Upload Adventure Photo"}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Note input */}
                        <input
                          type="text"
                          value={memoryNote}
                          onChange={(e) => setMemoryNote(e.target.value)}
                          maxLength={500}
                          placeholder="What was the best part of this moment?..."
                          className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400/50"
                        />

                        {memoryUploadError && (
                          <div className="text-xs text-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {memoryUploadError}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setCapturingMemoryItemId(null)}
                            className="px-3 py-1 rounded-full text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMemory(item.id)}
                            disabled={savingMemory || uploadingMemoryPhoto}
                            className="px-4 py-1 rounded-full text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50"
                          >
                            {savingMemory ? "Saving..." : "Save Memory"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Prompt to Capture Memory */
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-emerald-300/90 font-light flex items-center gap-1">
                          <PartyPopper className="w-3.5 h-3.5 text-emerald-400" />
                          You completed this! Would you like to capture a memory?
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCapturingMemoryItemId(item.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Capture Photo</span>
                          </button>

                          {/* Link to Reply Tool or Our Story if present */}
                          <button
                            type="button"
                            onClick={() => {
                              const storyEl = document.getElementById("our_story_t10") || document.getElementById("reply_t01");
                              if (storyEl) storyEl.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                          >
                            <span>Share in story</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer Notes */}
      <div className="mt-6 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-light">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Mark completion explicitly when you accomplish a goal together.
        </span>
        <span>Let&apos;s plan this creates an unconfirmed date draft</span>
      </div>
    </div>
  );
}
