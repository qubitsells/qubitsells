"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Eye,
  Film,
  Music,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export type MediaType = "image" | "audio" | "video";
type MediaPalette = "rose" | "dark" | "cyan";

export interface ResolvedMediaItem {
  url: string;
  type: MediaType;
  rawType?: string;
  publicId?: string;
  duration?: number;
  title?: string;
  caption?: string;
  author?: string;
  date?: string;
}

/**
 * Ensures media URLs starting with /api/media/[id] have the required
 * ?template=[shortCode] query parameter for authorization checks.
 */
export function resolveMediaUrl(rawUrl: string, shortCode?: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  if (url.startsWith("/api/media/") && shortCode && !url.includes("template=")) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}template=${encodeURIComponent(shortCode)}`;
  }
  return url;
}

/**
 * Classifies an attachment into image, audio, or video based on explicit
 * metadata, file extensions, and Cloudinary upload conventions.
 */
export function detectMediaType(m: {
  url?: string;
  type?: string;
  media_type?: string;
  format?: string;
}): MediaType {
  const url = (m.url || "").toLowerCase();
  const type = (m.type || "").toLowerCase();
  const mediaType = (m.media_type || "").toLowerCase();
  const format = (m.format || "").toLowerCase();

  // 1. Explicit voice/audio markers
  if (
    mediaType === "voice" ||
    mediaType === "audio" ||
    type === "audio" ||
    ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac"].includes(format) ||
    url.endsWith(".mp3") ||
    url.endsWith(".wav") ||
    url.endsWith(".ogg") ||
    url.endsWith(".oga") ||
    url.endsWith(".m4a") ||
    url.endsWith(".aac") ||
    url.endsWith(".flac") ||
    url.includes("voice_reply")
  ) {
    return "audio";
  }

  // 2. Video markers
  if (
    mediaType === "video" ||
    ["mp4", "mov", "mkv", "m4v"].includes(format) ||
    url.endsWith(".mp4") ||
    url.endsWith(".mov") ||
    url.endsWith(".mkv") ||
    url.endsWith(".m4v")
  ) {
    return "video";
  }

  // 3. Webm / Cloudinary video resource type:
  // In couple template replies, Cloudinary stores recorded voice notes under "video" resource type
  // with webm format. If type is video or webm without explicit video markers, it's audio.
  if (type === "video" || format === "webm" || url.endsWith(".webm")) {
    return "audio";
  }

  // 4. Default to image
  return "image";
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || !isFinite(sec) || sec < 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Global event name to coordinate audio playback across multiple players on the page
const AUDIO_PLAY_EVENT = "bonded:audio-play";

// ─────────────────────────────────────────────────────────────
// 1. Inline Audio Player (WhatsApp / Telegram style)
// ─────────────────────────────────────────────────────────────
interface InlineAudioPlayerProps {
  url: string;
  authorName?: string;
  initialDuration?: number;
  className?: string;
  paletteTheme?: MediaPalette;
  onOpenModal?: () => void;
}

export function InlineAudioPlayer({
  url,
  authorName = "Voice Note",
  initialDuration = 0,
  className = "",
  paletteTheme = "rose",
  onOpenModal,
}: InlineAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and handle global pause when another audio starts
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleOtherPlay = (e: Event) => {
      const custom = e as CustomEvent<{ url: string }>;
      if (custom.detail?.url !== url && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener(AUDIO_PLAY_EVENT, handleOtherPlay);
    return () => {
      window.removeEventListener(AUDIO_PLAY_EVENT, handleOtherPlay);
      audioElement?.pause();
    };
  }, [url]);

  // Use Web Audio API to decode audio frames and extract the exact duration (fixes WebM 0:00 / Infinity duration)
  useEffect(() => {
    if (!url) return;
    let isCancelled = false;

    const decodeAudioDuration = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (
            !isCancelled &&
            audioBuffer &&
            typeof audioBuffer.duration === "number" &&
            isFinite(audioBuffer.duration) &&
            audioBuffer.duration > 0
          ) {
            setDuration(audioBuffer.duration);
            setLoadError(false);
          }
        } finally {
          audioCtx.close().catch(() => {});
        }
      } catch {
        // Fallback to media element events
      }
    };

    decodeAudioDuration();
    return () => {
      isCancelled = true;
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent(AUDIO_PLAY_EVENT, { detail: { url } }));
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setLoadError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      if (cur > duration) {
        setDuration(cur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (typeof d === "number" && isFinite(d) && d > 0) {
      setDuration(d);
      setLoadError(false);
    } else if (d === Infinity) {
      // Chromium WebM fix: seek to huge value forces calculation of real duration
      audioRef.current.currentTime = 1e101;
      const onSeeked = () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("seeked", onSeeked);
          if (isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setDuration(audioRef.current.duration);
          }
          audioRef.current.currentTime = 0;
        }
      };
      audioRef.current.addEventListener("seeked", onSeeked);
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (typeof d === "number" && isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const toggleSpeed = () => {
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        togglePlay();
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      if (audioRef.current.currentTime > duration) {
        setDuration(audioRef.current.currentTime);
      }
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isDark = paletteTheme === "dark";
  const isCyan = paletteTheme === "cyan";

  return (
    <div
      className={`rounded-2xl p-3 sm:p-3.5 transition-all border shadow-xs ${
        isDark
          ? "bg-white/5 border-white/10 hover:border-white/20 text-white"
          : isCyan ? "bg-white border-[var(--brand-border)] text-slate-800"
          : "bg-rose-50/80 border-rose-200/90 text-rose-950"
      } ${className}`}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onCanPlay={handleDurationChange}
        onEnded={handleEnded}
        onError={() => setLoadError(true)}
      />

      {loadError ? (
        <div className="flex items-center gap-2 text-xs text-red-500 py-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Audio could not be loaded. Per privacy retention, it may have expired.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top row: Play Button + Animated Waveform Bars + Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 shadow-md cursor-pointer flex-shrink-0 ${
                isDark
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                  : isCyan ? "bg-[var(--brand-accent)] hover:bg-[var(--brand-hover)]"
                  : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              }`}
              title={isPlaying ? "Pause voice note" : "Play voice note"}
              aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Title & Animated Equalizer Waves */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate flex items-center gap-1.5">
                  <Music className={`w-3.5 h-3.5 flex-shrink-0 ${isCyan ? "text-[var(--brand-accent)]" : "text-rose-500"}`} />
                  <span>{authorName}</span>
                </span>
                <span
                  className={`text-[11px] font-mono font-medium ${
                    isDark ? "text-white/60" : isCyan ? "text-slate-500" : "text-rose-900/60"
                  }`}
                >
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              {/* Bouncing Equalizer Bars Animation */}
              <div className="flex items-center gap-1 h-3 mt-1">
                {[40, 75, 55, 95, 60, 80, 45, 90, 65, 50, 70, 85].map((height, i) => (
                  <motion.span
                    key={i}
                    animate={
                      isPlaying
                        ? {
                            height: [`${height * 0.3}%`, `${height}%`, `${height * 0.4}%`],
                            opacity: [0.6, 1, 0.6],
                          }
                        : { height: `${height * 0.35}%`, opacity: 0.35 }
                    }
                    transition={
                      isPlaying
                        ? {
                            repeat: Infinity,
                            duration: 0.6 + (i % 4) * 0.15,
                            ease: "easeInOut",
                          }
                        : { duration: 0.2 }
                    }
                    className={`w-1 rounded-full ${
                      isDark ? "bg-pink-400" : isCyan ? "bg-[var(--brand-accent)]" : "bg-rose-500"
                    }`}
                    style={{ minHeight: "3px" }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scrubber Range Bar */}
          <div className="space-y-1">
            <div className="relative flex items-center group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Voice note playback position"
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-neutral-200/60 dark:bg-white/10 focus:outline-none ${isCyan ? "accent-[var(--brand-accent)]" : "accent-rose-500"}`}
                style={{
                  background: isDark
                    ? `linear-gradient(to right, #ec4899 ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`
                    : isCyan ? `linear-gradient(to right, #481925 ${progressPercent}%, #d9edf7 ${progressPercent}%)`
                    : `linear-gradient(to right, #f43f5e ${progressPercent}%, rgba(244,63,94,0.15) ${progressPercent}%)`,
                }}
              />
            </div>

            {/* Bottom Controls: Speed toggle, Restart, Mute */}
            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSpeed}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer border ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                      : isCyan ? "bg-[var(--brand-soft)] hover:bg-[var(--brand-tint)] border-[var(--brand-border)] text-[var(--brand-accent)]"
                      : "bg-white hover:bg-rose-100 border-rose-200 text-rose-800"
                  }`}
                  title="Playback speed"
                >
                  {speed}x
                </button>

                <button
                  type="button"
                  onClick={restartAudio}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    isDark ? "hover:bg-white/10 text-white/60" : isCyan ? "hover:bg-[var(--brand-tint)] text-slate-600" : "hover:bg-rose-100 text-rose-700/60"
                  }`}
                  title="Restart audio"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    isDark ? "hover:bg-white/10 text-white/60" : isCyan ? "hover:bg-[var(--brand-tint)] text-slate-600" : "hover:bg-rose-100 text-rose-700/60"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-red-500" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onOpenModal && (
                  <button
                    type="button"
                    onClick={onOpenModal}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                      isDark ? "text-white/50 hover:text-white" : isCyan ? "text-slate-600 hover:text-[var(--brand-accent)]" : "text-rose-800/60 hover:text-rose-900"
                    }`}
                    title="Open audio player in modal view"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Modal view</span>
                  </button>
                )}

                <a
                  href={url}
                  download="voice_note.webm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                    isDark ? "text-white/50 hover:text-white" : isCyan ? "text-slate-600 hover:text-[var(--brand-accent)]" : "text-rose-800/60 hover:text-rose-900"
                  }`}
                  title="Download voice note"
                >
                  <Download className="w-3 h-3" />
                  <span>Save audio</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Inline Video Card
// ─────────────────────────────────────────────────────────────
interface InlineVideoCardProps {
  url: string;
  authorName?: string;
  date?: string;
  onOpenLightbox?: () => void;
  paletteTheme?: MediaPalette;
}

export function InlineVideoCard({
  url,
  authorName = "Partner Video",
  date,
  onOpenLightbox,
  paletteTheme = "rose",
}: InlineVideoCardProps) {
  const isDark = paletteTheme === "dark";
  const isCyan = paletteTheme === "cyan";

  return (
    <div
      className={`rounded-2xl overflow-hidden border p-2 space-y-2 max-w-sm ${
        isDark ? "bg-white/5 border-white/10" : isCyan ? "bg-white border-[var(--brand-border)]" : "bg-white border-rose-200"
      }`}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black group">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        />
        {onOpenLightbox && (
          <button
            type="button"
            onClick={onOpenLightbox}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer shadow"
            title="Expand in Lightbox"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <span className={`font-semibold flex items-center gap-1.5 truncate ${isDark ? "text-white" : isCyan ? "text-slate-800" : "text-rose-950 dark:text-white"}`}>
          <Film className={`w-3.5 h-3.5 ${isCyan ? "text-[var(--brand-accent)]" : "text-rose-500"}`} />
          <span className="truncate">{authorName}</span>
        </span>
        {onOpenLightbox && (
          <button
            type="button"
            onClick={onOpenLightbox}
            className={`text-[11px] font-bold transition-colors cursor-pointer ${isDark ? "text-pink-400 hover:text-pink-300" : isCyan ? "text-[var(--brand-accent)] hover:text-[var(--brand-accent)]" : "text-rose-600 hover:text-rose-800 dark:text-pink-400 dark:hover:text-pink-300"}`}
          >
            Full View
          </button>
        )}
      </div>
      {date && <p className={`text-[10px] px-1 ${isDark ? "text-white/60" : isCyan ? "text-slate-500" : "text-rose-900/60"}`}>{date}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Inline Image Thumbnail (With Zoom / Click to Lightbox)
// ─────────────────────────────────────────────────────────────
interface InlineImageThumbnailProps {
  url: string;
  authorName?: string;
  onClick: () => void;
  paletteTheme?: MediaPalette;
}

export function InlineImageThumbnail({
  url,
  authorName = "Photo",
  onClick,
  paletteTheme = "rose",
}: InlineImageThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const isDark = paletteTheme === "dark";
  const isCyan = paletteTheme === "cyan";

  if (hasError) {
    return (
      <div
        className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center text-[10px] p-1.5 text-center transition-colors ${
          isDark
            ? "bg-white/5 border-white/10 text-white/50"
            : isCyan ? "bg-[var(--brand-soft)] border-[var(--brand-border)] text-slate-600"
            : "bg-rose-50 border-rose-200 text-rose-900/60"
        }`}
      >
        <AlertCircle className={`w-4 h-4 mb-1 ${isCyan ? "text-[var(--brand-accent)]" : "text-rose-400"}`} />
        <span className="line-clamp-2">Photo unavailable</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-20 h-20 rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.04] active:scale-95 cursor-pointer shadow-2xs hover:shadow-md focus:outline-none focus:ring-2 ${isCyan ? "focus:ring-[var(--brand-accent)]" : "focus:ring-rose-400"} ${
        isDark ? "border-white/15 bg-black/40" : isCyan ? "border-[var(--brand-border)] bg-white" : "border-rose-200 bg-white"
      }`}
      title="Click to view photo in full size"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={authorName}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />

      {/* Hover Glass Overlay with Eye Icon */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white backdrop-blur-2xs">
        <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-md">
          <Eye className="w-4 h-4 text-white" />
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Media Lightbox Modal (Full-Screen In-Page Viewer)
// ─────────────────────────────────────────────────────────────
export interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ResolvedMediaItem[];
  initialIndex?: number;
}

export function MediaLightboxModal(props: MediaLightboxModalProps) {
  // Opening a gallery or selecting a new attachment starts at that attachment.
  return <MediaLightboxContent key={`${props.isOpen}:${props.initialIndex ?? 0}`} {...props} />;
}

function MediaLightboxContent({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
}: MediaLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Listen for Escape / Arrow keys without locking background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, items.length, onClose]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const hasMultiple = items.length > 1;

  const prevItem = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const nextItem = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto flex flex-col justify-between p-3 sm:p-6"
        onClick={onClose}
      >
        {/* Top App Bar with Single Close Button */}
        <div
          className="relative z-10 flex items-center justify-between text-white w-full max-w-6xl mx-auto py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: Author & Date */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {currentItem.author || "Partner Attachment"}
              </p>
              {currentItem.date && (
                <p className="text-[11px] text-white/50">{currentItem.date}</p>
              )}
            </div>
          </div>

          {/* Right: Counter + Download + Single Close Button */}
          <div className="flex items-center gap-2">
            {hasMultiple && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
                {currentIndex + 1} / {items.length}
              </span>
            )}

            <a
              href={currentItem.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Open or download original file"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg flex items-center gap-1.5 text-xs font-bold active:scale-95"
              title="Close viewer (Esc)"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Center Media Stage */}
        <div
          className="relative flex-1 flex items-center justify-center w-full max-w-6xl mx-auto my-2 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Arrow */}
          {hasMultiple && (
            <button
              type="button"
              onClick={prevItem}
              className="absolute left-2 sm:left-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
              title="Previous attachment (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Media Content */}
          <div className="relative max-w-full max-h-[75vh] flex items-center justify-center">
            {currentItem.type === "image" && (
              <motion.div
                key={currentItem.url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="max-h-[75vh] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentItem.url}
                  alt={currentItem.author || "Attachment preview"}
                  className="max-h-[75vh] max-w-full object-contain rounded-2xl"
                />
              </motion.div>
            )}

            {currentItem.type === "video" && (
              <motion.div
                key={currentItem.url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-h-[75vh] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
              >
                <video
                  src={currentItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[75vh] max-w-full object-contain rounded-2xl"
                />
              </motion.div>
            )}

            {currentItem.type === "audio" && (
              <motion.div
                key={currentItem.url}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-6 rounded-3xl bg-neutral-900/90 border border-white/20 backdrop-blur-xl shadow-2xl text-white space-y-4"
              >
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center mx-auto text-white shadow-lg">
                    <Music className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {currentItem.author ? `${currentItem.author}'s Voice Note` : "Partner Voice Note"}
                  </h4>
                  <p className="text-xs text-white/50">{currentItem.date || "Audio message"}</p>
                </div>

                <InlineAudioPlayer
                  url={currentItem.url}
                  authorName={currentItem.author}
                  paletteTheme="dark"
                />
              </motion.div>
            )}
          </div>

          {/* Right Arrow */}
          {hasMultiple && (
            <button
              type="button"
              onClick={nextItem}
              className="absolute right-2 sm:right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
              title="Next attachment (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Bottom Filmstrip Thumbnails (if multiple items) */}
        {hasMultiple && (
          <div
            className="relative z-10 w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-2 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                  currentIndex === idx
                    ? "border-rose-500 scale-110 shadow-md ring-2 ring-rose-400/40"
                    : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                {it.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="thumbnail" className="w-full h-full object-cover" />
                ) : it.type === "video" ? (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white">
                    <Film className="w-4 h-4 text-rose-400" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white">
                    <Music className="w-4 h-4 text-pink-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Inline Media Gallery (All-in-one Smart Attachment Renderer)
// ─────────────────────────────────────────────────────────────
interface InlineMediaGalleryProps {
  mediaItems: Array<{
    url?: string;
    type?: string;
    media_type?: string;
    public_id?: string;
    format?: string;
    duration?: number;
  }>;
  shortCode?: string;
  authorName?: string;
  createdDate?: string;
  paletteTheme?: MediaPalette;
}

export function InlineMediaGallery({
  mediaItems,
  shortCode,
  authorName,
  createdDate,
  paletteTheme = "rose",
}: InlineMediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!Array.isArray(mediaItems) || mediaItems.length === 0) return null;

  // Resolve all URLs and determine media types
  const resolvedList: ResolvedMediaItem[] = [];
  for (const m of mediaItems) {
    const rawUrl = typeof m.url === "string" ? m.url : "";
    if (!rawUrl) continue;
    resolvedList.push({
      url: resolveMediaUrl(rawUrl, shortCode),
      type: detectMediaType(m),
      rawType: m.type,
      publicId: m.public_id,
      duration: typeof m.duration === "number" && m.duration > 0 ? m.duration : undefined,
      author: authorName,
      date: createdDate,
    });
  }

  if (resolvedList.length === 0) return null;

  const audioItems = resolvedList.filter((item) => item.type === "audio");
  const visualItems = resolvedList.filter(
    (item) => item.type === "image" || item.type === "video"
  );

  const openLightboxAt = (itemUrl: string) => {
    const idx = resolvedList.findIndex((it) => it.url === itemUrl);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-2.5 pt-1">
      {/* 1. Voice Notes / Audio */}
      {audioItems.map((audio, aIdx) => (
        <InlineAudioPlayer
          key={audio.url || aIdx}
          url={audio.url}
          authorName={authorName ? `${authorName}'s Voice Note` : "Voice Note"}
          initialDuration={audio.duration}
          paletteTheme={paletteTheme}
          onOpenModal={() => openLightboxAt(audio.url)}
        />
      ))}

      {/* 2. Visual Items: Photos & Videos */}
      {visualItems.length > 0 && (
        <div className="flex flex-wrap gap-2.5 items-center">
          {visualItems.map((item, vIdx) => {
            if (item.type === "video") {
              return (
                <InlineVideoCard
                  key={item.url || vIdx}
                  url={item.url}
                  authorName={authorName ? `${authorName}'s Video` : "Video"}
                  date={createdDate}
                  onOpenLightbox={() => openLightboxAt(item.url)}
                  paletteTheme={paletteTheme}
                />
              );
            }

            return (
              <InlineImageThumbnail
                key={item.url || vIdx}
                url={item.url}
                authorName={authorName}
                onClick={() => openLightboxAt(item.url)}
                paletteTheme={paletteTheme}
              />
            );
          })}
        </div>
      )}

      {/* 3. In-Page Lightbox Modal (For Photos, Videos & Audio) */}
      <MediaLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={resolvedList}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}
