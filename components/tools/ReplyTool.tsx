"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Send,
  Camera,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { ReplyToolConfig, TemplateReply } from "@/lib/supabase/coupleTemplates";

interface ReplyToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config?: ReplyToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
  onReplySubmitted?: (reply: TemplateReply) => void;
}

interface AttachedPhoto {
  id: string;
  file: File;
  preview: string;
  uploadedUrl?: string;
  uploadedPublicId?: string;
  uploading?: boolean;
  error?: string;
}

export function ReplyTool({
  templateCode,
  partnerName = "My Love",
  senderName = "Me",
  config,
  palette: propPalette,
  onReplySubmitted,
}: ReplyToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };

  // If explicitly disabled in template tools, don't show
  if (config && !config.enabled) return null;

  const promptText = config?.prompt || `Leave a love note or message for ${senderName}...`;
  const maxChars = config?.maxChars ?? 2000;
  const maxPhotos = config?.maxPhotos ?? 3;
  const maxVoiceSeconds = config?.maxVoiceSeconds ?? 60;
  const formats = config?.enabledFormats ?? { text: true, photo: true, voice: true };
  const quickReactions = config?.quickReactions ?? ["❤️", "🥰", "🥺", "✨", "💋"];

  // Unique idempotency key per draft
  const [clientId] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  });

  // Form states
  const [authorName, setAuthorName] = useState(partnerName || "My Love");
  const [message, setMessage] = useState("");
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Existing saved reply (from server / receipt)
  const [savedReply, setSavedReply] = useState<TemplateReply | null>(null);
  const [loadingInitialReply, setLoadingInitialReply] = useState(true);
  const [deletingReply, setDeletingReply] = useState(false);
  const [showDeletionNotice, setShowDeletionNotice] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [voiceUploadedUrl, setVoiceUploadedUrl] = useState<string | null>(null);
  const [voicePublicId, setVoicePublicId] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioTime, setPreviewAudioTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Saved audio playback
  const [savedAudioPlaying, setSavedAudioPlaying] = useState(false);
  const savedAudioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch any existing saved reply on mount (refresh persistence)
  const fetchMyReply = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/replies`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.my_reply) {
          setSavedReply(data.my_reply);
        } else if (Array.isArray(data.replies) && data.replies.length > 0 && !data.is_creator) {
          setSavedReply(data.replies[0]);
        }
      }
    } catch {
      // offline / silent
    } finally {
      setLoadingInitialReply(false);
    }
  }, [templateCode]);

  useEffect(() => {
    void fetchMyReply();
  }, [fetchMyReply]);

  // Clean up media tracks and object URLs on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [photos, recordedAudioUrl]);

  // 2. Microphone Recording Logic
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) || "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      const timer = setInterval(() => {
        setRecordSeconds((sec) => {
          if (sec + 1 >= maxVoiceSeconds) {
            stopRecording();
            return maxVoiceSeconds;
          }
          return sec + 1;
        });
      }, 1000);
      recordTimerRef.current = timer;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Microphone access was denied or unavailable.";
      setMicError(msg);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setVoiceDuration(recordSeconds);
  };

  const discardVoiceNote = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setVoiceUploadedUrl(null);
    setVoicePublicId(null);
    setRecordSeconds(0);
    setVoiceDuration(0);
  };

  const togglePreviewAudio = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // 3. Photo Picker Handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const availableSlots = maxPhotos - photos.length;
    if (availableSlots <= 0) return;

    const accepted = files.slice(0, availableSlots).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // 4. Submit Reply (with idempotent retry)
  const handleSubmit = async () => {
    setSubmitError(null);
    const hasText = message.trim().length > 0;
    const hasPhotos = photos.length > 0;
    const hasVoice = Boolean(recordedAudioBlob);
    const hasReaction = Boolean(selectedReaction);

    if (!hasText && !hasPhotos && !hasVoice && !hasReaction) {
      setSubmitError("Please write a message, pick a reaction, or attach a photo / voice note.");
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaItemsPayload: Array<{
        url: string;
        public_id: string;
        type: "image" | "video";
        media_type: "photo" | "voice";
        duration?: number;
      }> = [];

      // Step A: Upload photos if not yet uploaded
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (p.uploadedUrl && p.uploadedPublicId) {
          mediaItemsPayload.push({
            url: p.uploadedUrl,
            public_id: p.uploadedPublicId,
            type: "image",
            media_type: "photo",
          });
          continue;
        }

        setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
        const formData = new FormData();
        formData.append("file", p.file);
        formData.append("folder", "bonded/template_replies");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || `Failed to upload photo ${i + 1}.`);
        }

        p.uploadedUrl = uploadData.url;
        p.uploadedPublicId = uploadData.public_id;
        mediaItemsPayload.push({
          url: uploadData.url,
          public_id: uploadData.public_id,
          type: "image",
          media_type: "photo",
        });
      }

      // Step B: Upload voice note if present and not yet uploaded
      if (recordedAudioBlob && (!voiceUploadedUrl || !voicePublicId)) {
        setUploadProgress("Uploading voice note...");
        const audioFile = new File([recordedAudioBlob], "voice_reply.webm", {
          type: recordedAudioBlob.type || "audio/webm",
        });
        const audioForm = new FormData();
        audioForm.append("file", audioFile);
        audioForm.append("folder", "bonded/template_replies");

        const audioRes = await fetch("/api/upload", {
          method: "POST",
          body: audioForm,
        });
        const audioData = await audioRes.json();
        if (!audioRes.ok || !audioData.success) {
          throw new Error(audioData.error || "Failed to upload voice note.");
        }
        setVoiceUploadedUrl(audioData.url);
        setVoicePublicId(audioData.public_id);
        mediaItemsPayload.push({
          url: audioData.url,
          public_id: audioData.public_id,
          type: "video", // Cloudinary stores audio under video resource type
          media_type: "voice",
          duration: typeof audioData.duration === "number" && audioData.duration > 0 ? audioData.duration : recordSeconds,
        });
      } else if (voiceUploadedUrl && voicePublicId) {
        mediaItemsPayload.push({
          url: voiceUploadedUrl,
          public_id: voicePublicId,
          type: "video",
          media_type: "voice",
          duration: recordSeconds,
        });
      }

      setUploadProgress("Sealing your reply...");

      // Step C: Send reply with client_id (idempotency key)
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          author_name: authorName.trim() || "My Love",
          message: message.trim(),
          reaction: selectedReaction,
          media_items: mediaItemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not save your reply. Please try again.");
      }

      const receipt = data.receipt as TemplateReply;
      setSavedReply(receipt);
      setShowDeletionNotice(true);
      if (onReplySubmitted) onReplySubmitted(receipt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while sending your reply.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // 5. Delete Reply
  const handleDeleteReply = async () => {
    if (!savedReply) return;
    if (!confirm("Are you sure you want to delete your reply? This cannot be undone.")) return;

    setDeletingReply(true);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/reply`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_id: savedReply.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete reply.");
      }
      setSavedReply(null);
      setMessage("");
      setPhotos([]);
      discardVoiceNote();
      setSelectedReaction(null);
      setShowDeletionNotice(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete reply.");
    } finally {
      setDeletingReply(false);
    }
  };

  if (loadingInitialReply) {
    return (
      <div className="flex items-center justify-center py-8 text-white/50 text-sm">
        <Sparkles className="w-4 h-4 mr-2 animate-spin text-pink-400" />
        Checking connection...
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: SAVED RECEIPT VIEW (When Reply Exists)
  // ─────────────────────────────────────────────
  if (savedReply) {
    const replyPhotos = (savedReply.media_items || []).filter((m) => m.type === "image");
    const replyVoice = (savedReply.media_items || []).find((m) => m.type === "video");

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mx-auto rounded-3xl p-6 md:p-8 backdrop-blur-xl border shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: palette.card || "rgba(255,255,255,0.08)",
          borderColor: `${palette.accent}40`,
        }}
      >
        {/* Glow corner */}
        <div
          className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: palette.accent }}
        />

        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: palette.accent }}
            >
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base md:text-lg flex items-center gap-2">
                Your Reply is Sealed & Sent 💌
              </h3>
              <p className="text-xs text-white/60">
                Delivered to <span className="text-white font-medium">{senderName}</span>
              </p>
            </div>
          </div>
          {savedReply.reaction && (
            <span className="text-3xl animate-bounce">{savedReply.reaction}</span>
          )}
        </div>

        {/* Message body */}
        {savedReply.message && (
          <div className="p-4 rounded-2xl bg-black/30 border border-white/10 mb-4 text-white/90 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif italic">
            &ldquo;{savedReply.message}&rdquo;
          </div>
        )}

        {/* Attached Photos */}
        {replyPhotos.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-white/60 mb-2 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              Attached Memories ({replyPhotos.length}):
            </p>
            <div className="grid grid-cols-3 gap-2">
              {replyPhotos.map((photo, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="Reply attachment" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attached Voice Note */}
        {replyVoice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!savedAudioRef.current) return;
                if (savedAudioPlaying) {
                  savedAudioRef.current.pause();
                  setSavedAudioPlaying(false);
                } else {
                  savedAudioRef.current.play();
                  setSavedAudioPlaying(true);
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-md flex-shrink-0"
              style={{ backgroundColor: palette.accent }}
            >
              {savedAudioPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                <span className="font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                  Your Voice Note
                </span>
                <span className="text-white/50">{savedAudioPlaying ? "Playing..." : "Tap to listen"}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: palette.accent }}
                  animate={{ width: savedAudioPlaying ? "100%" : "0%" }}
                  transition={{ duration: 15, ease: "linear" }}
                />
              </div>
            </div>
            <audio
              ref={savedAudioRef}
              src={replyVoice.url}
              onEnded={() => setSavedAudioPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Timestamp & Privacy notice */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10 text-xs text-white/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(savedReply.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Private to {senderName}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowDeletionNotice(!showDeletionNotice)}
              className="text-white/40 hover:text-white/70 transition-colors text-left underline"
            >
              Deletion policy
            </button>
            <button
              type="button"
              disabled={deletingReply}
              onClick={handleDeleteReply}
              className="flex items-center gap-1 text-rose-400/80 hover:text-rose-300 transition-colors text-xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingReply ? "Deleting..." : "Delete Reply"}
            </button>
          </div>

          {showDeletionNotice && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-2.5 rounded-xl bg-white/5 text-[11px] text-white/60 leading-normal"
            >
              Deleting a reply removes the record and attached files from our server. Copies already saved,
              downloaded, or screenshotted by {senderName} cannot be deleted remotely.
            </motion.p>
          )}
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: REPLY FORM VIEW
  // ─────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto rounded-3xl p-6 md:p-8 backdrop-blur-xl border shadow-2xl relative"
      style={{
        backgroundColor: palette.card || "rgba(255,255,255,0.08)",
        borderColor: `${palette.accent}40`,
      }}
    >
      {/* Decorative Glow */}
      <div
        className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ backgroundColor: palette.accent }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
          style={{ backgroundColor: palette.accent }}
        >
          <Send className="w-5 h-5 ml-0.5" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-base md:text-lg">Reply to {senderName}</h3>
          <p className="text-xs text-white/60">{promptText}</p>
        </div>
      </div>

      {/* Quick Reactions Bar */}
      {quickReactions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickReactions.map((emoji) => {
              const isSelected = selectedReaction === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedReaction(isSelected ? null : emoji)}
                  className={`px-3 py-1.5 rounded-full text-xl transition-all duration-200 border flex items-center justify-center ${
                    isSelected
                      ? "scale-110 shadow-lg border-white/60 bg-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Author Name Field */}
      <div className="mb-3">
        <label className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">
          From (Your Name)
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={100}
          placeholder="Your name"
          className="w-full px-3.5 py-2 rounded-xl bg-black/30 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
        />
      </div>

      {/* Text Message Field */}
      {formats.text && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
            <span className="uppercase tracking-wider">Your Message</span>
            <span>
              {message.length} / {maxChars}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            rows={3}
            placeholder={`Write a romantic note, memory, or sweet message for ${senderName}...`}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors resize-none leading-relaxed"
          />
        </div>
      )}

      {/* Photo Attachment Section */}
      {formats.photo && (
        <div className="mb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
          />

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/15 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs flex items-center justify-center gap-2"
            >
              <Camera className="w-3.5 h-3.5" />
              Add Photo ({photos.length}/{maxPhotos})
            </button>
          )}
        </div>
      )}

      {/* Voice Note Section */}
      {formats.voice && (
        <div className="mb-4">
          <AnimatePresence mode="wait">
            {isRecording ? (
              /* Live Recording Active State */
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <div className="flex items-center gap-1 font-mono text-xs text-rose-300">
                    <span>
                      {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
                      {String(recordSeconds % 60).padStart(2, "0")}
                    </span>
                    <span className="text-white/40">/ 01:00</span>
                  </div>
                </div>

                {/* Animated sound wave bars */}
                <div className="flex items-center gap-1 h-5">
                  {[4, 12, 18, 8, 14, 20, 10, 16, 6].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-rose-400 rounded-full"
                      animate={{ height: [4, h, 4] }}
                      transition={{ duration: 0.4 + (i % 3) * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              </motion.div>
            ) : recordedAudioBlob ? (
              /* Recorded Preview State */
              <motion.div
                key="recorded"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3.5 rounded-2xl bg-black/30 border border-white/15 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePreviewAudio}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-md flex-shrink-0"
                    style={{ backgroundColor: palette.accent }}
                  >
                    {isPlayingPreview ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <p className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Mic className="w-3 h-3 text-pink-400" />
                      Voice Note Ready ({voiceDuration}s)
                    </p>
                    <p className="text-[11px] text-white/50">
                      {isPlayingPreview ? "Listening..." : "Tap to review recording"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={discardVoiceNote}
                  className="p-2 rounded-xl text-white/50 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  title="Discard and re-record"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {recordedAudioUrl && (
                  <audio
                    ref={audioPreviewRef}
                    src={recordedAudioUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                )}
              </motion.div>
            ) : (
              /* Ready to record button */
              <motion.button
                key="idle"
                type="button"
                onClick={startRecording}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs flex items-center justify-center gap-2"
              >
                <Mic className="w-3.5 h-3.5 text-pink-400" />
                Record Voice Note (up to 60s)
              </motion.button>
            )}
          </AnimatePresence>

          {micError && (
            <div className="mt-2 text-xs text-rose-300 flex items-center gap-1.5 bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {submitError && (
        <div className="mb-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        disabled={isSubmitting || isRecording}
        onClick={handleSubmit}
        className="w-full py-3 px-6 rounded-2xl font-semibold text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
        style={{
          backgroundColor: palette.accent,
          boxShadow: `0 8px 24px ${palette.glow}40`,
        }}
      >
        {isSubmitting ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{uploadProgress || "Sending Love Reply..."}</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 ml-0.5" />
            <span>Send Reply to {senderName}</span>
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[11px] text-white/40 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-400/80" />
        Private between you and {senderName}. Never published.
      </p>
    </motion.div>
  );
}
