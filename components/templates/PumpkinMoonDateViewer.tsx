"use client";

import StoryStartButton from "./StoryStartButton";
import VenueDetails from "@/components/tools/VenueDetails";
import type { VenueToolConfig } from "@/lib/supabase/coupleTemplates";
import { InvitationTool } from "@/components/tools/InvitationTool";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Pause, RotateCcw, SkipForward, ChevronLeft, ChevronRight, Volume2, VolumeX, MessageSquare, Sparkles, X, Quote, Film, ArrowDown, Maximize2 } from "lucide-react";
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
  PUMPKIN_MOON_SCENES,
  PUMPKIN_MOON_CONFIG,
  PUMPKIN_MOON_PALETTE,
} from "@/lib/constants/pumpkinMoonTemplate";
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

interface PumpkinMoonDateViewerProps {
  template: AnimeTemplate;
  code: string;
}

export default function PumpkinMoonDateViewer({
  template,
  code,
}: PumpkinMoonDateViewerProps) {
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
        isUserMutedRef.current = true;

        setIsAudioPlaying(false);
        audioRef.current.pause();
      } else {
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
      if (prev < PUMPKIN_MOON_SCENES.length - 1) {
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
        if (currentScene < PUMPKIN_MOON_SCENES.length - 1) {
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
    setCurrentScene(PUMPKIN_MOON_SCENES.length - 1);
    setHasCompletedAllScenes(true);
  };

  const handleExitCinematic = () => {
    setIsIntroActive(false);
    setHasOpened(true);
    setIsCinematicMode(false);
    setHasCompletedAllScenes(true);
    setTimeout(() => {
      const el = document.getElementById("pumpkin-moon-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const scene = PUMPKIN_MOON_SCENES[currentScene] || PUMPKIN_MOON_SCENES[0];
  const partnerName = template.partner_name || (template as unknown as { partner_to?: string }).partner_to || "My Love";
  const senderName = template.partner_from || "Me";
  const personalMessage =
    template.message || PUMPKIN_MOON_CONFIG.defaultMessage;
  const isMessagePhase = currentScene >= 4; // Scene 5 (index 4) reveals personal message
  const isFinalScene = currentScene === PUMPKIN_MOON_SCENES.length - 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-4 px-3 sm:px-6 relative select-none font-sans"
      style={{
        backgroundColor: PUMPKIN_MOON_PALETTE.background,
        color: PUMPKIN_MOON_PALETTE.text,
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
            className="fixed inset-0 z-50 bg-[#0F0A06] text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* 1. CINEMATIC FULLSCREEN SCENE DISPLAY */}
            <div className="absolute inset-0 overflow-hidden z-0">
              {PUMPKIN_MOON_SCENES.map((s, idx) => {
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
                        className="object-cover object-center blur-3xl opacity-40 scale-110 select-none"
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A06]/95 via-transparent to-[#0F0A06]/40 pointer-events-none z-[6]" />
            </div>

            {/* 2. TOP CINEMATIC BAR: Multi-segment Progress Bars & Quick Controls */}
            <div
              className={`relative z-20 w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-3 transition-all duration-700 ${
                isIntroActive
                  ? "opacity-0 -translate-y-4 pointer-events-none"
                  : "opacity-100 translate-y-0"
              }`}
            >
              {/* 6-segment story progress bars with warm orange gradient */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {PUMPKIN_MOON_SCENES.map((_, idx) => {
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
                        className="h-full bg-gradient-to-r from-[#FF7518] to-[#FFD166] rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(255,117,24,0.7)]"
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
                  <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/15 text-[11px] font-bold text-[#FFD166] flex items-center gap-1.5 backdrop-blur-md">
                    <Film className="w-3.5 h-3.5 text-[#FF7518]" />
                    <span>Pumpkin Moon Date</span>
                  </span>
                  <span className="text-xs text-[#FFF3E3]/90 font-medium hidden sm:inline drop-shadow-md">
                    Scene {currentScene + 1} of {PUMPKIN_MOON_SCENES.length} • {scene.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {template.music_track && (
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-md"
                    >
                      {isAudioPlaying ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#FF7518] animate-pulse" />
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
                    className="px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:border-[#FF7518] shadow-md"
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
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] pointer-events-none" />

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
                        className="text-[11px] sm:text-xs font-black uppercase text-[#FFD166] drop-shadow-[0_2px_12px_rgba(255,117,24,0.7)]"
                      >
                        A &nbsp; L I T T L E &nbsp; H A L L O W E E N &nbsp; M A G I C , &nbsp; J U S T &nbsp; F O R &nbsp; U S .
                      </motion.p>

                      <h1 className="text-4xl sm:text-6xl md:text-7xl font-halloween text-white tracking-wide drop-shadow-[0_8px_35px_rgba(255,117,24,0.55)]">
                        Pumpkin Moon Date
                      </h1>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                        className="space-y-1.5 pt-2"
                      >
                        <p className="text-xl sm:text-3xl font-bold text-[#FFF3E3] drop-shadow-[0_4px_20px_rgba(255,117,24,0.6)]">
                          For {partnerName}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-[#C49A76] tracking-wide">
                          A 6-scene autumn story created with love by {senderName}
                        </p>
                      </motion.div>
                    <StoryStartButton onClick={handleSkipIntro} hasMusic={!!template.music_track} accent="#FF7518" onAccent="#171018" />
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
                  className="absolute inset-0 z-40 bg-[#0F0A06]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-[#1C1109] border-2 border-[#FF7518] flex items-center justify-center text-3xl shadow-[0_0_35px_rgba(255,117,24,0.5)]">
                    🎃
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h2 className="text-3xl sm:text-4xl font-halloween text-[#FFF3E3] drop-shadow-md">
                      You&#39;ve Reached Our Pumpkin Moon Date!
                    </h2>
                    <p className="text-sm text-[#C49A76]">
                      From picking our pumpkins to carving glowing lanterns, my favorite moments will always be with you.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleExitCinematic}
                      className="px-7 py-3 rounded-full bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] font-extrabold text-sm shadow-[0_0_25px_rgba(255,117,24,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Explore Full Page &amp; RSVP</span>
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleReplay}
                      className="px-6 py-3 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
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
                    className="p-4 sm:p-5 rounded-2xl bg-[#0F0A06]/85 backdrop-blur-md border border-[#542D14] shadow-2xl text-center space-y-1.5"
                  >
                    <div className="flex items-center justify-center gap-2 text-[#FFD166] text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <Quote className="w-3.5 h-3.5 fill-[#FF7518] text-[#FF7518]" />
                      <span>
                        Scene {scene.order} of {PUMPKIN_MOON_SCENES.length} • {scene.title}
                      </span>
                    </div>

                    <p className="text-base sm:text-lg font-bold text-[#FFF3E3] leading-snug">
                      &ldquo;{scene.caption}&rdquo;
                    </p>

                    {/* Interactive prompt during scene 5 */}
                    {isMessagePhase && personalMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pt-2 max-w-lg mx-auto"
                      >
                        <div className="p-3 rounded-xl bg-[#1C1109]/90 border border-[#FF7518]/60 text-xs font-medium text-[#FFF3E3] shadow-md">
                          <span className="font-bold text-[#FFD166] mr-1">
                            A sealed note from {senderName}:
                          </span>
                          &ldquo;{personalMessage}&rdquo;
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Navigation Buttons */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevScene}
                    disabled={currentScene === 0}
                    className="px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] hover:brightness-105 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-[#0F0A06]" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-[#0F0A06]" />
                    )}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={nextScene}
                    disabled={currentScene === PUMPKIN_MOON_SCENES.length - 1}
                    className="px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {!isFinalScene && (
                    <button
                      type="button"
                      onClick={handleSkipToEnd}
                      className="px-3.5 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <span>Skip to Invitation</span>
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isFinalScene && (
                    <button
                      type="button"
                      onClick={handleReplay}
                      className="px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          STANDARD SCROLLABLE PAGE EXPERIENCE
          Shown when not in cinematic mode or after exiting cinematic mode
      ───────────────────────────────────────────── */}
      <div id="pumpkin-moon-content" className="w-full max-w-5xl mx-auto space-y-6 pt-2">
        {/* Sticky Header */}
        <header className="w-full max-w-5xl mx-auto py-2.5 px-4 rounded-2xl bg-[#1C1109]/85 backdrop-blur-md border border-[#542D14] flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#2A180C] border border-[#FF7518]/50 flex items-center justify-center text-[#FF7518] shadow-2xs">
              <span className="text-sm">🎃</span>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-halloween text-[#FFF3E3] tracking-wide">
                Pumpkin Moon Date
              </h1>
              <p className="text-[10px] text-[#C49A76] font-medium">
                A private Halloween celebration from {senderName} for {partnerName}
              </p>
            </div>
          </div>

          {/* Controls: Cinematic Re-trigger, Music & Midnight Note */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1C1109] hover:bg-[#2A180C] border border-[#542D14] text-[#FFF3E3] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Watch in full-screen cinematic mode"
            >
              <Film className="w-3.5 h-3.5 text-[#FF7518]" />
              <span className="hidden sm:inline">Cinematic Mode</span>
            </button>

            {template.music_track && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                  isAudioPlaying
                    ? "bg-[#2A180C] text-[#FFF3E3] border-[#FF7518]"
                    : "bg-[#1C1109] text-[#C49A76] border-[#542D14] hover:bg-[#2A180C]"
                }`}
                title={isAudioPlaying ? "Mute music" : "Play Halloween soundtrack"}
              >
                {isAudioPlaying ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#FF7518] animate-pulse" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#C49A76]" />
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
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#1C1109] hover:bg-[#2A180C] border border-[#542D14] text-[#FFF3E3] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#FF7518]" />
                <span>Leave Note</span>
              </button>
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────
            MAIN 16:9 VIEWPORT CONTAINER & PROMINENT QUOTES
        ───────────────────────────────────────────── */}
        <main className="w-full max-w-5xl my-auto flex flex-col items-center justify-center py-2">
          <div
            className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#080503] shadow-[0_20px_60px_-15px_rgba(255,117,24,0.2)] border border-[#542D14]"
            style={{ maxWidth: "1120px" }}
          >
            {/* Overlapping crossfading images */}
            {PUMPKIN_MOON_SCENES.map((s, idx) => {
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
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none z-10" />

            {/* Fullscreen Cinematic Mode Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md cursor-pointer shadow-md"
              title="Expand to Fullscreen Cinematic Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#FF7518]" />
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
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1C1109]/95 backdrop-blur-md border border-[#FF7518]/60 shadow-lg space-y-0.5 text-left">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#FFD166]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-[#FF7518] text-[#FF7518]" />
                        <span>Note From {senderName}</span>
                      </span>
                      <span className="text-[9px] text-[#C49A76]">
                        Scene {currentScene + 1}/6
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#FFF3E3] leading-snug">
                      &ldquo;{personalMessage}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prominent Romantic Quote Plate & In-viewport Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pointer-events-none">
              <div className="w-full sm:max-w-xl p-3.5 sm:p-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-xl space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-[#FFD166] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Quote className="w-3 h-3 fill-[#FF7518] text-[#FF7518]" />
                  <span>
                    Scene {scene.order} of {PUMPKIN_MOON_SCENES.length} • {scene.title}
                  </span>
                </div>
                <p className="text-base sm:text-xl font-black text-white leading-snug drop-shadow-md">
                  &ldquo;{scene.caption}&rdquo;
                </p>
              </div>

              {/* In-viewport Controls */}
              <div className="flex items-center gap-1.5 pointer-events-auto self-end">
                <button
                  type="button"
                  onClick={prevScene}
                  disabled={currentScene === 0}
                  className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Previous scene"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] hover:brightness-105 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-[#0F0A06]" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-[#0F0A06]" />
                  )}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={nextScene}
                  disabled={currentScene === PUMPKIN_MOON_SCENES.length - 1}
                  className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
                  aria-label="Next scene"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isFinalScene && (
                  <button
                    type="button"
                    onClick={handleSkipToEnd}
                    className="px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-sm"
                  >
                    <span>Skip</span>
                    <SkipForward className="w-3 h-3" />
                  </button>
                )}

                {isFinalScene && (
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer backdrop-blur-sm"
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
            {PUMPKIN_MOON_SCENES.map((s, idx) => {
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
                      ? "border-[#FF7518] scale-[1.03] ring-2 ring-[#FF7518]/40 shadow-md"
                      : "border-[#542D14] opacity-70 hover:opacity-100 hover:border-[#8C441B]"
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
          ───────────────────────────────────────────── */}
          {floatingGalleryConfig &&
            floatingGalleryConfig.items &&
            floatingGalleryConfig.items.length > 0 && (
              <div className="w-full mt-8">
                <FloatingQuoteGallery
                  items={floatingGalleryConfig.items}
                  title={floatingGalleryConfig.title}
                  subtitle={floatingGalleryConfig.subtitle}
                  accentColor={PUMPKIN_MOON_PALETTE.accent}
                  theme="pumpkin-moon"
                />
              </div>
            )}

          {/* ─────────────────────────────────────────────
              FINAL INTERACTION CARD: "Will you be my Halloween date?"
          ───────────────────────────────────────────── */}
          {venueConfig && !invitationConfig?.enabled && <VenueDetails venue={venueConfig} palette={PUMPKIN_MOON_PALETTE} />}
        {invitationConfig?.enabled && <InvitationTool templateCode={code} partnerName={partnerName} senderName={senderName} config={invitationConfig} palette={PUMPKIN_MOON_PALETTE} activities={PUMPKIN_MOON_CONFIG.dateOptions} />}

          {/* ─────────────────────────────────────────────
              ADDITIONAL INTERACTIVE QUBITSELLS TOOLS
          ───────────────────────────────────────────── */}
          {scratchConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <ScratchRevealTool
                templateCode={code}
                config={scratchConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {couponConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <LoveCouponTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={couponConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {pollConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <PollTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={pollConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {questionConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <QuestionTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {revealConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <PrivateRevealTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={revealConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {openWhenConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <OpenWhenLettersTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={openWhenConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {ourStoryConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <OurStoryTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={ourStoryConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
                }}
              />
            </div>
          )}

          {bucketListConfig && (
            <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg">
              <BucketListTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={bucketListConfig}
                palette={{
                  accent: PUMPKIN_MOON_PALETTE.accent,
                  glow: PUMPKIN_MOON_PALETTE.glow,
                  text: PUMPKIN_MOON_PALETTE.text,
                  dark: PUMPKIN_MOON_PALETTE.background,
                  card: PUMPKIN_MOON_PALETTE.card,
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-[#1C1109] rounded-3xl p-6 shadow-2xl border border-[#542D14] space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b pb-3 border-[#2A180C]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#2A180C] flex items-center justify-center text-[#FF7518]">
                      <Sparkles className="w-4 h-4 text-[#FF7518]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FFF3E3]">
                        Leave a Pumpkin Moon Note for {senderName}
                      </h3>
                      <p className="text-[11px] text-[#C49A76]">
                        Attach a voice memo, selfie, or Halloween wish
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="w-8 h-8 rounded-full bg-[#2A180C] hover:bg-[#542D14] text-[#FFF3E3] flex items-center justify-center cursor-pointer transition-colors"
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
                      prompt: "Leave a cozy note or reply for me...",
                      enabledFormats: { text: true, photo: true, voice: true },
                      maxChars: 2000,
                      maxPhotos: 3,
                      maxVoiceSeconds: 60,
                      allowMultiple: true,
                      quickReactions: ["🎃", "🌙", "✨", "🍂", "🧡"],
                    }
                  }
                  palette={{
                    accent: PUMPKIN_MOON_PALETTE.accent,
                    glow: PUMPKIN_MOON_PALETTE.glow,
                    text: PUMPKIN_MOON_PALETTE.text,
                    dark: PUMPKIN_MOON_PALETTE.background,
                    card: PUMPKIN_MOON_PALETTE.card,
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
        <footer className="w-full max-w-5xl mx-auto py-3 text-center text-[11px] text-[#C49A76] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#2A180C] mt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎃</span>
            <span>Made with QubitSells Sanctuary — Pumpkin Moon Date</span>
          </div>
          <Link
            href="/templates/halloween-pumpkin-moon"
            className="font-bold text-[#FF7518] hover:underline"
          >
            Create Your Own Pumpkin Moon Story 🌙
          </Link>
        </footer>
      </div>

      {/* Floating Action Button for Voice/Photo Reply if enabled */}
      {replyConfig?.enabled && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setActiveDrawer("reply")}
            className="px-4 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Reply to {senderName}</span>
          </button>
        </div>
      )}
    </div>
  );
}
