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
  Zap,
  Flame,
  Shield,
  Scroll,
  Clock,
  Compass,
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
  STORM_AND_FLAME_SCENES,
  STORM_AND_FLAME_CONFIG,
  STORM_AND_FLAME_PALETTE,
} from "@/lib/constants/animeStormAndFlameTemplate";
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

interface AnimeStormAndFlameViewerProps {
  template: AnimeTemplate;
  code: string;
}

function getStormAndFlameOptionIcon(optId: string) {
  switch (optId) {
    case "opt_anime":
      return Film;
    case "opt_date":
      return Sparkles;
    case "opt_promise":
      return Scroll;
    default:
      return Zap;
  }
}

export default function AnimeStormAndFlameViewer({
  template,
  code,
}: AnimeStormAndFlameViewerProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Cinematic full-screen experience state
  const [isCinematicMode, setIsCinematicMode] = useState(true);
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [hasCompletedAllScenes, setHasCompletedAllScenes] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isUserMutedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isYouTube =
    template.music_track?.type === "youtube" ||
    Boolean(template.music_track?.youtubeId);
  const ytVideoId =
    template.music_track?.youtubeId ||
    (isYouTube && template.music_track?.id?.replace(/^yt-/, "")) ||
    null;

  const postYtMessage = useCallback((func: string, args: unknown[] = []) => {
    try {
      ytIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    } catch {}
  }, []);

  const attemptPlay = useCallback(async () => {
    if (isUserMutedRef.current) return;

    if (isYouTube) {
      setIsAudioPlaying(true);
      setAutoplayBlocked(false);
      postYtMessage("playVideo");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const startSec = template.music_track?.startAt || 0;
    if (startSec > 0 && audio.currentTime < 1) {
      try {
        audio.currentTime = startSec;
      } catch {}
    }

    try {
      audio.muted = false;
      await audio.play();
      setIsAudioPlaying(true);
      setAutoplayBlocked(false);
    } catch (err: unknown) {
      // Chrome blocks autoplay until the user interacts with the page
      console.log("Audio autoplay restricted by browser policy, awaiting user gesture:", err);
      setAutoplayBlocked(true);
      setIsAudioPlaying(false);
    }
  }, [isYouTube, template.music_track, postYtMessage]);

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

  // If not in cinematic mode, skip the title intro sequence
  useEffect(() => {
    if (!isCinematicMode) {
      setIsIntroActive(false);
      setHasOpened(true);
    }
  }, [isCinematicMode]);

  // Universal user-gesture unlock: allows sound to immediately begin on the very first touch/click in Chrome
  useEffect(() => {
    const handleGestureUnlock = () => {
      if (isUserMutedRef.current) return;
      if (isAudioPlaying && !autoplayBlocked) return;
      void attemptPlay();
    };

    window.addEventListener("pointerdown", handleGestureUnlock, { capture: true, passive: true });
    window.addEventListener("click", handleGestureUnlock, { capture: true, passive: true });
    window.addEventListener("touchstart", handleGestureUnlock, { capture: true, passive: true });
    window.addEventListener("keydown", handleGestureUnlock, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleGestureUnlock, { capture: true });
      window.removeEventListener("click", handleGestureUnlock, { capture: true });
      window.removeEventListener("touchstart", handleGestureUnlock, { capture: true });
      window.removeEventListener("keydown", handleGestureUnlock, { capture: true });
    };
  }, [isAudioPlaying, autoplayBlocked, attemptPlay]);

  // Smooth per-second progress ticker for the 5-second scene indicator bar
  useEffect(() => {
    if (!isPlaying) {
      setSceneProgress(0);
      return;
    }

    const duration = 5000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    setSceneProgress(0);
    const interval = setInterval(() => {
      setSceneProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + step;
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

  const stormFlameMeta = (template.tools as unknown[] | undefined)?.find(
    (t) => (t as { id?: string })?.id === "storm_flame_meta"
  ) as { sacred_promise?: string; opening_tagline?: string } | undefined;

  const sacredPromiseText =
    stormFlameMeta?.sacred_promise || STORM_AND_FLAME_CONFIG.defaultPromise;
  const openingTaglineText =
    stormFlameMeta?.opening_tagline || STORM_AND_FLAME_CONFIG.defaultOpening;

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
          if (next) {
            postYtMessage("playVideo");
            setAutoplayBlocked(false);
          } else {
            postYtMessage("pauseVideo");
          }
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
        void attemptPlay();
      }
    },
    [isYouTube, isAudioPlaying, attemptPlay, postYtMessage]
  );

  // Scene transition schedule
  const nextScene = useCallback(() => {
    setCurrentScene((prev) => {
      if (prev < STORM_AND_FLAME_SCENES.length - 1) {
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
        if (currentScene < STORM_AND_FLAME_SCENES.length - 1) {
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
      isUserMutedRef.current = false;
      setIsAudioMuted(false);
      void attemptPlay();
    },
    [attemptPlay]
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
    setCurrentScene(STORM_AND_FLAME_SCENES.length - 1);
    setHasCompletedAllScenes(true);
  };

  const handleExitCinematic = () => {
    setIsCinematicMode(false);
    setHasCompletedAllScenes(true);
    setTimeout(() => {
      const el = document.getElementById("storm-flame-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Submit Date RSVP
  const handleRsvpSubmit = async () => {
    if (!selectedChoice) return;
    setIsSubmittingRsvp(true);

    try {
      const choiceLabel =
        showCustomInput && customIdea.trim() ? customIdea.trim() : selectedChoice;
      const isDeclined = choiceLabel === "Maybe later";

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
            partner_note_text: partnerNote.trim() || undefined,
          }),
        });
      } catch {
        // Fallback for standalone preview
      }

      setRsvpSubmitted(true);
      setRsvpStatusText(
        isDeclined
          ? "You noted you'll decide later. Your partner has been informed!"
          : `Awesome! You chose "${choiceLabel}". Your response has been saved!`
      );
    } catch {
      setRsvpStatusText("Response saved! Thank you for choosing.");
      setRsvpSubmitted(true);
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const partnerName = template.partner_name || "You";
  const senderName = template.partner_from || "Me";
  const personalMessage =
    template.message || STORM_AND_FLAME_CONFIG.defaultMessage;
  const isMessagePhase = currentScene >= 4;
  const isFinalScene = currentScene === STORM_AND_FLAME_SCENES.length - 1;

  const stormFlamePalette = {
    accent: STORM_AND_FLAME_PALETTE.accent,
    glow: STORM_AND_FLAME_PALETTE.amber,
    text: STORM_AND_FLAME_PALETTE.text,
    dark: STORM_AND_FLAME_PALETTE.background,
    card: STORM_AND_FLAME_PALETTE.surface,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-4 px-3 sm:px-6 relative select-none font-sans"
      style={{
        backgroundColor: STORM_AND_FLAME_PALETTE.background,
        color: STORM_AND_FLAME_PALETTE.text,
      }}
    >
      {/* Hidden MP3 audio element */}
      {template.music_track?.mp3Url && !isYouTube && (
        <audio
          ref={audioRef}
          src={template.music_track.mp3Url}
          loop
          preload="auto"
          style={{ display: "none" }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            const startSec = template.music_track?.startAt || 0;
            if (startSec > 0) {
              try {
                el.currentTime = startSec;
              } catch {}
            }
          }}
          onCanPlay={() => {
            setAudioReady(true);
            if (!isUserMutedRef.current && !isAudioPlaying) {
              void attemptPlay();
            }
          }}
          onPlay={() => {
            setIsAudioPlaying(true);
            setAutoplayBlocked(false);
          }}
          onPause={() => {
            if (isUserMutedRef.current) {
              setIsAudioPlaying(false);
            }
          }}
        />
      )}

      {/* Hidden YouTube background audio iframe */}
      {isYouTube && ytVideoId && (
        <div
          className="fixed -bottom-96 -right-96 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <iframe
            ref={ytIframeRef}
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

      {/* Floating Unmute Banner for browsers requiring user gesture (Chrome) */}
      <AnimatePresence>
        {autoplayBlocked && !isAudioPlaying && template.music_track && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              isUserMutedRef.current = false;
              setIsAudioMuted(false);
              void attemptPlay();
            }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#0F1A2E]/95 border border-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.45)] backdrop-blur-xl flex items-center gap-2.5 text-xs text-[#EFF7FF] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all select-none animate-pulse"
          >
            <Volume2 className="w-4 h-4 text-[#00E5FF] animate-bounce" />
            <span>Tap anywhere to enable soundtrack 🎵</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          CINEMATIC FULLSCREEN OVERLAY
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isCinematicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="fixed inset-0 z-50 bg-[#050B16] text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* 1. CINEMATIC FULLSCREEN SCENE DISPLAY */}
            <div className="absolute inset-0 overflow-hidden z-0">
              {STORM_AND_FLAME_SCENES.map((s, idx) => {
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
                    <div className="relative w-full h-full flex items-center justify-center p-0 sm:p-4">
                      <div className="relative w-full h-full max-w-7xl max-h-[100dvh] aspect-video flex items-center justify-center">
                        <Image
                          src={s.file}
                          alt={s.title}
                          fill
                          priority={idx === 0}
                          sizes="(max-width: 1280px) 100vw, 1280px"
                          className="object-cover object-center select-none shadow-2xl transition-transform duration-[6000ms] ease-out scale-[1.01]"
                        />

                        {/* Soft vignette overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. CINEMATIC TITLE SEQUENCE INTRO */}
            <AnimatePresence>
              {isIntroActive && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                  onClick={handleSkipIntro}
                  className="absolute inset-0 z-40 bg-[#050B16]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer"
                >
                  {/* Subtle lightning & flame energy auras */}
                  <div className="absolute w-96 h-96 rounded-full bg-[#00E5FF]/20 blur-3xl -top-20 -left-20 pointer-events-none animate-pulse" />
                  <div className="absolute w-96 h-96 rounded-full bg-[#FF9900]/20 blur-3xl -bottom-20 -right-20 pointer-events-none animate-pulse" />

                  <motion.div
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="space-y-4 max-w-xl z-10"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold uppercase tracking-widest text-[#00E5FF] shadow-lg">
                      <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
                      <span>Original Japanese Battle-Fantasy Anime</span>
                      <Flame className="w-3.5 h-3.5 text-[#FF9900]" />
                    </div>

                    <h1 className="font-storm-flame text-4xl sm:text-7xl font-bold tracking-wide text-[#EFF7FF] drop-shadow-[0_4px_24px_rgba(0,229,255,0.45)]">
                      Storm &amp; Flame
                    </h1>

                    <p className="font-storm-flame text-lg sm:text-2xl text-[#FF9900] tracking-wider font-semibold">
                      Two powers. One promise.
                    </p>

                    <div className="pt-4 flex flex-col items-center gap-2">
                      <span className="text-sm font-medium text-[#B9CBDF]">
                        A romantic cinematic story created especially for{" "}
                        <strong className="text-white font-bold">{partnerName}</strong>
                      </span>
                      <span className="text-xs text-[#738CA8]">
                        with love from {senderName}
                      </span>
                    </div>

                    <div className="pt-6 flex flex-col items-center">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSkipIntro}
                        className="group relative px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold text-[#050B16] bg-gradient-to-r from-[#00E5FF] via-[#80F0FF] to-[#FF9900] shadow-[0_0_30px_rgba(0,229,255,0.55)] hover:shadow-[0_0_40px_rgba(255,153,0,0.8)] flex items-center gap-3 mx-auto cursor-pointer transition-all animate-pulse"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#050B16] flex items-center justify-center flex-shrink-0">
                          <Play className="w-3.5 h-3.5 fill-[#00E5FF] text-[#00E5FF] ml-0.5 group-hover:fill-[#FF9900] group-hover:text-[#FF9900] transition-colors" />
                        </div>
                        <span className="tracking-wide">Begin Our Story with Music ⚡</span>
                      </motion.button>
                      <span className="mt-2.5 text-[11px] text-[#738CA8]">
                        Click to start soundtrack and watch anime story scenes
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3. TOP BAR: Branding, Scene Title & Fullscreen Controls */}
            <div className="relative z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
              {/* Left: Title & Chapter */}
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#0F1A2E] border border-[#273B5E] flex items-center justify-center text-[#00E5FF] shadow-md">
                  <Zap className="w-4 h-4 text-[#00E5FF]" />
                </span>
                <div>
                  <h2 className="font-storm-flame text-sm sm:text-base font-bold text-[#EFF7FF] tracking-wide">
                    {STORM_AND_FLAME_SCENES[currentScene].title}
                  </h2>
                  <p className="text-[11px] text-[#B9CBDF] font-medium hidden sm:block">
                    Scene {currentScene + 1} of {STORM_AND_FLAME_SCENES.length} • {STORM_AND_FLAME_SCENES[currentScene].storyBeat}
                  </p>
                </div>
              </div>

              {/* Right: Sound, Storybook Page View & Close Controls */}
              <div className="flex items-center gap-2">
                {template.music_track && (
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={`p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                      autoplayBlocked && !isAudioPlaying
                        ? "bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900] shadow-[0_0_15px_rgba(255,153,0,0.4)] animate-pulse"
                        : "bg-black/50 border-white/20 text-[#EFF7FF] hover:bg-black/80"
                    }`}
                  >
                    {autoplayBlocked && !isAudioPlaying ? (
                      <>
                        <VolumeX className="w-4 h-4 text-[#FF9900]" />
                        <span className="text-[11px] font-bold text-[#FF9900]">Tap for Sound 🎵</span>
                      </>
                    ) : isAudioPlaying ? (
                      <>
                        <Volume2 className="w-4 h-4 text-[#00E5FF]" />
                        <span className="hidden sm:inline text-[11px]">Sound On</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-[#738CA8]" />
                        <span className="hidden sm:inline text-[11px]">Sound Off</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExitCinematic}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Interactive Page</span>
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. BOTTOM CAPTION & INTERACTIVE STORY ACTION */}
            <div className="relative z-30 p-4 sm:p-8 pb-6 flex flex-col items-center text-center space-y-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              {/* Scene Caption */}
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl px-4 space-y-1"
              >
                <p className="text-xs uppercase font-bold tracking-widest text-[#00E5FF]">
                  Chapter {currentScene + 1}
                </p>
                <h3 className="font-storm-flame text-xl sm:text-3xl text-white font-bold tracking-wide drop-shadow-md">
                  &ldquo;{STORM_AND_FLAME_SCENES[currentScene].caption}&rdquo;
                </h3>
              </motion.div>

              {/* Special Interactive Prompt for Scene 4 (Promise) */}
              {currentScene === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-1"
                >
                  <button
                    type="button"
                    onClick={() => setIsPromiseModalOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#00E5FF] via-[#38BDF8] to-[#FF9900] text-[#050B16] font-bold text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Scroll className="w-4 h-4 fill-current" />
                    <span>Unseal Our Sacred Promise ✨</span>
                  </button>
                </motion.div>
              )}

              {/* Special Personal Message reveal in Scene 5 or 6 */}
              {isFinalScene && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-[#0F1A2E]/90 border border-[#00E5FF]/50 max-w-lg shadow-xl backdrop-blur-md"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF9900] block mb-1">
                    Special Message from {senderName}
                  </span>
                  <p className="text-sm font-medium text-[#EFF7FF] italic">
                    &ldquo;{personalMessage}&rdquo;
                  </p>
                </motion.div>
              )}

              {/* 5-Second Scene Progress Bar */}
              <div className="w-full max-w-md h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00E5FF] to-[#FF9900] transition-all duration-75"
                  style={{ width: `${sceneProgress}%` }}
                />
              </div>

              {/* Playback Controls Filmstrip */}
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={prevScene}
                  disabled={currentScene === 0}
                  className="p-2 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="px-4 py-2 rounded-full bg-white text-[#050B16] font-bold hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-md"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="p-2 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/70 transition-all"
                  title="Replay from Scene 1"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={nextScene}
                  disabled={currentScene === STORM_AND_FLAME_SCENES.length - 1}
                  className="p-2 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSkipToEnd}
                  className="px-3 py-1.5 rounded-full bg-black/40 border border-white/20 text-white hover:bg-black/70 text-xs font-semibold transition-all ml-2"
                >
                  <span>Skip to End</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          SACRED PROMISE MODAL (Scene 4 Special Feature)
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isPromiseModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setIsPromiseModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#00E5FF]/60 bg-[#0F1A2E] p-6 sm:p-8 text-center space-y-4"
            >
              <button
                type="button"
                onClick={() => setIsPromiseModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 mx-auto rounded-full bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-[#00E5FF] shadow-inner">
                <Scroll className="w-6 h-6 text-[#00E5FF]" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9900]">
                  A Sacred Vow in the Storm
                </span>
                <h3 className="font-storm-flame text-2xl font-bold text-[#EFF7FF]">
                  Our Eternal Promise
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-[#070F1E] border border-[#273B5E] text-left space-y-3">
                <p className="text-sm font-medium text-[#EFF7FF] leading-relaxed italic">
                  &ldquo;{sacredPromiseText}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs text-[#738CA8] pt-2 border-t border-[#273B5E]">
                  <span>Sealed with love</span>
                  <span className="text-[#00E5FF] font-semibold">{senderName} &amp; {partnerName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPromiseModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Keep In My Heart ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────
          STANDALONE STORYBOOK PAGE VIEW
      ───────────────────────────────────────────── */}
      <div
        id="storm-flame-content"
        className="w-full max-w-5xl mx-auto flex flex-col items-center space-y-10 py-6"
      >
        {/* Cinematic Re-Open Banner */}
        <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#0F1A2E] border border-[#273B5E] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-[#00E5FF]">
              <Zap className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <div>
              <h2 className="font-storm-flame text-base sm:text-lg font-bold text-[#EFF7FF]">
                Storm &amp; Flame: {openingTaglineText}
              </h2>
              <p className="text-xs text-[#B9CBDF]">
                Original 6-scene battle-fantasy romance for {partnerName} from {senderName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCinematicMode(true);
              setIsIntroActive(false);
              setIsPlaying(true);
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Play Fullscreen</span>
          </button>
        </div>

        {/* 16:9 Central Interactive Showcase Frame */}
        <div className="w-full relative aspect-video rounded-3xl overflow-hidden border-2 border-[#273B5E] shadow-2xl bg-[#070F1E] group">
          <Image
            src={STORM_AND_FLAME_SCENES[currentScene].file}
            alt={STORM_AND_FLAME_SCENES[currentScene].title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover transition-transform duration-700 group-hover:scale-105 select-none"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs font-bold">
            <span className="px-3 py-1 rounded-full bg-[#070F1E]/90 border border-[#273B5E] text-[#00E5FF] backdrop-blur-md">
              Scene {currentScene + 1}: {STORM_AND_FLAME_SCENES[currentScene].title}
            </span>

            {template.music_track && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`px-3 py-1 rounded-full border backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  autoplayBlocked && !isAudioPlaying
                    ? "bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900] shadow-[0_0_15px_rgba(255,153,0,0.4)] animate-pulse"
                    : "bg-[#070F1E]/90 border-[#273B5E] text-[#EFF7FF] hover:bg-[#18253E]"
                }`}
              >
                {autoplayBlocked && !isAudioPlaying ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#FF9900]" />
                    <span className="text-[#FF9900]">Tap for Sound 🎵</span>
                  </>
                ) : isAudioPlaying ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>Sound On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#738CA8]" />
                    <span>Muted</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bottom Captions Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
            <div className="space-y-1 max-w-xl">
              <h3 className="font-storm-flame text-lg sm:text-2xl font-bold text-white drop-shadow-md">
                &ldquo;{STORM_AND_FLAME_SCENES[currentScene].caption}&rdquo;
              </h3>
              <p className="text-xs text-[#B9CBDF]">
                {STORM_AND_FLAME_SCENES[currentScene].storyBeat}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevScene}
                disabled={currentScene === 0}
                className="p-2 rounded-xl bg-black/60 border border-white/20 text-white hover:bg-black/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextScene}
                disabled={currentScene === STORM_AND_FLAME_SCENES.length - 1}
                className="p-2 rounded-xl bg-black/60 border border-white/20 text-white hover:bg-black/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 6-Scene Thumbnail Selector Bar */}
        <div className="w-full grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STORM_AND_FLAME_SCENES.map((scene, idx) => {
            const isSelected = idx === currentScene;
            return (
              <button
                key={scene.file}
                type="button"
                onClick={() => setCurrentScene(idx)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#00E5FF] shadow-lg scale-105 z-10"
                    : "border-[#273B5E] opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={scene.file}
                  alt={scene.title}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <span className="absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
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
            <div className="w-full mt-4">
              <FloatingQuoteGallery
                items={floatingGalleryConfig.items}
                title={floatingGalleryConfig.title}
                subtitle={floatingGalleryConfig.subtitle}
                accentColor={STORM_AND_FLAME_PALETTE.accent}
                theme="anime-storm-and-flame"
              />
            </div>
          )}

        {/* ─────────────────────────────────────────────
            FINAL INTERACTION CARD: "What will our next adventure be?"
        ───────────────────────────────────────────── */}
        <div className="w-full max-w-3xl p-6 sm:p-8 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-xl space-y-6 text-center">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9900] block">
              Final Question for {partnerName}
            </span>
            <h2 className="font-storm-flame text-2xl sm:text-3xl font-bold text-[#EFF7FF] tracking-wide">
              {STORM_AND_FLAME_CONFIG.finalQuestion}
            </h2>
            <p className="text-xs text-[#B9CBDF] font-medium max-w-md mx-auto">
              Choose an adventure or propose something special, and let&apos;s face the next chapter together.
            </p>
          </div>

          {!rsvpSubmitted ? (
            <div className="space-y-4">
              {/* Date choices pills / cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STORM_AND_FLAME_CONFIG.dateOptions.map((opt) => {
                  const isChosen =
                    selectedChoice === opt.label && !showCustomInput;
                  const OptionIcon = getStormAndFlameOptionIcon(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedChoice(opt.label);
                        setShowCustomInput(false);
                      }}
                      className={`p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                        isChosen
                          ? "bg-[#18253E] border-[#00E5FF] shadow-lg scale-[1.02]"
                          : "bg-[#070F1E] border-[#273B5E] hover:border-[#3B588C]"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                          isChosen
                            ? "bg-[#00E5FF] text-[#050B16] shadow-sm"
                            : "bg-[#18253E] text-[#00E5FF] group-hover:bg-[#273B5E]"
                        }`}
                      >
                        <OptionIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#EFF7FF]">
                          {opt.label}
                        </h4>
                        <p className="text-[11px] text-[#738CA8] mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Alternative choice options */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedChoice("Suggest something else");
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    showCustomInput
                      ? "bg-[#18253E] border-[#00E5FF] text-[#00E5FF]"
                      : "bg-[#070F1E] border-[#273B5E] text-[#B9CBDF] hover:bg-[#18253E]"
                  }`}
                >
                  Suggest something else
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setSelectedChoice("Maybe later");
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    selectedChoice === "Maybe later"
                      ? "bg-[#18253E] border-[#FF9900] text-[#FF9900]"
                      : "bg-[#070F1E] border-[#273B5E] text-[#B9CBDF] hover:bg-[#18253E]"
                  }`}
                >
                  Decide later
                </button>
              </div>

              {/* Custom idea input */}
              {showCustomInput && (
                <div className="max-w-md mx-auto pt-2">
                  <input
                    type="text"
                    value={customIdea}
                    onChange={(e) => setCustomIdea(e.target.value)}
                    placeholder="E.g., Starlight stroll, cook ramen together, road trip..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-semibold text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              )}

              {/* Optional Slot selection */}
              {invitationConfig?.proposedSlots &&
                invitationConfig.proposedSlots.length > 0 &&
                selectedChoice !== "Maybe later" && (
                  <div className="p-3.5 rounded-2xl bg-[#070F1E] border border-[#273B5E] max-w-md mx-auto text-left space-y-2">
                    <label className="text-[11px] font-bold text-[#00E5FF] block">
                      Choose preferred time slot:
                    </label>
                    <div className="space-y-1.5">
                      {invitationConfig.proposedSlots.map((slot) => (
                        <label
                          key={slot.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[#0F1A2E] border border-[#273B5E] hover:border-[#3B588C] text-xs font-semibold text-[#EFF7FF] cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="storm_invitation_slot"
                            checked={selectedSlotId === slot.id}
                            onChange={() => setSelectedSlotId(slot.id)}
                            className="text-[#00E5FF] focus:ring-[#00E5FF]"
                          />
                          <span>{slot.label || slot.start_time}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {/* Optional partner note */}
              <div className="max-w-md mx-auto pt-1">
                <input
                  type="text"
                  value={partnerNote}
                  onChange={(e) => setPartnerNote(e.target.value)}
                  placeholder="Add a personal reply or excitement note (optional)..."
                  className="w-full px-4 py-2 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              {/* Confirm Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRsvpSubmit}
                  disabled={!selectedChoice || isSubmittingRsvp}
                  className="px-8 py-3 rounded-full text-[#050B16] font-bold text-sm shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto bg-gradient-to-r from-[#00E5FF] to-[#38BDF8]"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmittingRsvp
                      ? "Sending response..."
                      : `Send Response to ${senderName}`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl bg-[#070F1E] border border-[#00E5FF]/40 space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-storm-flame text-lg font-bold text-[#EFF7FF]">
                Response Sent to {senderName}!
              </h3>
              <p className="text-xs text-[#B9CBDF] font-medium max-w-md mx-auto leading-relaxed">
                {rsvpStatusText}
              </p>
            </motion.div>
          )}
        </div>

        {/* ─────────────────────────────────────────────
            EMBEDDED QUBITSELLS TOOLS SECTION
        ───────────────────────────────────────────── */}
        <div className="w-full space-y-6">
          {/* T01: Reply Tool (Voice memos, selfies, text love notes) */}
          {replyConfig && replyConfig.enabled && (
            <div className="w-full">
              <ReplyTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={replyConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T04: Romantic Decision Polls */}
          {pollConfig && pollConfig.enabled && (
            <div className="w-full">
              <PollTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={pollConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T05: Heart-to-Heart Questions */}
          {questionConfig && questionConfig.enabled && (
            <div className="w-full">
              <QuestionTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T06: Synchronized Secret Reveal */}
          {revealConfig && revealConfig.enabled && (
            <div className="w-full">
              <PrivateRevealTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={revealConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T07: Scratch Card Surprise */}
          {scratchConfig && scratchConfig.enabled && (
            <div className="w-full">
              <ScratchRevealTool
                templateCode={code}
                config={scratchConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T08: Redeemable Love Coupons */}
          {couponConfig && couponConfig.enabled && (
            <div className="w-full">
              <LoveCouponTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={couponConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T09: Open When Sealed Letters */}
          {openWhenConfig && openWhenConfig.enabled && (
            <div className="w-full">
              <OpenWhenLettersTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={openWhenConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T10: Our Story Milestone Timeline */}
          {ourStoryConfig && ourStoryConfig.enabled && (
            <div className="w-full">
              <OurStoryTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={ourStoryConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}

          {/* T11: Couple Bucket List */}
          {bucketListConfig && bucketListConfig.enabled && (
            <div className="w-full">
              <BucketListTool
                templateCode={code}
                partnerName={partnerName}
                senderName={senderName}
                config={bucketListConfig}
                palette={stormFlamePalette}
              />
            </div>
          )}
        </div>

        {/* Footer & Share Bar */}
        <div className="w-full pt-8 pb-12 text-center space-y-4 border-t border-[#273B5E]">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopiedShare(true);
                setTimeout(() => setCopiedShare(false), 2000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#EFF7FF] hover:bg-[#18253E] transition-all cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>{copiedShare ? "Link Copied!" : "Share Link"}</span>
            </button>

            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#B9CBDF] hover:text-[#EFF7FF] transition-all shadow-sm"
            >
              <span>Explore All Templates</span>
            </Link>
          </div>

          <p className="text-[11px] text-[#738CA8]">
            QubitSells • &quot;Two powers. One promise.&quot; • Storm &amp; Flame Japanese Anime
          </p>
        </div>
      </div>
    </div>
  );
}
