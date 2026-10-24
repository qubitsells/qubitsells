"use client";

import StoryStartButton from "./StoryStartButton";
import VenueDetails from "@/components/tools/VenueDetails";
import type { VenueToolConfig } from "@/lib/supabase/coupleTemplates";
import { InvitationTool } from "@/components/tools/InvitationTool";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Pause, RotateCcw, SkipForward, ChevronLeft, ChevronRight, Volume2, VolumeX, MessageSquare, X, Quote, Film, ArrowDown, Maximize2 } from "lucide-react";
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
import { PINK_DAY_SCENES, PINK_DAY_CONFIG, PINK_DAY_PALETTE } from "@/lib/constants/pinkDayTemplate";
import { ReplyTool } from "@/components/tools/ReplyTool";
import { ScratchRevealTool } from "@/components/tools/ScratchRevealTool";
import { LoveCouponTool } from "@/components/tools/LoveCouponTool";
import { OpenWhenLettersTool } from "@/components/tools/OpenWhenLettersTool";
import { OurStoryTool } from "@/components/tools/OurStoryTool";
import { BucketListTool } from "@/components/tools/BucketListTool";
import { PrivateRevealTool } from "@/components/tools/PrivateRevealTool";
import { QuestionTool } from "@/components/tools/QuestionTool";
import { PollTool } from "@/components/tools/PollTool";
import { FloatingQuoteGallery, type FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

interface OurLittlePinkDayViewerProps {
  template: AnimeTemplate;
  code: string;
}

export default function OurLittlePinkDayViewer({ template, code }: OurLittlePinkDayViewerProps) {
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
    (t): t is { id: string; type: "floating_gallery"; enabled?: boolean; title?: string; subtitle?: string; items?: FloatingGalleryItem[] } => {
      const tool = t as { type?: string; enabled?: boolean } | null | undefined;
      return tool?.type === "floating_gallery" && tool.enabled !== false;
    }
  );

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  const isYouTube = template.music_track?.type === "youtube" || Boolean(template.music_track?.youtubeId);
  const ytVideoId =
    template.music_track?.youtubeId ||
    (isYouTube && template.music_track?.id?.replace(/^yt-/, "")) ||
    null;

  // Audio play/pause handler (requires explicit user interaction)
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
          try { audioRef.current.currentTime = startSec; } catch {}
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
      if (prev < PINK_DAY_SCENES.length - 1) {
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
        if (currentScene < PINK_DAY_SCENES.length - 1) {
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

      if (isUserMutedRef.current) return; // Respect user mute!

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
    setCurrentScene(PINK_DAY_SCENES.length - 1);
    setHasCompletedAllScenes(true);
  };

  const handleExitCinematic = () => {
    setIsIntroActive(false);
    setHasOpened(true);
    setIsCinematicMode(false);
    setHasCompletedAllScenes(true);
    setTimeout(() => {
      const el = document.getElementById("pink-day-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const scene = PINK_DAY_SCENES[currentScene];
  const partnerName = template.partner_name || "My Love";
  const senderName = template.partner_from || "Me";
  const personalMessage = template.message || PINK_DAY_CONFIG.defaultMessage;
  const isMessagePhase = currentScene >= 3; // Scene 4+ introduces personal message
  const isFinalScene = currentScene === PINK_DAY_SCENES.length - 1;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-4 px-3 sm:px-6 relative select-none font-sans"
      style={{
        backgroundColor: PINK_DAY_PALETTE.background,
        color: PINK_DAY_PALETTE.text,
      }}
    >
      {/* Soundtrack is preloaded, and played directly from the Continue button */}
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
            if (!isUserMutedRef.current) return; // don't mark as not-playing if browser paused automatically
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
            src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&start=${template.music_track?.startAt || 0}&enablejsapi=1&loop=1&playlist=${ytVideoId}`}
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
            className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* 1. CINEMATIC FULLSCREEN SCENE DISPLAY (PROPER TOP-TO-BOTTOM VISIBILITY) */}
            <div className="absolute inset-0 overflow-hidden z-0">
              {PINK_DAY_SCENES.map((s, idx) => {
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
                    {/* Seamlessly fills wide or tall screens with the scene's matching atmospheric glow */}
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
                    {/* Properly framed from the top down, never cutting off characters' heads, awning, or faces */}
                    <div className="absolute inset-0 pt-14 sm:pt-16 pb-28 sm:pb-32 px-3 sm:px-6 flex items-center justify-center">
                      <div
                        className="relative w-full h-full max-w-7xl"
                        style={{
                          transform: isCurrent && !prefersReducedMotion ? "scale(1.02)" : "scale(1)",
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

              {/* Gentle vignettes that preserve brightness at the top */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none z-[6]" />
            </div>

            {/* 2. TOP CINEMATIC BAR: Multi-segment Progress Bars & Quick Controls */}
            <div
              className={`relative z-20 w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-3 transition-all duration-700 ${
                isIntroActive ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
              }`}
            >
              {/* Instagram/TikTok-style 6-segment story progress bars (visible once opened) */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {PINK_DAY_SCENES.map((_, idx) => {
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
                        className="h-full bg-rose-400 rounded-full transition-all duration-100"
                        style={{
                          width: hasOpened ? (isPast ? "100%" : isCurrent ? `${sceneProgress}%` : "0%") : "0%",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Header Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-[11px] font-bold text-rose-300 flex items-center gap-1.5 backdrop-blur-md">
                    <Film className="w-3.5 h-3.5 text-rose-300" />
                    <span>Cinematic Story Mode</span>
                  </span>
                  <span className="text-xs text-white/80 font-medium hidden sm:inline drop-shadow-md">
                    Scene {currentScene + 1} of {PINK_DAY_SCENES.length} • {scene.title}
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
                          <Volume2 className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                          <span className="hidden sm:inline">Sound On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-white/60" />
                          <span className="hidden sm:inline">Unmute 🎵</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExitCinematic}
                    className="px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:border-rose-300 shadow-md"
                    title="Exit to normal scrollable page"
                  >
                    <span>Exit to Page</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. CENTER: DRAMATIC CINEMATIC START TITLE SEQUENCE (TITLE AND USER-ACTIVATED START) */}
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
                  {/* Atmospheric soft overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />

                  {/* Cinematic typography and a clear start button */}
                  <div className="relative z-10 flex flex-col items-center max-w-3xl px-4 space-y-6">
                    {/* Dramatic Cinematic Text Coming smoothly from the distance */}
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
                        ease: [0.16, 1, 0.3, 1], // cinematic smooth deceleration
                      }}
                      className="space-y-4"
                    >
                      <motion.p
                        initial={{ letterSpacing: "0.2em", opacity: 0 }}
                        animate={{ letterSpacing: "0.38em", opacity: 0.95 }}
                        transition={{ duration: 1.8, delay: 0.3 }}
                        className="text-[11px] sm:text-xs font-black uppercase text-rose-300 drop-shadow-[0_2px_12px_rgba(217,70,118,0.6)]"
                      >
                        L I T T L E &nbsp; M O M E N T S . &nbsp; F A V O R I T E &nbsp; P E R S O N .
                      </motion.p>

                      <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-[0_8px_35px_rgba(255,255,255,0.45)] font-serif sm:font-sans">
                        Our Little Pink Day
                      </h1>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                        className="space-y-1.5 pt-2"
                      >
                        <p className="text-xl sm:text-3xl font-bold text-rose-100 drop-shadow-[0_4px_20px_rgba(217,70,118,0.5)]">
                          For {partnerName}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-rose-200/80 tracking-wide">
                          A 6-scene story created with love by {senderName}
                        </p>
                      </motion.div>
                    <StoryStartButton onClick={handleSkipIntro} hasMusic={!!template.music_track} accent="#FDA4AF" onAccent="#171018" />
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
                    className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-black/75 backdrop-blur-2xl text-white border border-rose-300/40 shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(217,70,118,0.4)] text-center space-y-5"
                  >
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#FFE9F1] flex items-center justify-center text-3xl shadow-sm">
                      🌸
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-rose-300">
                        Story Complete ✨
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        You&#39;ve Seen All 6 Scenes!
                      </h2>
                      <p className="text-xs sm:text-sm text-rose-100/80 font-medium leading-relaxed">
                        Now explore our floating memory collage, secret couple surprises, and pick our next date together ❤️
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExitCinematic}
                      className="w-full py-4 rounded-full bg-gradient-to-r from-[#A43F66] to-[#D94676] text-white font-bold text-sm shadow-[0_0_30px_rgba(217,70,118,0.5)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Explore Full Page &amp; Pick Our Date</span>
                      <ArrowDown className="w-4 h-4 animate-bounce" />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 4. BOTTOM BAR: PROMINENT QUOTE PLATE & CONTROLS (Active once story has started) */}
            <div className="relative z-20 w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 space-y-3">
              {/* PROMINENT ROMANTIC QUOTE PLATE */}
              <AnimatePresence mode="wait">
                {hasOpened && (
                  <motion.div
                    key={`cine-quote-${currentScene}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-black/75 backdrop-blur-xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center space-y-2"
                  >
                    <div className="flex items-center justify-center gap-2 text-rose-300 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <Quote className="w-3.5 h-3.5 fill-rose-300 text-rose-300" />
                      <span>Scene {scene.order} of 6 • {scene.title}</span>
                    </div>

                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wide leading-snug drop-shadow-lg">
                      &ldquo;{scene.caption}&rdquo;
                    </p>

                    {/* Personal note from Marsad/Creator */}
                    {isMessagePhase && personalMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2.5 mt-1 border-t border-white/15 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-rose-200"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" />
                        <span>Note from {senderName}: &ldquo;{personalMessage}&rdquo;</span>
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
                      className="px-6 py-2.5 rounded-full bg-white text-[#51253E] hover:bg-rose-50 text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xl transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-[#51253E]" /> : <Play className="w-4 h-4 fill-[#51253E]" />}
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
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#A43F66] to-[#D94676] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-[0_0_25px_rgba(217,70,118,0.5)] transition-all cursor-pointer"
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
      <div id="pink-day-content" className="w-full flex flex-col items-center">
        {/* ─────────────────────────────────────────────
            TOP BRAND & SENDER HEADER
        ───────────────────────────────────────────── */}
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 sm:py-3 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-300 flex items-center justify-center text-rose-600 shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-[#51253E] tracking-tight">
                Our Little Pink Day
              </h1>
              <p className="text-[10px] text-[#A43F66] font-medium">
                A private date story from {senderName} for {partnerName}
              </p>
            </div>
          </div>

          {/* Controls: Cinematic Re-trigger, Music & Love Note */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCinematicMode(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFE9F1] hover:bg-[#F7BFD5] border border-[#F7BFD5] text-[#A43F66] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Watch in full-screen cinematic mode"
            >
              <Film className="w-3.5 h-3.5 text-[#A43F66]" />
              <span className="hidden sm:inline">Cinematic Mode</span>
            </button>

            {template.music_track && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-2xs ${
                  isAudioPlaying
                    ? "bg-rose-100 text-rose-900 border-rose-300"
                    : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                }`}
                title={isAudioPlaying ? "Mute music" : "Play romantic soundtrack"}
              >
                {isAudioPlaying ? <Volume2 className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
                <span className="hidden sm:inline">
                  {isAudioPlaying ? "Music Playing" : "Play Music 🎵"}
                </span>
              </button>
            )}

            {replyConfig?.enabled && (
              <button
                type="button"
                onClick={() => setActiveDrawer("reply")}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Leave Love Note</span>
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
            className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FFE9F1] shadow-[0_20px_60px_-15px_rgba(164,63,102,0.2)] border border-[#F7BFD5]/80"
            style={{
              maxWidth: "1120px",
            }}
          >
            {/* Overlapping crossfading images */}
            {PINK_DAY_SCENES.map((s, idx) => {
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
                      transform: isCurrent && !prefersReducedMotion ? "scale(1.018)" : "scale(1)",
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
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#F7BFD5] shadow-lg space-y-0.5 text-left">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#A43F66]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-[#A43F66]" />
                        <span>Note From {senderName}</span>
                      </span>
                      <span className="text-[9px] text-[#79566C]">Scene {currentScene + 1}/6</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#51253E] leading-snug">
                      &ldquo;{personalMessage}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prominent Romantic Quote Plate & In-viewport Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pointer-events-none">
              <div className="w-full sm:max-w-xl p-3.5 sm:p-4 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-rose-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Quote className="w-3 h-3 fill-rose-300 text-rose-300" />
                  <span>Scene {scene.order} of {PINK_DAY_SCENES.length} • {scene.title}</span>
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
                  className="px-3 py-1.5 rounded-full bg-white text-[#51253E] hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-[#51253E]" /> : <Play className="w-3.5 h-3.5 fill-[#51253E]" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={nextScene}
                  disabled={currentScene === PINK_DAY_SCENES.length - 1}
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
            {PINK_DAY_SCENES.map((s, idx) => {
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
                    ? "border-[#A43F66] scale-[1.03] ring-2 ring-[#A43F66]/30 shadow-md"
                    : "border-white/80 opacity-70 hover:opacity-100 hover:border-rose-300"
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
        {floatingGalleryConfig && floatingGalleryConfig.items && floatingGalleryConfig.items.length > 0 && (
          <div className="w-full mt-8">
            <FloatingQuoteGallery
              items={floatingGalleryConfig.items}
              title={floatingGalleryConfig.title}
              subtitle={floatingGalleryConfig.subtitle}
              accentColor={PINK_DAY_PALETTE.accent}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────
            FINAL INTERACTION CARD: "Pick our next little date?"
            Always visible on final scene (or when scrolled), connecting
            to the real saved response flow!
        ───────────────────────────────────────────── */}
        {venueConfig && !invitationConfig?.enabled && <VenueDetails venue={venueConfig} palette={PINK_DAY_PALETTE} />}
        {invitationConfig?.enabled && <InvitationTool templateCode={code} partnerName={partnerName} senderName={senderName} config={invitationConfig} palette={PINK_DAY_PALETTE} activities={PINK_DAY_CONFIG.dateOptions} />}

        {/* ─────────────────────────────────────────────
            ADDITIONAL INTERACTIVE QUBITSELLS TOOLS
        ───────────────────────────────────────────── */}
        {scratchConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <ScratchRevealTool
              templateCode={code}
              config={scratchConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {couponConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <LoveCouponTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={couponConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {pollConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <PollTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={pollConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {questionConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <QuestionTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {revealConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <PrivateRevealTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={revealConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {openWhenConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <OpenWhenLettersTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={openWhenConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {ourStoryConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <OurStoryTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={ourStoryConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
              }}
            />
          </div>
        )}

        {bucketListConfig && (
          <div className="w-full max-w-3xl mt-6 p-6 sm:p-8 rounded-3xl bg-white border border-[#F7BFD5] shadow-lg">
            <BucketListTool
              templateCode={code}
              partnerName={partnerName}
              senderName={senderName}
              config={bucketListConfig}
              palette={{
                accent: PINK_DAY_PALETTE.accent,
                glow: PINK_DAY_PALETTE.glow,
                text: PINK_DAY_PALETTE.text,
                dark: PINK_DAY_PALETTE.text,
                card: "#FFFFFF",
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3 border-rose-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FFE9F1] flex items-center justify-center text-rose-600">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#51253E]">
                      Leave a Love Note for {senderName}
                    </h3>
                    <p className="text-[11px] text-[#79566C]">
                      Attach a voice note, photo, or sweet message
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-[#51253E] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Real connected ReplyTool component */}
              <ReplyTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={replyConfig || {
                  id: "reply_t01",
                  type: "reply",
                  enabled: true,
                  prompt: "Leave a love note or message for me...",
                  enabledFormats: { text: true, photo: true, voice: true },
                  maxChars: 2000,
                  maxPhotos: 3,
                  maxVoiceSeconds: 60,
                  allowMultiple: true,
                  quickReactions: ["❤️", "🥰", "🥺", "✨", "💋"],
                }}
                palette={{
                  accent: PINK_DAY_PALETTE.accent,
                  glow: PINK_DAY_PALETTE.glow,
                  text: PINK_DAY_PALETTE.text,
                  dark: PINK_DAY_PALETTE.text,
                  card: PINK_DAY_PALETTE.surface,
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
      <footer className="w-full max-w-5xl mx-auto py-3 text-center text-[11px] text-[#79566C] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-rose-100/80 mt-4">
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
          <span>Made with QubitSells Sanctuary — Our Little Pink Day</span>
        </div>
        <Link
          href="/templates/our-little-pink-day"
          className="font-bold text-[#A43F66] hover:underline"
        >
          Create Your Own Little Pink Day Story ✨
        </Link>
      </footer>
      </div>
    </div>
  );
}
