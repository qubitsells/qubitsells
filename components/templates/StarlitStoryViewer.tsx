"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Send,
  X,
  Share2,
  Quote,
  Film,
  ArrowDown,
  Maximize2,
  Moon,
  Compass,
  Mail,
  Calendar,
  Clock,
} from "lucide-react";
import type {
  AnimeTemplate,
  InvitationToolConfig,
  ReplyToolConfig,
  PollToolConfig,
  QuestionToolConfig,
  RevealToolConfig,
  ScratchRevealToolConfig,
  CouponToolConfig,
  OpenWhenToolConfig,
  OurStoryToolConfig,
  BucketListToolConfig,
} from "@/lib/supabase/coupleTemplates";
import {
  STARLIT_STORY_SCENES,
  STARLIT_STORY_CONFIG,
  STARLIT_STORY_PALETTE,
  DEFAULT_STARLIT_STORY_GALLERY_ITEMS,
} from "@/lib/constants/starlitStoryTemplate";
import { ReplyTool } from "@/components/tools/ReplyTool";
import { ScratchRevealTool } from "@/components/tools/ScratchRevealTool";
import { LoveCouponTool } from "@/components/tools/LoveCouponTool";
import { OpenWhenLettersTool } from "@/components/tools/OpenWhenLettersTool";
import { OurStoryTool } from "@/components/tools/OurStoryTool";
import { BucketListTool } from "@/components/tools/BucketListTool";
import { PrivateRevealTool } from "@/components/tools/PrivateRevealTool";
import { QuestionTool } from "@/components/tools/QuestionTool";
import { PollTool } from "@/components/tools/PollTool";
import {
  FloatingQuoteGallery,
  type FloatingGalleryItem,
} from "@/components/templates/FloatingQuoteGallery";

interface StarlitStoryViewerProps {
  template: AnimeTemplate;
  code: string;
}

function getStarlitOptionIcon(optId: string) {
  switch (optId) {
    case "opt_stargazing":
      return Moon;
    case "opt_drive":
      return Compass;
    case "opt_rooftop":
    default:
      return Sparkles;
  }
}

export default function StarlitStoryViewer({
  template,
  code,
}: StarlitStoryViewerProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Cinematic full-screen experience state
  const [isCinematicMode, setIsCinematicMode] = useState(true);
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [hasCompletedAllScenes, setHasCompletedAllScenes] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUserMutedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prevent background body scroll while in cinematic fullscreen mode
  useEffect(() => {
    if (isCinematicMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCinematicMode]);

  // Automatic transition from cinematic title sequence to Scene 1 playing automatically
  useEffect(() => {
    if (!isCinematicMode) {
      setIsIntroActive(false);
      setHasOpened(true);
      return;
    }

    // Display the cinematic title sequence for 3.8s, then automatically start story scenes playing
    const introTimer = setTimeout(() => {
      setIsIntroActive(false);
      setHasOpened(true);
      setIsPlaying(true);
      if (audioRef.current && !isUserMutedRef.current) {
        audioRef.current.muted = false;
        audioRef.current
          .play()
          .then(() => setIsAudioPlaying(true))
          .catch(() => {});
      }
    }, 3800);

    return () => clearTimeout(introTimer);
  }, [isCinematicMode]);

  // Unlock audio on any user gesture — browsers block autoplay until a real interaction.
  useEffect(() => {
    const ytTrack =
      template.music_track?.type === "youtube" ||
      Boolean(template.music_track?.youtubeId);
    if (ytTrack) return; // YouTube iframe handles its own autoplay

    const unlock = () => {
      if (!audioRef.current || isAudioPlaying || isUserMutedRef.current) return;
      const startSec = template.music_track?.startAt || 0;
      if (startSec > 0 && audioRef.current.currentTime < 1) {
        try {
          audioRef.current.currentTime = startSec;
        } catch {}
      }
      audioRef.current.muted = false;
      audioRef.current
        .play()
        .then(() => {
          setIsAudioPlaying(true);
          document.removeEventListener("click", unlock, { capture: true });
          document.removeEventListener("touchstart", unlock, { capture: true });
          document.removeEventListener("keydown", unlock, { capture: true });
          document.removeEventListener("scroll", unlock, { capture: true });
          document.removeEventListener("mousemove", unlock, { capture: true });
        })
        .catch(() => {});
    };

    document.addEventListener("click", unlock, { capture: true });
    document.addEventListener("touchstart", unlock, { capture: true });
    document.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("scroll", unlock, { capture: true });
    document.addEventListener("mousemove", unlock, { capture: true });

    return () => {
      document.removeEventListener("click", unlock, { capture: true });
      document.removeEventListener("touchstart", unlock, { capture: true });
      document.removeEventListener("keydown", unlock, { capture: true });
      document.removeEventListener("scroll", unlock, { capture: true });
      document.removeEventListener("mousemove", unlock, { capture: true });
    };
  }, [isAudioPlaying, template.music_track]);

  // Story segment fill progress
  useEffect(() => {
    if (!isPlaying) {
      setSceneProgress(0);
      return;
    }
    setSceneProgress(0);
    const intervalTime = 50;
    const stepIncrement = (intervalTime / 5000) * 100;
    const interval = setInterval(() => {
      setSceneProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, currentScene]);

  // Date selection state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [partnerNote, setPartnerNote] = useState("");
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpStatusText, setRsvpStatusText] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<"reply" | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // QubitSells Tool Configs
  const invitationConfig = template.tools?.find(
    (t): t is InvitationToolConfig => t.type === "invitation"
  );
  const replyConfig = template.tools?.find(
    (t): t is ReplyToolConfig => t.type === "reply"
  );
  const pollConfig = template.tools?.find(
    (t): t is PollToolConfig => t.type === "poll"
  );
  const questionConfig = template.tools?.find(
    (t): t is QuestionToolConfig => t.type === "question"
  );
  const revealConfig = template.tools?.find(
    (t): t is RevealToolConfig => t.type === "private_reveal"
  );
  const scratchConfig = template.tools?.find(
    (t): t is ScratchRevealToolConfig => t.type === "scratch_reveal"
  );
  const couponConfig = template.tools?.find(
    (t): t is CouponToolConfig => t.type === "coupon"
  );
  const openWhenConfig = template.tools?.find(
    (t): t is OpenWhenToolConfig => t.type === "open_when"
  );
  const ourStoryConfig = template.tools?.find(
    (t): t is OurStoryToolConfig => t.type === "our_story"
  );
  const bucketListConfig = template.tools?.find(
    (t): t is BucketListToolConfig => t.type === "bucket_list"
  );
  const floatingGalleryConfig = (template.tools as unknown[] | undefined)?.find(
    (t): t is {
      id: string;
      type: "floating_gallery";
      enabled?: boolean;
      title?: string;
      subtitle?: string;
      items?: FloatingGalleryItem[];
    } => {
      const tool = t as { type?: string; enabled?: boolean } | null | undefined;
      return tool?.type === "floating_gallery" && tool.enabled !== false;
    }
  );

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) =>
        setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const isYouTube =
    template.music_track?.type === "youtube" ||
    Boolean(template.music_track?.youtubeId);
  const ytVideoId =
    template.music_track?.youtubeId ||
    (isYouTube && template.music_track?.id?.replace(/^yt-/, "")) ||
    null;

  useEffect(() => {
    if (isYouTube && ytVideoId) {
      setIsAudioPlaying(true);
    }
  }, [isYouTube, ytVideoId]);

  // Audio play/pause toggle
  const toggleAudio = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (isYouTube) {
        setIsAudioPlaying((prev) => {
          const next = !prev;
          isUserMutedRef.current = !next;
          setIsAudioMuted(!next);
          return next;
        });
        return;
      }

      if (!audioRef.current) return;

      if (isAudioPlaying) {
        isUserMutedRef.current = true;
        setIsAudioMuted(true);
        setIsAudioPlaying(false);
        audioRef.current.pause();
      } else {
        isUserMutedRef.current = false;
        setIsAudioMuted(false);
        const startSec = template.music_track?.startAt || 0;
        if (startSec > 0 && audioRef.current.currentTime < 1) {
          try {
            audioRef.current.currentTime = startSec;
          } catch {}
        }
        audioRef.current
          .play()
          .then(() => setIsAudioPlaying(true))
          .catch(() => {});
      }
    },
    [isYouTube, isAudioPlaying, template.music_track]
  );

  // Scene transition schedule
  const nextScene = useCallback(() => {
    setCurrentScene((prev) => {
      if (prev < STARLIT_STORY_SCENES.length - 1) {
        return prev + 1;
      } else {
        setIsPlaying(false);
        setHasCompletedAllScenes(true);
        return prev;
      }
    });
  }, []);

  const prevScene = useCallback(() => {
    setCurrentScene((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (currentScene < STARLIT_STORY_SCENES.length - 1) {
          nextScene();
        } else {
          setIsPlaying(false);
          setHasCompletedAllScenes(true);
        }
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentScene, nextScene]);

  const handleSkipIntro = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsIntroActive(false);
      setHasOpened(true);
      setIsPlaying(true);
      setIsCinematicMode(true);

      if (isUserMutedRef.current) return;

      if (isYouTube) {
        setIsAudioPlaying(true);
      } else if (audioRef.current) {
        const startSec = template.music_track?.startAt || 0;
        if (
          startSec > 0 &&
          (audioRef.current.currentTime < 1 ||
            Math.abs(audioRef.current.currentTime - startSec) > 3)
        ) {
          try {
            audioRef.current.currentTime = startSec;
          } catch {}
        }
        audioRef.current.muted = false;
        audioRef.current
          .play()
          .then(() => setIsAudioPlaying(true))
          .catch(() => {});
      }
    },
    [isYouTube, template.music_track]
  );

  const handleStartStory = handleSkipIntro;

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleReplay = () => {
    setCurrentScene(0);
    setIsPlaying(true);
    setHasCompletedAllScenes(false);
  };

  const handleSkipToEnd = () => {
    setIsPlaying(false);
    setCurrentScene(STARLIT_STORY_SCENES.length - 1);
    setHasCompletedAllScenes(true);
  };

  const handleExitCinematic = () => {
    setIsCinematicMode(false);
    setHasCompletedAllScenes(true);
    setTimeout(() => {
      const el = document.getElementById("starlit-story-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  // Submit Date RSVP
  const handleRsvpSubmit = async () => {
    if (!selectedChoice) return;
    setIsSubmittingRsvp(true);

    try {
      const choiceLabel =
        showCustomInput && customIdea.trim() ? customIdea.trim() : selectedChoice;
      const isDeclined = choiceLabel === "Maybe another time";

      try {
        await fetch(`/api/templates/${encodeURIComponent(code)}/invitation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expected_revision: 1,
            response_type: isDeclined ? "declined" : "accepted",
            chosen_slot: selectedSlotId
              ? invitationConfig?.proposedSlots?.find((s) => s.id === selectedSlotId) || {
                  id: "slot_default",
                  start_time: new Date().toISOString(),
                  label: choiceLabel,
                }
              : {
                  id: "slot_default",
                  start_time: new Date().toISOString(),
                  label: choiceLabel,
                },
            partner_note_text: `Choice: ${choiceLabel}${
              partnerNote ? ` — Note: ${partnerNote}` : ""
            }`,
          }),
        });
      } catch {}

      try {
        await fetch(`/api/templates/${encodeURIComponent(code)}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: crypto.randomUUID(),
            author_name: template.partner_name || "My Love",
            message: `✨ Starlit Date Choice: ${choiceLabel}${
              partnerNote ? `\n"${partnerNote}"` : ""
            }`,
            reaction: isDeclined ? "🤍" : "🌟",
            media_items: [],
          }),
        });
      } catch {}

      setRsvpSubmitted(true);
      setRsvpStatusText(
        isDeclined
          ? "Understood, my love. We'll watch the stars whenever your heart wishes. 🤍"
          : `It's a starlit date! Can't wait for our ${choiceLabel}. ✨🌙`
      );
    } catch {
      setRsvpSubmitted(true);
      setRsvpStatusText(
        "Response saved! I can't wait for our magical evening together. ✨🌙"
      );
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const scene = STARLIT_STORY_SCENES[currentScene];
  const partnerName = template.partner_name || "My Love";
  const senderName = template.partner_from || "Me";
  const personalMessage =
    template.message || STARLIT_STORY_CONFIG.defaultMessage;
  const isMessagePhase = currentScene >= 3; // Scene 4 (index 3) is 'The letter opens'
  const isFinalScene = currentScene === STARLIT_STORY_SCENES.length - 1;

  // Custom tool palette matching Starlit Story's warm rooftop romance tones
  const customPalette = {
    accent: STARLIT_STORY_PALETTE.accent,
    glow: STARLIT_STORY_PALETTE.gold,
    text: STARLIT_STORY_PALETTE.text,
    dark: STARLIT_STORY_PALETTE.background,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-4 px-3 sm:px-6 relative select-none font-sans"
      style={{
        backgroundColor: STARLIT_STORY_PALETTE.background,
        color: STARLIT_STORY_PALETTE.text,
      }}
    >
      {/* Hidden MP3 audio element */}
      {template.music_track?.mp3Url && !isYouTube && (
        <audio
          ref={(el) => {
            if (el && el !== audioRef.current) {
              audioRef.current = el;
              el.currentTime = template.music_track?.startAt || 0;
              if (!isUserMutedRef.current) {
                el.play()
                  .then(() => setIsAudioPlaying(true))
                  .catch(() => {});
              }
            }
          }}
          src={template.music_track.mp3Url}
          loop
          autoPlay
          muted={false}
          preload="auto"
          style={{ display: "none" }}
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => {
            if (!isUserMutedRef.current) return;
            setIsAudioPlaying(false);
          }}
          onCanPlay={() => setAudioReady(true)}
        />
      )}

      {/* Hidden YouTube background audio iframe */}
      {isYouTube && ytVideoId && isAudioPlaying && (
        <div
          className="fixed -bottom-96 -right-96 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&start=${
              template.music_track?.startAt || 0
            }&enablejsapi=1&loop=1&playlist=${ytVideoId}`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-1 h-1 border-0"
            title="Background Soundtrack"
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────
          CINEMATIC FULLSCREEN OVERLAY
          Takes over entire viewport until partner completes all scenes,
          or clicks 'Explore Full Page'.
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isCinematicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="fixed inset-0 z-50 bg-[#080D1A] text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* 1. CINEMATIC FULLSCREEN SCENE DISPLAY */}
            <div className="absolute inset-0 overflow-hidden z-0">
              {STARLIT_STORY_SCENES.map((s, idx) => {
                const isCurrent = idx === currentScene;
                return (
                  <div
                    key={s.file}
                    className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
                    style={{
                      opacity: isCurrent ? 1 : 0,
                      zIndex: isCurrent ? 1 : 0,
                    }}
                  >
                    {/* Layer A: Ambient Edge-to-Edge Blurred Spill */}
                    <div className="absolute inset-0 overflow-hidden">
                      <Image
                        src={s.file}
                        alt=""
                        fill
                        priority={idx === 0}
                        sizes="100vw"
                        className="object-cover object-center blur-3xl opacity-35 scale-110 select-none"
                      />
                    </div>

                    {/* Layer B: Crisp Foreground 16:9 Illustration */}
                    <div className="absolute inset-0 pt-14 sm:pt-16 pb-28 sm:pb-32 px-3 sm:px-6 flex items-center justify-center">
                      <div
                        className="relative w-full h-full max-w-7xl"
                        style={{
                          transform:
                            isCurrent && !prefersReducedMotion
                              ? "scale(1.025)"
                              : "scale(1)",
                          transition: "transform 6000ms ease-out",
                        }}
                      >
                        <Image
                          src={s.file}
                          alt={s.title}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className="object-contain object-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] select-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Gentle vignettes that preserve brightness at top */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A]/90 via-transparent to-[#080D1A]/40 pointer-events-none z-[6]" />
            </div>

            {/* 2. TOP CINEMATIC BAR: Multi-segment Progress Bars & Quick Controls */}
            <div
              className={`relative z-20 w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-3 transition-all duration-700 ${
                isIntroActive
                  ? "opacity-0 -translate-y-4 pointer-events-none"
                  : "opacity-100 translate-y-0"
              }`}
            >
              {/* Instagram/TikTok-style 6-segment story progress bars */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {STARLIT_STORY_SCENES.map((_, idx) => {
                  const isPast = idx < currentScene;
                  const isCurrent = idx === currentScene;
                  return (
                    <div
                      key={idx}
                      className="h-1 sm:h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer backdrop-blur-xs"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentScene(idx);
                      }}
                      title={`Jump to Scene ${idx + 1}`}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#C26D7A] via-[#D99443] to-[#FAD4A8] rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(194,109,122,0.6)]"
                        style={{
                          width: hasOpened
                            ? isPast
                              ? "100%"
                              : isCurrent
                              ? `${sceneProgress}%`
                              : "0%"
                            : "0%",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Header Info with Sound, Skip, and Exit */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm shadow-inner">
                    ✨
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                      <span>{partnerName}</span>
                      <span className="text-[10px] text-[#FAD4A8]">
                        • {currentScene + 1}/6
                      </span>
                    </p>
                    <p className="text-[10px] text-[#CBD5E1]/80 truncate max-w-[180px] sm:max-w-none">
                      {scene.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {template.music_track && (
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-md"
                    >
                      {isAudioPlaying ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#FAD4A8] animate-pulse" />
                          <span className="hidden sm:inline">Sound On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-white/60" />
                          <span className="hidden sm:inline">Unmute ✨</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExitCinematic}
                    className="px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:border-[#FAD4A8] shadow-md"
                    title="Exit to normal scrollable page"
                  >
                    <span>Exit to Page</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. CENTER: DRAMATIC CINEMATIC START TITLE SEQUENCE */}
            <AnimatePresence>
              {isIntroActive && (
                <motion.div
                  key="cinematic-intro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 1.1,
                    filter: "blur(14px)",
                    transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
                  }}
                  className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 text-center pointer-events-none select-none"
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center max-w-3xl px-4 space-y-6">
                    <motion.div
                      initial={{
                        scale: 0.35,
                        opacity: 0,
                        filter: "blur(18px)",
                        y: 40,
                      }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        filter: "blur(0px)",
                        y: 0,
                      }}
                      transition={{
                        duration: 2.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="space-y-4"
                    >
                      <motion.p
                        initial={{ letterSpacing: "0.2em", opacity: 0 }}
                        animate={{ letterSpacing: "0.38em", opacity: 0.95 }}
                        transition={{ duration: 1.8, delay: 0.3 }}
                        className="text-[11px] sm:text-xs font-black uppercase text-[#FAD4A8] drop-shadow-[0_2px_12px_rgba(217,148,67,0.6)]"
                      >
                        U N D E R &nbsp; O N E &nbsp; S K Y , &nbsp; W I T H &nbsp; Y O U .
                      </motion.p>

                      <h1 className="text-4xl sm:text-6xl md:text-7xl font-starlit text-white tracking-wide drop-shadow-[0_8px_35px_rgba(217,148,67,0.45)]">
                        Starlit Story
                      </h1>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                        className="space-y-1.5 pt-2"
                      >
                        <p className="text-xl sm:text-3xl font-bold text-[#FFFDF7] drop-shadow-[0_4px_20px_rgba(217,148,67,0.5)]">
                          For {partnerName}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-[#FAD4A8]/90 tracking-wide">
                          A 6-scene story created with love by {senderName}
                        </p>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Celebratory Completion Overlay when finished scene 6 */}
            <AnimatePresence>
              {hasOpened && hasCompletedAllScenes && isFinalScene && (
                <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-[3px]">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.88, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-black/75 backdrop-blur-2xl text-white border border-[#F0D5C9]/40 shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(194,109,122,0.4)] text-center space-y-5"
                  >
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#FFF0EB] flex items-center justify-center text-3xl shadow-sm">
                      ✨
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#FAD4A8]">
                        Story Complete ✨
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white font-starlit">
                        You&#39;ve Seen All 6 Scenes!
                      </h2>
                      <p className="text-xs sm:text-sm text-rose-100/80 font-medium leading-relaxed">
                        Now explore our floating memory collage, secret couple surprises, and pick our next date together ❤️
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExitCinematic}
                      className="w-full py-4 rounded-full bg-gradient-to-r from-[#C26D7A] to-[#D99443] text-white font-bold text-sm shadow-[0_0_30px_rgba(194,109,122,0.5)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Explore Full Page &amp; Pick Our Date</span>
                      <ArrowDown className="w-4 h-4 animate-bounce" />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 4. BOTTOM CINEMATIC BAR: Romantic Caption & Story Controls */}
            <div
              className={`relative z-20 w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 space-y-3 transition-all duration-700 ${
                isIntroActive
                  ? "opacity-0 translate-y-4 pointer-events-none"
                  : "opacity-100 translate-y-0"
              }`}
            >
              {/* Scene Caption Glass Card */}
              <AnimatePresence mode="wait">
                {hasOpened && (
                  <motion.div
                    key={`caption-${currentScene}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="p-4 sm:p-5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-2xl text-center space-y-1.5"
                  >
                    <div className="flex items-center justify-center gap-2 text-[#FAD4A8] text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <Quote className="w-3.5 h-3.5 fill-[#FAD4A8] text-[#FAD4A8]" />
                      <span>
                        Scene {scene.order} of {STARLIT_STORY_SCENES.length} • {scene.title}
                      </span>
                    </div>

                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide leading-snug drop-shadow-lg">
                      &ldquo;{scene.caption}&rdquo;
                    </p>

                    {/* Scene 4 Love Letter Highlight Button */}
                    {currentScene === 3 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsLetterModalOpen(true)}
                          className="px-4 py-1.5 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Read the Love Letter Inside ✉️</span>
                        </button>
                      </div>
                    )}

                    {/* Personal note from Marsad/Creator */}
                    {isMessagePhase && personalMessage && currentScene !== 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2.5 mt-1 border-t border-white/15 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#FFFDF7]"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#C26D7A] text-[#C26D7A] shrink-0" />
                        <span>
                          Note from {senderName}: &ldquo;{personalMessage}&rdquo;
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Cinematic Controls */}
              {hasOpened && (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={prevScene}
                    disabled={currentScene === 0}
                    className="px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Prev Scene</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className="px-6 py-2.5 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xl transition-all cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                      <span>{isPlaying ? "Pause" : "Play Story"}</span>
                    </button>

                    {isFinalScene && (
                      <button
                        type="button"
                        onClick={handleReplay}
                        className="px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Replay</span>
                      </button>
                    )}
                  </div>

                  {isFinalScene ? (
                    <button
                      type="button"
                      onClick={handleExitCinematic}
                      className="px-6 py-2.5 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-[0_0_25px_rgba(194,109,122,0.5)] transition-all cursor-pointer"
                    >
                      <span>Explore Full Page</span>
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={nextScene}
                      className="px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <span className="hidden sm:inline">Next Scene</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          NORMAL SCROLLABLE PAGE (Available once partner finishes
          the scenes or clicks to exit cinematic mode)
      ───────────────────────────────────────────── */}
      <div id="starlit-story-content" className="w-full flex flex-col items-center">
        {/* ─────────────────────────────────────────────
            TOP BRAND & SENDER HEADER
        ───────────────────────────────────────────── */}
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-3 px-4 rounded-2xl bg-white/80 border border-[#F0D5C9]/80 shadow-2xs my-3 z-20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D99443]" />
            <span className="text-xs font-bold text-[#3A231C] tracking-tight font-starlit">
              Starlit Story
            </span>
            <span className="text-xs text-[#75564C] hidden sm:inline">
              • for {partnerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFF0EB] hover:bg-[#FCE8E6] border border-[#F0D5C9] text-[#C26D7A] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Watch in full-screen cinematic mode"
            >
              <Film className="w-3.5 h-3.5 text-[#C26D7A]" />
              <span className="hidden sm:inline">Cinematic Mode</span>
            </button>

            {template.music_track && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                  isAudioPlaying
                    ? "bg-[#FFF0EB] text-[#C26D7A] border-[#F0D5C9]"
                    : "bg-white text-[#75564C] border-[#F0D5C9] hover:bg-[#FFF8F4]"
                }`}
                title={isAudioPlaying ? "Mute music" : "Play romantic soundtrack"}
              >
                {isAudioPlaying ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#C26D7A] animate-pulse" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#75564C]" />
                )}
                <span className="hidden sm:inline">
                  {isAudioPlaying ? "Music Playing" : "Play Music 🎵"}
                </span>
              </button>
            )}

            {replyConfig?.enabled !== false && (
              <button
                type="button"
                onClick={() => setActiveDrawer("reply")}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-[#FFF8F4] border border-[#F0D5C9] text-[#3A231C] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#C26D7A]" />
                <span>Leave Love Note</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="p-2 rounded-full bg-white hover:bg-[#FFF8F4] border border-[#F0D5C9] text-[#3A231C] transition-colors cursor-pointer shadow-2xs"
              title="Share Link"
            >
              {copiedShare ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4 text-[#C26D7A]" />
              )}
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────
            MAIN 16:9 VIEWPORT CONTAINER & PROMINENT QUOTES
            Exact 16:9 aspect ratio, object-fit: cover, no stretching.
        ───────────────────────────────────────────── */}
        <main className="w-full max-w-5xl my-auto flex flex-col items-center justify-center py-2">
          <div
            className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FFF8F4] shadow-[0_20px_60px_-15px_rgba(194,109,122,0.2)] border border-[#F0D5C9]/80"
            style={{
              maxWidth: "1120px",
            }}
          >
            {/* Overlapping crossfading images */}
            {STARLIT_STORY_SCENES.map((s, idx) => {
              const isCurrent = idx === currentScene;
              return (
                <div
                  key={s.file}
                  className="absolute inset-0 transition-opacity duration-500 ease-in-out pointer-events-none"
                  style={{
                    opacity: isCurrent ? 1 : 0,
                    zIndex: isCurrent ? 1 : 0,
                  }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      transform:
                        isCurrent && !prefersReducedMotion
                          ? "scale(1.018)"
                          : "scale(1)",
                      transition: "transform 5000ms ease-out",
                    }}
                  >
                    <Image
                      src={s.file}
                      alt={s.title}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 1200px) 100vw, 1120px"
                      className="object-cover object-top sm:object-center"
                    />
                  </div>
                </div>
              );
            })}

            {/* Gentle cinematic bottom-gradient for readable HTML text */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

            {/* Fullscreen Cinematic Mode Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md cursor-pointer shadow-md"
              title="Expand to Fullscreen Cinematic Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cinematic</span>
            </button>

            {/* Personal Message Card */}
            <AnimatePresence>
              {hasOpened && isMessagePhase && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute top-4 left-4 right-20 sm:right-auto sm:max-w-sm z-20 pointer-events-none"
                >
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#F0D5C9] shadow-lg space-y-0.5 text-left">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#C26D7A]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-[#C26D7A]" />
                        <span>Note From {senderName}</span>
                      </span>
                      <span className="text-[9px] text-[#75564C]">
                        Scene {currentScene + 1}/6
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#3A231C] leading-snug">
                      &ldquo;{personalMessage}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prominent Romantic Quote Plate & In-viewport Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pointer-events-none">
              <div className="w-full sm:max-w-xl p-3.5 sm:p-4 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-[#FAD4A8] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Quote className="w-3 h-3 fill-[#FAD4A8] text-[#FAD4A8]" />
                  <span>
                    Scene {scene.order} of {STARLIT_STORY_SCENES.length} • {scene.title}
                  </span>
                </div>
                <p className="text-base sm:text-xl font-black text-white leading-snug drop-shadow-md">
                  &ldquo;{scene.caption}&rdquo;
                </p>
              </div>

              {/* In-viewport Controls (Desktop/Mobile) */}
              <div className="flex items-center gap-1.5 pointer-events-auto self-end">
                <button
                  type="button"
                  onClick={prevScene}
                  disabled={currentScene === 0}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Previous scene"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="px-3 py-1.5 rounded-full bg-white text-[#3A231C] hover:bg-[#FFF0EB] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-[#3A231C]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-[#3A231C]" />
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={nextScene}
                  disabled={currentScene === STARLIT_STORY_SCENES.length - 1}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Next scene"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isFinalScene && (
                  <button
                    type="button"
                    onClick={handleSkipToEnd}
                    className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <span>Skip</span>
                    <SkipForward className="w-3 h-3" />
                  </button>
                )}

                {isFinalScene && (
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────
              THUMBNAIL SCRUBBER (below 16:9 frame)
          ───────────────────────────────────────────── */}
          <div className="w-full max-w-5xl mt-3 grid grid-cols-6 gap-2 sm:gap-3">
            {STARLIT_STORY_SCENES.map((s, idx) => {
              const isSelected = idx === currentScene;
              return (
                <button
                  key={s.file}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentScene(idx);
                  }}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? "border-[#C26D7A] scale-[1.03] ring-2 ring-[#C26D7A]/30 shadow-md"
                      : "border-white/80 opacity-70 hover:opacity-100 hover:border-[#F0D5C9]"
                  }`}
                  aria-label={`Jump to scene ${idx + 1}: ${s.title}`}
                >
                  <Image
                    src={s.file}
                    alt={s.title}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/60 text-white text-[9px] font-bold">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────
              FLOATING PHOTO & QUOTE GALLERY
              Organic floating collage with quotes on hover
          ───────────────────────────────────────────── */}
          {floatingGalleryConfig &&
            floatingGalleryConfig.items &&
            floatingGalleryConfig.items.length > 0 && (
              <div className="w-full mt-8">
                <FloatingQuoteGallery
                  items={floatingGalleryConfig.items}
                  title={floatingGalleryConfig.title}
                  subtitle={floatingGalleryConfig.subtitle}
                  theme="starlit-story"
                  accentColor={STARLIT_STORY_PALETTE.accent}
                />
              </div>
            )}
        </main>

        {/* ─────────────────────────────────────────────
            DATE PROPOSAL & RSVP SECTION (Dual-posting)
        ───────────────────────────────────────────── */}
        <section className="w-full max-w-4xl mx-auto my-8 px-4">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-6 sm:p-10 bg-white border-2 border-[#F0D5C9] shadow-sm space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0EB] border border-[#F0D5C9] text-xs font-bold text-[#C26D7A]">
                <Moon className="w-3.5 h-3.5 text-[#D99443]" />
                <span>Our Next Adventure</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-starlit text-[#3A231C]">
                {STARLIT_STORY_CONFIG.finalQuestion}
              </h2>
              <p className="text-xs sm:text-sm text-[#75564C]">
                Pick your dream evening plan below so I can prepare everything perfectly for us ✨
              </p>
            </div>

            {/* Date Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {STARLIT_STORY_CONFIG.dateOptions.map((opt) => {
                const IconComponent = getStarlitOptionIcon(opt.id);
                const isSelected = selectedChoice === opt.label && !showCustomInput;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedChoice(opt.label);
                      setShowCustomInput(false);
                    }}
                    className={`p-5 rounded-2xl border-2 text-left space-y-3 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#C26D7A] bg-[#FFF0EB] shadow-xs scale-102"
                        : "border-[#F0D5C9] bg-[#FFF8F4] hover:border-[#C26D7A] hover:bg-[#FFF0EB]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#F0D5C9] flex items-center justify-center text-[#C26D7A] shadow-2xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#C26D7A]" />
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-sm sm:text-base text-[#3A231C]">
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#75564C] mt-1 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Option Button / Input */}
            <div className="pt-1">
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedChoice(customIdea || "Custom idea");
                  }}
                  className="text-xs font-bold text-[#C26D7A] hover:text-[#B55D6B] hover:underline flex items-center gap-1 mx-auto cursor-pointer"
                >
                  <span>✨ Have another starlit date in mind? Propose your own idea</span>
                </button>
              ) : (
                <div className="space-y-2 p-4 rounded-2xl bg-[#FFF8F4] border border-[#F0D5C9]">
                  <label className="text-xs font-bold text-[#C26D7A] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D99443]" />
                    <span>Your Custom Date Idea:</span>
                  </label>
                  <input
                    type="text"
                    value={customIdea}
                    onChange={(e) => {
                      setCustomIdea(e.target.value);
                      setSelectedChoice(e.target.value);
                    }}
                    placeholder="e.g., Midnight beach bonfire with acoustic music..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F0D5C9] text-sm text-[#3A231C] placeholder-[#9C7C72] focus:outline-hidden focus:border-[#C26D7A]"
                  />
                </div>
              )}
            </div>

            {/* Proposed Time Slots if Creator added them */}
            {invitationConfig?.proposedSlots &&
              invitationConfig.proposedSlots.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[#F0D5C9]">
                  <p className="text-xs font-bold text-[#C26D7A] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Choose a Preferred Time:</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {invitationConfig.proposedSlots.map((slot) => {
                      const isSlotSelected = selectedSlotId === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            isSlotSelected
                              ? "border-[#C26D7A] bg-[#FFF0EB] text-[#3A231C] shadow-2xs"
                              : "border-[#F0D5C9] bg-[#FFF8F4] text-[#75564C] hover:border-[#C26D7A]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#C26D7A]" />
                            <span>{slot.label}</span>
                          </div>
                          {isSlotSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#C26D7A]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Note Input */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#C26D7A] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Sweet Note back to {senderName} (optional):</span>
              </label>
              <textarea
                value={partnerNote}
                onChange={(e) => setPartnerNote(e.target.value)}
                placeholder="Can't wait to see you beneath the fairy lights..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-sm text-[#3A231C] placeholder-[#9C7C72] focus:outline-hidden focus:border-[#C26D7A]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 text-center space-y-3">
              {rsvpSubmitted ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 rounded-2xl bg-[#FFF0EB] border border-[#F0D5C9] text-[#3A231C] space-y-1 shadow-xs"
                >
                  <p className="font-extrabold text-sm flex items-center justify-center gap-1.5 text-[#C26D7A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>RSVP Sent Directly to {senderName}!</span>
                  </p>
                  <p className="text-xs text-[#75564C]">{rsvpStatusText}</p>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={handleRsvpSubmit}
                  disabled={!selectedChoice || isSubmittingRsvp}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white font-black text-sm uppercase tracking-wider shadow-md disabled:opacity-40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
                >
                  {isSubmittingRsvp ? (
                    <span>Sending your choice... ✨</span>
                  ) : (
                    <>
                      <span>Lock In Our Starlit Date</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </section>

        {/* ─────────────────────────────────────────────
            INTERACTIVE RECIPIENT TOOLS SECTION
        ───────────────────────────────────────────── */}
        <section className="w-full max-w-4xl mx-auto my-6 px-4 space-y-6">
          {/* Quick Reply Tool */}
          {replyConfig?.enabled !== false && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <ReplyTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={replyConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Scratch Reveal Card */}
          {scratchConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <ScratchRevealTool
                templateCode={code}
                config={scratchConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Synchronized Private Reveal */}
          {revealConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <PrivateRevealTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={revealConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Love Coupons */}
          {couponConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <LoveCouponTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={couponConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Open When Letters */}
          {openWhenConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <OpenWhenLettersTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={openWhenConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Our Story Timeline */}
          {ourStoryConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <OurStoryTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={ourStoryConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Bucket List */}
          {bucketListConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <BucketListTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={bucketListConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Poll Tool */}
          {pollConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <PollTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={pollConfig}
                palette={customPalette}
              />
            </div>
          )}

          {/* Heart-to-Heart Question Tool */}
          {questionConfig?.enabled && (
            <div className="rounded-3xl p-5 sm:p-7 bg-white border border-[#F0D5C9] shadow-xs">
              <QuestionTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                palette={customPalette}
              />
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────
            BOTTOM FOOTER
        ───────────────────────────────────────────── */}
        <footer className="w-full max-w-5xl mx-auto py-8 text-center text-xs text-[#75564C] space-y-2">
          <p className="flex items-center justify-center gap-1.5">
            <span>Made with love on</span>
            <Link
              href="/"
              className="text-[#C26D7A] hover:underline font-bold"
            >
              QubitSells
            </Link>
            <span>✨</span>
          </p>
          <p className="text-[10px] text-[#9C7C72]">
            &copy; {new Date().getFullYear()} Starlit Story — Under One Sky
          </p>
        </footer>
      </div>

      {/* ─────────────────────────────────────────────
          LIGHTBOX MODAL FOR SCENE 4 LETTER
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isLetterModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLetterModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-white border-2 border-[#F0D5C9] shadow-2xl space-y-4 text-center"
            >
              <button
                type="button"
                onClick={() => setIsLetterModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFF0EB] hover:bg-[#FCE8E6] text-[#3A231C] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-[#FFF0EB] border border-[#F0D5C9] text-[#C26D7A] flex items-center justify-center text-xl mx-auto shadow-2xs">
                ✉️
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-[#C26D7A] uppercase tracking-widest">
                  Personal Love Letter
                </span>
                <h3 className="text-2xl sm:text-3xl font-starlit text-[#3A231C]">
                  For {partnerName}
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-[#FFF9F5] border border-[#F0D5C9] text-left">
                <p className="text-sm sm:text-base leading-relaxed text-[#3A231C] font-serif italic">
                  &ldquo;{personalMessage}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-[#F0D5C9] flex items-center justify-between text-xs text-[#75564C]">
                  <span>Written from the heart</span>
                  <span className="font-bold text-[#C26D7A]">— {senderName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLetterModalOpen(false)}
                className="px-6 py-2 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                Keep In My Heart ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          REPLY TOOL SLIDE-OVER DRAWER MODAL
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeDrawer === "reply" && replyConfig?.enabled !== false && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-[#F0D5C9] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#FFF0EB] hover:bg-[#FCE8E6] text-[#C26D7A] transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
              <ReplyTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={replyConfig}
                palette={customPalette}
                onReplySubmitted={() => {
                  setTimeout(() => setActiveDrawer(null), 1500);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
