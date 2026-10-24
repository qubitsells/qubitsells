"use client";

import StoryStartButton from "./StoryStartButton";
import VenueDetails from "@/components/tools/VenueDetails";
import type { VenueToolConfig } from "@/lib/supabase/coupleTemplates";
import { InvitationTool } from "@/components/tools/InvitationTool";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Pause, RotateCcw, SkipForward, ChevronLeft, ChevronRight, Volume2, VolumeX, MessageSquare, Sparkles, X, Quote, Film, ArrowDown, Maximize2, Key } from "lucide-react";
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
  MIDNIGHT_KEY_SCENES,
  MIDNIGHT_KEY_CONFIG,
  MIDNIGHT_KEY_PALETTE,
} from "@/lib/constants/midnightKeyTemplate";
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

interface HalloweenMidnightKeyViewerProps {
  template: AnimeTemplate;
  code: string;
}

export default function HalloweenMidnightKeyViewer({
  template,
  code,
}: HalloweenMidnightKeyViewerProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Cinematic full-screen experience state
  const [isCinematicMode, setIsCinematicMode] = useState(true);
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [hasCompletedAllScenes, setHasCompletedAllScenes] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);

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

  // Interactive tools

  const [activeDrawer, setActiveDrawer] = useState<"reply" | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // QubitSells Tool Configs
  const invitationConfig = template.tools?.find(
    (t): t is InvitationToolConfig => t.type === "invitation"
  );
  const venueConfig = template.tools?.find((tool): tool is VenueToolConfig => tool.type === "venue" && tool.enabled);
  const replyConfig = template.tools?.find(
    (t): t is ReplyToolConfig => t.type === "reply"
  );
  const pollConfig = template.tools?.find(
    (t): t is PollToolConfig => t.type === "poll" && t.enabled
  );
  const questionConfig = template.tools?.find(
    (t): t is QuestionToolConfig => t.type === "question" && t.enabled
  );
  const revealConfig = template.tools?.find(
    (t): t is RevealToolConfig => t.type === "private_reveal" && t.enabled
  );
  const scratchConfig = template.tools?.find(
    (t): t is ScratchRevealToolConfig => t.type === "scratch_reveal" && t.enabled
  );
  const couponConfig = template.tools?.find(
    (t): t is CouponToolConfig => t.type === "coupon" && t.enabled
  );
  const openWhenConfig = template.tools?.find(
    (t): t is OpenWhenToolConfig => t.type === "open_when" && t.enabled
  );
  const ourStoryConfig = template.tools?.find(
    (t): t is OurStoryToolConfig => t.type === "our_story" && t.enabled !== false
  );
  const bucketListConfig = template.tools?.find(
    (t): t is BucketListToolConfig => t.type === "bucket_list" && t.enabled !== false
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


  // Audio play/pause toggle
  const toggleAudio = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (isYouTube) {
        setIsAudioPlaying((prev) => {
          const next = !prev;
          isUserMutedRef.current = !next;

          return next;
        });
        return;
      }

      if (!audioRef.current) return;

      if (isAudioPlaying) {
        // User is muting
        isUserMutedRef.current = true;

        setIsAudioPlaying(false);
        audioRef.current.pause();
      } else {
        // User is unmuting
        isUserMutedRef.current = false;

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
      if (prev < MIDNIGHT_KEY_SCENES.length - 1) {
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
        if (currentScene < MIDNIGHT_KEY_SCENES.length - 1) {
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
    setCurrentScene(MIDNIGHT_KEY_SCENES.length - 1);
    setHasCompletedAllScenes(true);
  };

  const handleExitCinematic = () => {
    setIsIntroActive(false);
    setHasOpened(true);
    setIsCinematicMode(false);
    setHasCompletedAllScenes(true);
    setTimeout(() => {
      const el = document.getElementById("midnight-key-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const scene = MIDNIGHT_KEY_SCENES[currentScene];
  const partnerName = template.partner_name || "My Love";
  const senderName = template.partner_from || "Me";
  const personalMessage =
    template.message || MIDNIGHT_KEY_CONFIG.defaultMessage;
  const isMessagePhase = currentScene >= 4; // Scene 5 (index 4) reveals personal message
  const isFinalScene = currentScene === MIDNIGHT_KEY_SCENES.length - 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-4 px-3 sm:px-6 relative select-none font-sans"
      style={{
        backgroundColor: MIDNIGHT_KEY_PALETTE.background,
        color: MIDNIGHT_KEY_PALETTE.text,
      }}
    >
      {/* Hidden MP3 audio element */}
      {template.music_track?.mp3Url && !isYouTube && (
        <audio
          ref={audioRef}
          src={template.music_track.mp3Url}
          loop
          muted={false}
          preload="auto"
          style={{ display: "none" }}
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => {
            if (!isUserMutedRef.current) return;
            setIsAudioPlaying(false);
          }}

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
            className="fixed inset-0 z-50 bg-[#0B0612] text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* 1. CINEMATIC FULLSCREEN SCENE DISPLAY */}
            <div className="absolute inset-0 overflow-hidden z-0">
              {MIDNIGHT_KEY_SCENES.map((s, idx) => {
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0612]/90 via-transparent to-[#0B0612]/40 pointer-events-none z-[6]" />
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
                {MIDNIGHT_KEY_SCENES.map((_, idx) => {
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
                        className="h-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(243,181,116,0.6)]"
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

              {/* Header Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-[11px] font-bold text-[#FFBC73] flex items-center gap-1.5 backdrop-blur-md">
                    <Film className="w-3.5 h-3.5 text-[#F3B574]" />
                    <span>Cinematic Story Mode</span>
                  </span>
                  <span className="text-xs text-white/80 font-medium hidden sm:inline drop-shadow-md">
                    Scene {currentScene + 1} of {MIDNIGHT_KEY_SCENES.length} • {scene.title}
                  </span>
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
                          <Volume2 className="w-3.5 h-3.5 text-[#F3B574] animate-pulse" />
                          <span className="hidden sm:inline">Sound On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-white/60" />
                          <span className="hidden sm:inline">Unmute 🎃</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExitCinematic}
                    className="px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:border-[#F3B574] shadow-md"
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
                  className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto p-6 text-center select-none"
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
                        className="text-[11px] sm:text-xs font-black uppercase text-[#F3B574] drop-shadow-[0_2px_12px_rgba(243,181,116,0.6)]"
                      >
                        A &nbsp; L I T T L E &nbsp; A D V E N T U R E , &nbsp; J U S T &nbsp; F O R &nbsp; U S .
                      </motion.p>

                      <h1 className="text-4xl sm:text-6xl md:text-7xl font-halloween text-white tracking-wide drop-shadow-[0_8px_35px_rgba(243,181,116,0.45)]">
                        The Midnight Key
                      </h1>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                        className="space-y-1.5 pt-2"
                      >
                        <p className="text-xl sm:text-3xl font-bold text-[#FFE2BD] drop-shadow-[0_4px_20px_rgba(243,181,116,0.5)]">
                          For {partnerName}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-[#D6BDC8]/80 tracking-wide">
                          A 6-scene story created with love by {senderName}
                        </p>
                      </motion.div>
                    <StoryStartButton onClick={handleSkipIntro} hasMusic={!!template.music_track} accent="#F3B574" onAccent="#171018" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Celebratory Completion Overlay when finished scene 6 */}
            <AnimatePresence>
              {hasCompletedAllScenes && isCinematicMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-[#342038] border border-[#F3B574] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(243,181,116,0.4)]">
                    🗝️
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h2 className="text-3xl sm:text-4xl font-halloween text-[#FFE2BD] drop-shadow-md">
                      You&#39;ve Discovered The Midnight Key!
                    </h2>
                    <p className="text-sm text-[#D6BDC8]">
                      Every step through the misty garden led right to this moment together.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleExitCinematic}
                      className="px-7 py-3 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] font-extrabold text-sm shadow-[0_0_25px_rgba(243,181,116,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Explore Full Page &amp; RSVP</span>
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleReplay}
                      className="px-6 py-3 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Replay Story</span>
                    </button>
                  </div>
                </motion.div>
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
                    <div className="flex items-center justify-center gap-2 text-[#FFBC73] text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <Quote className="w-3.5 h-3.5 fill-[#FFBC73] text-[#FFBC73]" />
                      <span>
                        Scene {scene.order} of {MIDNIGHT_KEY_SCENES.length} • {scene.title}
                      </span>
                    </div>

                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide leading-snug drop-shadow-lg">
                      &ldquo;{scene.caption}&rdquo;
                    </p>

                    {/* Personal note from Marsad/Creator */}
                    {isMessagePhase && personalMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2.5 mt-1 border-t border-white/15 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#FFE2BD]"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#F3B574] text-[#F3B574] shrink-0" />
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
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] hover:brightness-105 text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xl transition-all cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-[#1A0F24]" />
                      ) : (
                        <Play className="w-4 h-4 fill-[#1A0F24]" />
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
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-[0_0_25px_rgba(243,181,116,0.5)] transition-all cursor-pointer"
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
      <div id="midnight-key-content" className="w-full flex flex-col items-center">
        {/* ─────────────────────────────────────────────
            TOP BRAND & SENDER HEADER
        ───────────────────────────────────────────── */}
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 sm:py-3 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#342038] border border-[#F3B574]/50 flex items-center justify-center text-[#F3B574] shadow-2xs">
              <Key className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-halloween text-[#FFE2BD] tracking-wide">
                The Midnight Key
              </h1>
              <p className="text-[10px] text-[#D6BDC8] font-medium">
                A private Halloween adventure from {senderName} for {partnerName}
              </p>
            </div>
          </div>

          {/* Controls: Cinematic Re-trigger, Music & Midnight Note */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1D1429] hover:bg-[#291D38] border border-[#4A3258] text-[#FFE2BD] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Watch in full-screen cinematic mode"
            >
              <Film className="w-3.5 h-3.5 text-[#F3B574]" />
              <span className="hidden sm:inline">Cinematic Mode</span>
            </button>

            {template.music_track && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                  isAudioPlaying
                    ? "bg-[#342038] text-[#FFE2BD] border-[#F3B574]"
                    : "bg-[#1D1429] text-[#D6BDC8] border-[#4A3258] hover:bg-[#291D38]"
                }`}
                title={isAudioPlaying ? "Mute music" : "Play Halloween soundtrack"}
              >
                {isAudioPlaying ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#F3B574] animate-pulse" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#AA91A5]" />
                )}
                <span className="hidden sm:inline">
                  {isAudioPlaying ? "Soundtrack Playing" : "Play Music 🎃"}
                </span>
              </button>
            )}

            {replyConfig?.enabled && (
              <button
                type="button"
                onClick={() => setActiveDrawer("reply")}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1D1429] hover:bg-[#291D38] border border-[#4A3258] text-[#FFE2BD] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#F3B574]" />
                <span>Leave Note</span>
              </button>
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────
            MAIN 16:9 VIEWPORT CONTAINER & PROMINENT QUOTES
            Exact 16:9 aspect ratio, object-fit: cover, no stretching.
        ───────────────────────────────────────────── */}
        <main className="w-full max-w-5xl my-auto flex flex-col items-center justify-center py-2">
          <div
            className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#120D1C] shadow-[0_20px_60px_-15px_rgba(243,181,116,0.15)] border border-[#4A3258]"
            style={{ maxWidth: "1120px" }}
          >
            {/* Overlapping crossfading images */}
            {MIDNIGHT_KEY_SCENES.map((s, idx) => {
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
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              );
            })}

            {/* Gentle cinematic bottom-gradient for readable HTML text */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

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
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1D1429]/95 backdrop-blur-md border border-[#F3B574]/50 shadow-lg space-y-0.5 text-left">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#FFBC73]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-[#F3B574] text-[#F3B574]" />
                        <span>Note From {senderName}</span>
                      </span>
                      <span className="text-[9px] text-[#AA91A5]">
                        Scene {currentScene + 1}/6
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#FFE2BD] leading-snug">
                      &ldquo;{personalMessage}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prominent Romantic Quote Plate & In-viewport Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pointer-events-none">
              <div className="w-full sm:max-w-xl p-3.5 sm:p-4 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-[#FFBC73] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Quote className="w-3 h-3 fill-[#FFBC73] text-[#FFBC73]" />
                  <span>
                    Scene {scene.order} of {MIDNIGHT_KEY_SCENES.length} • {scene.title}
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
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] hover:brightness-105 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-[#1A0F24]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-[#1A0F24]" />
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={nextScene}
                  disabled={currentScene === MIDNIGHT_KEY_SCENES.length - 1}
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
            {MIDNIGHT_KEY_SCENES.map((s, idx) => {
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
                      ? "border-[#F3B574] scale-[1.03] ring-2 ring-[#F3B574]/30 shadow-md"
                      : "border-[#4A3258] opacity-70 hover:opacity-100 hover:border-[#75536D]"
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
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-white text-[9px] font-bold">
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
                  accentColor={MIDNIGHT_KEY_PALETTE.accent}
                  theme="halloween"
                />
              </div>
            )}

          {/* ─────────────────────────────────────────────
              FINAL INTERACTION CARD: "Will you join me for a Halloween adventure?"
          ───────────────────────────────────────────── */}
          {venueConfig && !invitationConfig?.enabled && <VenueDetails venue={venueConfig} palette={MIDNIGHT_KEY_PALETTE} />}
        {invitationConfig?.enabled && <InvitationTool templateCode={code} partnerName={partnerName} senderName={senderName} config={invitationConfig} palette={MIDNIGHT_KEY_PALETTE} activities={MIDNIGHT_KEY_CONFIG.dateOptions} />}

          {/* ─────────────────────────────────────────────
              ADDITIONAL INTERACTIVE QUBITSELLS TOOLS
          ───────────────────────────────────────────── */}
          {scratchConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <ScratchRevealTool
                templateCode={code}
                config={scratchConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {couponConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <LoveCouponTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={couponConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {pollConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <PollTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={pollConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {questionConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <QuestionTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {revealConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <PrivateRevealTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={revealConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {openWhenConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <OpenWhenLettersTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={openWhenConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {ourStoryConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <OurStoryTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={ourStoryConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}

          {bucketListConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-lg">
              <BucketListTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={bucketListConfig}
                palette={{
                  accent: MIDNIGHT_KEY_PALETTE.accent,
                  glow: MIDNIGHT_KEY_PALETTE.glow,
                  text: MIDNIGHT_KEY_PALETTE.text,
                  dark: MIDNIGHT_KEY_PALETTE.background,
                  card: MIDNIGHT_KEY_PALETTE.card,
                }}
              />
            </div>
          )}
        </main>

        {/* ─────────────────────────────────────────────
            REPLY TOOL DRAWER / MODAL
        ───────────────────────────────────────────── */}
        <AnimatePresence>
          {activeDrawer === "reply" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-[#1D1429] rounded-3xl p-6 shadow-2xl border border-[#4A3258] space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b pb-3 border-[#342038]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#342038] flex items-center justify-center text-[#F3B574]">
                      <Sparkles className="w-4 h-4 text-[#F3B574]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FFE2BD]">
                        Leave a Midnight Note for {senderName}
                      </h3>
                      <p className="text-[11px] text-[#AA91A5]">
                        Attach a voice memo, selfie, or Halloween wish
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="w-8 h-8 rounded-full bg-[#291D38] hover:bg-[#342038] text-[#FFE2BD] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ReplyTool
                  templateCode={code}
                  partnerName={partnerName}
                  senderName={senderName}
                  config={
                    replyConfig || {
                      id: "reply_t01",
                      type: "reply",
                      enabled: true,
                      prompt: "Leave a secret note or reply for me...",
                      enabledFormats: { text: true, photo: true, voice: true },
                      maxChars: 2000,
                      maxPhotos: 3,
                      maxVoiceSeconds: 60,
                      allowMultiple: true,
                      quickReactions: ["🎃", "🗝️", "🌙", "✨", "🖤"],
                    }
                  }
                  palette={{
                    accent: MIDNIGHT_KEY_PALETTE.accent,
                    glow: MIDNIGHT_KEY_PALETTE.glow,
                    text: MIDNIGHT_KEY_PALETTE.text,
                    dark: MIDNIGHT_KEY_PALETTE.background,
                    card: MIDNIGHT_KEY_PALETTE.card,
                  }}
                  onReplySubmitted={() => {
                    // Keep the saved receipt visible until the receiver closes it.
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────
            FOOTER
        ───────────────────────────────────────────── */}
        <footer className="w-full max-w-5xl mx-auto py-3 text-center text-[11px] text-[#AA91A5] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#342038] mt-4">
          <div className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#F3B574]" />
            <span>Made with QubitSells Sanctuary — The Midnight Key</span>
          </div>
          <Link
            href="/templates/halloween-midnight-key"
            className="font-bold text-[#F3B574] hover:underline"
          >
            Create Your Own Midnight Key Story 🗝️
          </Link>
        </footer>
      </div>

      {/* Floating Action Button for Voice/Photo Reply if enabled */}
      {replyConfig?.enabled && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setActiveDrawer("reply")}
            className="px-4 py-3 rounded-full text-[#1A0F24] font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Reply to {senderName}</span>
          </button>
        </div>
      )}
    </div>
  );
}
