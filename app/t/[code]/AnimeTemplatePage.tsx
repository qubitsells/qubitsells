"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Sparkles, RotateCcw, Share2, Maximize2, Music } from "lucide-react";
import type { AnimeTemplate, MediaItem, MusicTrack, ReplyToolConfig, InvitationToolConfig, PollToolConfig, QuestionToolConfig, RevealToolConfig, ScratchRevealToolConfig, CouponToolConfig, OpenWhenToolConfig, OurStoryToolConfig, BucketListToolConfig } from "@/lib/supabase/coupleTemplates";
import { ReplyTool } from "@/components/tools/ReplyTool";
import { InvitationTool } from "@/components/tools/InvitationTool";
import { PollTool } from "@/components/tools/PollTool";
import { QuestionTool } from "@/components/tools/QuestionTool";
import { PrivateRevealTool } from "@/components/tools/PrivateRevealTool";
import { ScratchRevealTool } from "@/components/tools/ScratchRevealTool";
import { LoveCouponTool } from "@/components/tools/LoveCouponTool";
import { OpenWhenLettersTool } from "@/components/tools/OpenWhenLettersTool";
import { OurStoryTool } from "@/components/tools/OurStoryTool";
import { BucketListTool } from "@/components/tools/BucketListTool";
import { CreatorRepliesDrawer } from "@/components/tools/CreatorRepliesDrawer";
import OurLittlePinkDayViewer from "@/components/templates/OurLittlePinkDayViewer";
import HalloweenMidnightKeyViewer from "@/components/templates/HalloweenMidnightKeyViewer";
import PumpkinMoonDateViewer from "@/components/templates/PumpkinMoonDateViewer";
import HauntedWaltzViewer from "@/components/templates/HauntedWaltzViewer";
import StarlitStoryViewer from "@/components/templates/StarlitStoryViewer";
import AnimeStormAndFlameViewer from "@/components/templates/AnimeStormAndFlameViewer";

/* ─────────────────────────────────────────────
   ROMANTIC QUOTATIONS — cycle per memory
───────────────────────────────────────────── */
const QUOTES = [
  "Every love story is beautiful, but ours is my favourite.",
  "In you, I found the home I never knew I was looking for.",
  "You are my today and all of my tomorrows.",
  "I look at you and see the rest of my life in your eyes.",
  "You are the poem I never knew how to write.",
  "With you, every moment feels like magic.",
  "I choose you. And I'll choose you, over and over.",
  "You make ordinary moments feel extraordinary.",
  "My heart found its home the moment I found you.",
  "To love you is the adventure I never want to end.",
  "In all the world, there is no heart for me like yours.",
  "You are my sunshine on the darkest days.",
];

const SENDER_VIDEOS = {
  male: "/anime theme/videos/gemini_generated_video_ad7d7bb1.mp4",
  female: "/anime theme/videos/gemini_generated_video_bd3d5353.mp4",
};

/* ─────────────────────────────────────────────
   SCENE CONFIG — matches the 4 actual assets
───────────────────────────────────────────── */
const SCENES = [
  {
    bg: "/anime theme/images/romantic-love-3840x2160-24698.jpg",
    label: "Starry Night",
    palette: { accent: "#a78bfa", glow: "#7c3aed", text: "#f3e8ff", dark: "#0f0c29" },
  },
  {
    bg: "/anime theme/images/cozy-happiness-bx-1920x1080.jpg",
    label: "Sunset Balcony",
    palette: { accent: "#fbbf24", glow: "#d97706", text: "#fff7ed", dark: "#1c0a00" },
  },
  {
    bg: "/anime theme/images/together-beneath-the-clouds-ry-1920x1080.jpg",
    label: "Beneath the Clouds",
    palette: { accent: "#38bdf8", glow: "#0284c7", text: "#e0f2fe", dark: "#082f49" },
  },
  {
    bg: "/anime theme/images/the-beauty-of-sunset-and-you-iy-1920x1080.jpg",
    label: "Golden Sunset",
    palette: { accent: "#fb923c", glow: "#ea580c", text: "#fff7ed", dark: "#1c0a00" },
  },
];

/* ─────────────────────────────────────────────
   SAKURA PETAL
───────────────────────────────────────────── */
function SakuraPetal({ index }: { index: number }) {
  const left = ((index * 7.3 + 11) % 100).toFixed(1);
  const delay = ((index * 0.37) % 5).toFixed(2);
  const duration = (5 + ((index * 1.3) % 5)).toFixed(1);
  const size = 8 + (index % 10);
  const rotate = index % 2 === 0 ? 360 : -360;

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${left}%`,
        top: "-40px",
        width: size,
        height: size,
        fontSize: size,
      }}
      animate={{
        y: ["0vh", "110vh"],
        x: [0, Math.sin(index) * 120],
        rotate: [0, rotate],
        opacity: [0, 0.85, 0.85, 0],
      }}
      transition={{
        duration: Number(duration),
        delay: Number(delay),
        repeat: Infinity,
        ease: "linear",
      }}
    >
      🌸
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   SHOOTING STAR
───────────────────────────────────────────── */
function ShootingStar({ index }: { index: number }) {
  const top = ((index * 13) % 60).toFixed(1);
  const delay = index * 2.3;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ top: `${top}%`, left: "-10%", width: 80, height: 2 }}
      animate={{ x: ["0vw", "130vw"], opacity: [0, 1, 0] }}
      transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 8 + index * 3 }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
        }}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   TYPEWRITER
───────────────────────────────────────────── */
function Typewriter(props: { text: string; delay?: number; className?: string }) {
  return <TypewriterText key={props.text + ":" + props.delay} {...props} />;
}
function TypewriterText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        index++; setDisplayed(text.slice(0, index));
        if (index >= text.length) { clearInterval(interval); setDone(true); }
      }, 36);
    }, delay * 1000);
    return () => { clearTimeout(timeout); if (interval) clearInterval(interval); };
  }, [text, delay]);
  return <span className={className}>{displayed}{!done && <span className="animate-pulse opacity-70">|</span>}</span>;
}

/* ─────────────────────────────────────────────
   FLOATING SVG LAYER
   Renders SVG assets as ambient overlays per phase
───────────────────────────────────────────── */
function FloatingSvgLayer({ phase, palette }: { phase: string; palette: (typeof SCENES)[0]["palette"] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Love (1).svg — glows in background of message phase */}
      <AnimatePresence>
        {phase === "message" && (
          <motion.div
            key="love-bg"
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 0.12, scale: [1.1, 1.15, 1.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, scale: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/anime theme/svg/love (1).svg" alt="" className="w-64 sm:w-96 h-auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Valentine Parachute — floats down during final phase */}
      <AnimatePresence>
        {phase === "final" && (
          <motion.div
            key="parachute"
            initial={{ y: "-15%", opacity: 0, rotate: -8 }}
            animate={{ opacity: [0, 1, 0.9], rotate: [-8, 4, -4, 4] }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 3.5 },
              rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute right-6 sm:right-12 top-4 w-20 sm:w-32"
            style={{ filter: `drop-shadow(0 8px 24px ${palette.accent}60)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/anime theme/svg/Valentine parachute.svg" alt="" className="w-full h-auto" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FULL SCREEN VIDEO PHASE
   Plays boy/girl romantic anime video in full-screen till end
───────────────────────────────────────────── */
function FullScreenVideoPhase({
  palette,
  videoSrc,
  onComplete,
  onSkip,
}: {
  palette: (typeof SCENES)[0]["palette"];
  videoSrc: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  const safeComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc]);

  // Safety fallback: if video stalls or network hangs, safely advance after 25s
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      safeComplete();
    }, 25000);
    return () => clearTimeout(safetyTimer);
  }, [safeComplete]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (v.duration > 0) {
      setProgress((v.currentTime / v.duration) * 100);
      // Complete smoothly if at the very end
      if (v.currentTime >= v.duration - 0.12) {
        safeComplete();
      }
    }
  };

  return (
    <motion.div
      key="fullscreen-video"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden select-none"
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted={muted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={safeComplete}
        onError={safeComplete}
        className="w-full h-full object-cover"
      />

      {/* Cinematic anamorphic gradients & vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
        }}
      />

      {/* Floating romantic subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute bottom-10 inset-x-0 text-center px-6 pointer-events-none z-10 space-y-1.5"
      >
        <p
          className="text-base sm:text-xl font-light tracking-wider text-white/95 drop-shadow-lg"
          style={{ fontFamily: "Georgia, serif" }}
        >
          &ldquo;A message sent across time and distance, just for you…&rdquo;
        </p>
        <p
          className="text-xs uppercase tracking-[0.3em] font-semibold opacity-75"
          style={{ color: palette.accent }}
        >
          💌 Sealed with affection
        </p>
      </motion.div>

      {/* Slim playback progress bar at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-50 pointer-events-none">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${palette.accent}, ${palette.glow})`,
            boxShadow: `0 0 10px ${palette.accent}`,
          }}
        />
      </div>

      {/* Controls at top right */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setMuted((m) => !m)}
          className="p-2.5 rounded-full text-white/80 hover:text-white transition-all bg-black/40 backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          title={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white transition-all bg-black/40 backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          Skip <span>→</span>
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   FULL SCREEN ENVELOPE SVG PHASE
   Displays love mail valentines animation.svg in full-screen
───────────────────────────────────────────── */
function FullScreenEnvelopeSvgPhase({
  palette,
  partnerName,
  onOpen,
  onSkip,
}: {
  palette: (typeof SCENES)[0]["palette"];
  partnerName: string;
  onOpen: () => void;
  onSkip: () => void;
}) {
  const [opening, setOpening] = useState(false);

  const handleOpen = useCallback(() => {
    if (opening) return;
    setOpening(true);
    setTimeout(() => {
      onOpen();
    }, 800);
  }, [opening, onOpen]);

  // Auto-open after 4.5s
  useEffect(() => {
    const t = setTimeout(() => {
      handleOpen();
    }, 4500);
    return () => clearTimeout(t);
  }, [handleOpen]);

  return (
    <motion.div
      key="fs-envelope-svg"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.15, filter: "blur(12px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-4 overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at center, ${palette.glow}35 0%, ${palette.dark}F2 65%, ${palette.dark} 100%)`,
      }}
    >
      {/* Radiant pulsating aura behind envelope */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.5, 0.85, 0.5],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-72 sm:w-96 md:w-[480px] h-72 sm:h-96 md:h-[480px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${palette.accent}70 0%, ${palette.glow}30 55%, transparent 70%)`,
          filter: "blur(55px)",
        }}
      />

      {/* Top right Skip */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white transition-all bg-black/40 backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          Skip <span>→</span>
        </button>
      </div>

      {/* Header prompt */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center space-y-2 mb-4 z-10"
      >
        <span
          className="text-xs font-bold tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md inline-block shadow-md"
          style={{
            backgroundColor: `${palette.glow}50`,
            color: palette.text,
          }}
        >
          💌 Special Delivery
        </span>
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-wide"
          style={{ fontFamily: "Georgia, serif" }}
        >
          For You, {partnerName}
        </h2>
      </motion.div>

      {/* Centerpiece Envelope SVG */}
      <motion.div
        animate={
          opening
            ? { scale: [1, 1.2, 1.45], opacity: [1, 0.9, 0], y: -20 }
            : { y: [0, -8, 0], scale: [1, 1.02, 1] }
        }
        transition={
          opening
            ? { duration: 0.8, ease: "easeInOut" }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative cursor-pointer z-10 my-1"
        onClick={handleOpen}
        style={{
          filter: `drop-shadow(0 12px 35px ${palette.glow}90) drop-shadow(0 0 45px ${palette.accent}50)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/anime theme/svg/love mail valentines animation.svg"
          alt="Love Mail"
          className="w-52 sm:w-64 md:w-72 h-auto object-contain transition-transform duration-300 hover:scale-105 active:scale-95"
        />
      </motion.div>

      {/* Tap prompt button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="z-10 mt-3 text-center space-y-2"
      >
        <button
          onClick={handleOpen}
          className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
            boxShadow: `0 0 30px ${palette.glow}80`,
          }}
        >
          <Sparkles className="w-4 h-4" />
          <span>Tap to Unseal Letter</span>
          <Heart className="w-4 h-4 fill-current" />
        </button>
        <p className="text-[10px] sm:text-[11px] opacity-60 tracking-wider uppercase text-white">
          Opening automatically in a moment…
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   HYPERBOLIC CURVED GALLERY
   3D cylindrical/fanned arc memory gallery
───────────────────────────────────────────── */
function HyperbolicCurvedGallery({
  items,
  palette,
  fromName,
  toName,
  onOpenLightbox,
  onFinishMemories,
}: {
  items: MediaItem[];
  palette: (typeof SCENES)[0]["palette"];
  fromName: string;
  toName: string;
  onOpenLightbox: (idx: number) => void;
  onFinishMemories: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const count = items.length;

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Auto-advance every 4.8s unless paused
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(next, 4800);
    return () => clearInterval(interval);
  }, [next, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  return (
    <motion.div
      key="memories-hyperbola"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center py-4 select-none z-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1 mb-2"
      >
        <p
          className="text-xs font-bold tracking-[0.3em] uppercase"
          style={{ color: palette.accent }}
        >
          Our Memories ✨
        </p>
        <h2
          className="text-xl sm:text-2xl md:text-3xl font-bold"
          style={{ color: palette.text, fontFamily: "Georgia, serif" }}
        >
          {fromName} &amp; {toName}
        </h2>
      </motion.div>

      {/* 3D Hyperbolic Curved Arc Stage */}
      <div
        className="relative w-full h-[270px] sm:h-[320px] md:h-[350px] flex items-center justify-center overflow-visible"
        style={{ perspective: "1100px", perspectiveOrigin: "50% 50%" }}
      >
        {items.map((item, i) => {
          let diff = i - activeIndex;
          if (count > 2) {
            if (diff > count / 2) diff -= count;
            if (diff < -count / 2) diff += count;
          }

          const isCenter = diff === 0;
          const absDiff = Math.abs(diff);
          const visible = count <= 2 || absDiff <= 2;

          // 3D hyperbolic transform parameters
          const xOffset = diff * 185;
          const zOffset = -Math.pow(absDiff, 1.25) * 115;
          const rotateY = -diff * 22;
          const rotateZ = diff * 3.5;
          const scale = Math.max(0.72, 1 - absDiff * 0.12);
          const opacity = absDiff > 2 ? 0 : Math.max(0.4, 1 - absDiff * 0.28);
          const blur = Math.min(5, absDiff * 2.5);
          const zIndex = 50 - absDiff;

          return (
            <motion.div
              key={i}
              animate={{
                x: xOffset,
                z: zOffset,
                rotateY,
                rotateZ,
                scale,
                opacity: visible ? opacity : 0,
                filter: `blur(${blur}px)`,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 26,
              }}
              style={{
                position: "absolute",
                zIndex,
                transformStyle: "preserve-3d",
                cursor: isCenter ? "default" : "pointer",
              }}
              onClick={() => {
                if (!isCenter) setActiveIndex(i);
                else onOpenLightbox(i);
              }}
              className="w-[190px] sm:w-[230px] md:w-[260px] h-[255px] sm:h-[305px] md:h-[340px] rounded-3xl overflow-hidden shadow-2xl transition-shadow duration-300 group"
            >
              {/* Card framing & glow */}
              <div
                className="w-full h-full relative rounded-3xl overflow-hidden"
                style={{
                  border: `1.5px solid ${isCenter ? palette.accent : "rgba(255,255,255,0.22)"}`,
                  boxShadow: isCenter
                    ? `0 0 45px ${palette.glow}70, 0 20px 50px rgba(0,0,0,0.7)`
                    : "0 12px 35px rgba(0,0,0,0.5)",
                }}
              >
                {/* Media element */}
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={`Memory ${i + 1}`}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                )}

                {/* Soft gradient bottom overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${palette.dark}90 0%, transparent 45%)`,
                  }}
                />

                {/* Subtle glass gloss highlight */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.25) 0%, transparent 60%)",
                  }}
                />

                {/* Video tag badge */}
                {item.type === "video" && (
                  <div
                    className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md"
                    style={{ backgroundColor: `${palette.glow}E6`, color: "#fff" }}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" /> Video
                  </div>
                )}

                {/* Center Card Full View button */}
                {isCenter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(i);
                    }}
                    className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white bg-black/50 backdrop-blur-md hover:bg-black/75 border border-white/20 transition-all hover:scale-105 flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>View Full</span>
                  </button>
                )}

                {/* Center card active rim light */}
                {isCenter && (
                  <div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 25px ${palette.accent}50`,
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Romantic Quotation Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="mt-2.5 max-w-lg text-center px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/15 shadow-xl"
          style={{
            background: "rgba(255,255,255,0.08)",
            boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 20px ${palette.glow}20`,
          }}
        >
          <p
            className="text-xs sm:text-sm md:text-base italic font-light leading-snug drop-shadow-sm"
            style={{ color: palette.text, fontFamily: "Georgia, serif" }}
          >
            &ldquo;{QUOTES[activeIndex % QUOTES.length]}&rdquo;
          </p>
          <p
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-semibold mt-1"
            style={{ color: palette.accent }}
          >
            Memory {activeIndex + 1} of {count} ✨
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="flex items-center gap-3 mt-2">
        {count > 1 && (
          <button
            onClick={prev}
            className="p-2 rounded-full text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
            title="Previous Memory"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Pagination Dots */}
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                backgroundColor: i === activeIndex ? palette.accent : `${palette.accent}40`,
                boxShadow: i === activeIndex ? `0 0 8px ${palette.accent}` : "none",
              }}
            />
          ))}
        </div>

        {count > 1 && (
          <button
            onClick={next}
            className="p-2 rounded-full text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
            title="Next Memory"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action to proceed to final climax */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onFinishMemories}
        className="mt-3 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
          boxShadow: `0 0 20px ${palette.glow}60`,
        }}
      >
        <span>Forever &amp; Always</span>
        <span>→</span>
      </motion.button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MEDIA LIGHTBOX
───────────────────────────────────────────── */
function MediaLightbox({
  items,
  initialIndex = 0,
  onClose,
  palette,
}: {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
  palette: (typeof SCENES)[0]["palette"];
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = items[idx];
  const isVideo = current?.type === "video";

  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  const next = () => setIdx((i) => (i + 1) % items.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="relative max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full text-white/70 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Romantic Quotation */}
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center text-sm italic mb-3 px-4"
          style={{ color: `${palette.accent}cc`, fontFamily: "Georgia, serif" }}
        >
          &ldquo;{QUOTES[idx % QUOTES.length]}&rdquo;
        </motion.p>

        {/* Media */}

        {isVideo ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "#000" }}>
            <video
              ref={videoRef}
              src={current.url}
              autoPlay
              loop
              muted={muted}
              className="w-full max-h-[70vh] object-contain"
            />
            {/* Video controls */}
            <div className="absolute bottom-4 left-4 flex gap-3">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (playing) videoRef.current.pause();
                    else videoRef.current.play();
                    setPlaying(!playing);
                  }
                }}
                className="p-2 rounded-full text-white"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMuted(!muted)}
                className="p-2 rounded-full text-white"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current?.url}
            alt={`Memory ${idx + 1}`}
            className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
          />
        )}

        {/* Navigation */}
        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white transition-all hover:scale-110"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white transition-all hover:scale-110"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: i === idx ? palette.accent : "rgba(255,255,255,0.3)",
                  transform: i === idx ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        <p className="text-center text-white/50 text-xs mt-2">
          {idx + 1} / {items.length}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   FLOATING MUSIC PLAYER
───────────────────────────────────────────── */
function FloatingMusicPlayer({
  track,
  palette,
  autoStart,
}: {
  track: MusicTrack;
  palette: (typeof SCENES)[0]["palette"];
  autoStart: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isYouTube = track.type === "youtube" || Boolean(track.youtubeId);
  const [isPlaying, setIsPlaying] = useState(isYouTube && autoStart);
  const [hasStarted, setHasStarted] = useState(isYouTube && autoStart);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(track.startAt || 0);
  const [expanded, setExpanded] = useState(false);
  const hasSoughtRef = useRef(false);



  // Send control command to embedded YouTube iframe via postMessage
  const postYtMessage = (func: string, args: unknown[] = []) => {
    try {
      ytIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    } catch {}
  };

  /* ── YouTube playback ticker ── */
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1;
        if (track.duration > 0 && next >= track.duration) {
          return track.startAt || 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, track.duration, track.startAt]);

  /* ── YouTube autoStart & user gesture unlock ── */
  useEffect(() => {
    if (!isYouTube) return;

    const unlockYt = () => {
      if (autoStart) {
        setHasStarted(true);
        setIsPlaying(true);
        setAutoplayBlocked(false);
        postYtMessage("playVideo");
      }
    };
    window.addEventListener("click", unlockYt, { passive: true });
    window.addEventListener("touchstart", unlockYt, { passive: true });
    window.addEventListener("pointerdown", unlockYt, { passive: true });
    return () => {
      window.removeEventListener("click", unlockYt);
      window.removeEventListener("touchstart", unlockYt);
      window.removeEventListener("pointerdown", unlockYt);
    };
  }, [isYouTube, autoStart]);

  /* Mount audio + seek to startAt (FreeToUse tracks only) */
  useEffect(() => {
    if (isYouTube) return;
    const audio = new Audio(track.mp3Url);
    audio.preload = "auto";
    audio.loop = true;
    audioRef.current = audio;
    hasSoughtRef.current = false;

    const trySeekAndPlay = () => {
      if (!hasSoughtRef.current && track.startAt > 0) {
        try {
          audio.currentTime = track.startAt;
          hasSoughtRef.current = true;
        } catch {
          // not ready to seek yet
        }
      }
      if (autoStart) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(() => {
            setAutoplayBlocked(true);
          });
      }
    };

    const onCanPlay = () => trySeekAndPlay();
    const onLoadedMetadata = () => trySeekAndPlay();
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    const onPlay = () => {
      setIsPlaying(true);
      setAutoplayBlocked(false);
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.load();

    if (audio.readyState >= 2) {
      trySeekAndPlay();
    }

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.mp3Url, isYouTube]);

  /* Auto-play on first user gesture if browser blocked immediate autoplay (FreeToUse) */
  useEffect(() => {
    if (isYouTube) return;
    const unlock = () => {
      const audio = audioRef.current;
      if (audio && audio.paused) {
        if (!hasSoughtRef.current && track.startAt > 0) {
          try {
            audio.currentTime = track.startAt;
            hasSoughtRef.current = true;
          } catch {}
        }
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(() => {});
      }
    };

    window.addEventListener("click", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [track.startAt, isYouTube]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isYouTube) {
      if (isPlaying) {
        setIsPlaying(false);
        postYtMessage("pauseVideo");
      } else {
        setHasStarted(true);
        setIsPlaying(true);
        setAutoplayBlocked(false);
        postYtMessage("playVideo");
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (!hasSoughtRef.current && track.startAt > 0) {
        audio.currentTime = track.startAt;
        hasSoughtRef.current = true;
      }
      audio.play().then(() => {
        setIsPlaying(true);
        setAutoplayBlocked(false);
      }).catch(() => {});
    }
  };

  const handleSeek = (newSecs: number) => {
    const clamped = Math.max(0, Math.min(newSecs, track.duration || 300));
    setCurrentTime(clamped);
    if (isYouTube) {
      postYtMessage("seekTo", [clamped, true]);
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = clamped;
      } catch {}
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const progress = track.duration > 0 ? (currentTime - track.startAt) / (track.duration - track.startAt) : 0;

  /* Waveform subset for the mini player (sample 40 bars) */
  const miniWave = track.waveform.length > 0
    ? Array.from({ length: 40 }, (_, i) => track.waveform[Math.floor(i * track.waveform.length / 40)])
    : [];

  return (
    <>
      {/* Hidden YouTube background audio iframe */}
      {isYouTube && track.youtubeId && (hasStarted || isPlaying) && (
        <div
          className="fixed -bottom-96 -right-96 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <iframe
            ref={ytIframeRef}
            src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?autoplay=1&start=${track.startAt || 0}&enablejsapi=1&loop=1&playlist=${track.youtubeId}`}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-1 h-1 border-0"
            title="Background Soundtrack"
          />
        </div>
      )}

      <motion.div
        className="fixed top-4 left-4 z-50 select-none"
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
      >
      {!expanded ? (
        /* ── Compact pill ── */
        <motion.div
          className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full backdrop-blur-xl border shadow-2xl cursor-pointer hover:scale-105 transition-transform"
          style={{
            background: "rgba(10,8,28,0.88)",
            borderColor: isPlaying ? `${palette.accent}90` : `${palette.accent}40`,
            boxShadow: isPlaying ? `0 6px 30px rgba(0,0,0,0.6), 0 0 18px ${palette.glow}50` : "0 6px 20px rgba(0,0,0,0.5)",
          }}
          onClick={() => setExpanded(true)}
        >
          {/* Album art / play button */}
          <button
            onClick={togglePlay}
            className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border flex items-center justify-center cursor-pointer group"
            style={{ borderColor: `${palette.accent}60`, background: `${palette.glow}30` }}
          >
            {track.thumbnailUrl ? (
              <motion.img
                src={track.thumbnailUrl}
                alt={track.title}
                className="w-full h-full object-cover"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <Music className="w-4 h-4" style={{ color: palette.accent }} />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isPlaying ? <Pause className="w-3 h-3 fill-current text-white" /> : <Play className="w-3 h-3 fill-current text-white ml-0.5" />}
            </div>
          </button>

          {/* Track info */}
          <div className="min-w-0 max-w-[130px]">
            <p className="text-xs font-bold truncate text-white leading-tight">{track.title}</p>
            <p className="text-[10px] truncate leading-tight" style={{ color: isPlaying ? "rgba(255,255,255,0.6)" : palette.accent }}>
              {isPlaying ? track.artist : "Tap to play 🎵"}
            </p>
          </div>

          {/* Animated equalizer or play nudge */}
          {isPlaying ? (
            <div className="flex items-end gap-px h-4 ml-1">
              {[1.2, 0.8, 1.1, 0.9, 1.0].map((d, i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{ background: palette.accent }}
                  animate={{ height: ["3px", `${8 + i * 2}px`, "4px", `${10 - i}px`, "3px"] }}
                  transition={{ duration: d, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
          ) : (
            <button
              onClick={togglePlay}
              className="ml-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform"
              style={{ background: palette.accent }}
              title="Play music"
            >
              <Play className="w-3 h-3 fill-current text-white ml-0.5" />
            </button>
          )}
        </motion.div>
      ) : (
        /* ── Expanded card ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-72 rounded-2xl p-4 backdrop-blur-2xl border shadow-2xl space-y-3"
          style={{
            background: "rgba(10,8,28,0.95)",
            borderColor: `${palette.accent}50`,
            boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 28px ${palette.glow}30`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isPlaying ? palette.accent : "rgba(255,255,255,0.3)" }} />
              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: palette.accent }}>Now Playing</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Album + info */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: `${palette.glow}20` }}>
              {track.thumbnailUrl ? (
                <motion.img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6" style={{ color: palette.accent }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{track.title}</p>
              <p className="text-xs text-white/50 truncate">{track.artist}</p>
            </div>
          </div>

          {/* Mini waveform progress (Click to Seek) */}
          {miniWave.length > 0 && (
            <div
              className="flex items-end gap-px h-7 w-full cursor-pointer py-1 group/wave"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const totalDur = track.duration || 300;
                const targetSec = Math.floor(ratio * totalDur);
                handleSeek(targetSec);
              }}
              title="Click to seek"
            >
              {miniWave.map((v, i) => {
                const barProgress = i / miniWave.length;
                const isFilled = barProgress < Math.max(0, progress);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all group-hover/wave:opacity-90"
                    style={{
                      height: `${Math.max(15, v)}%`,
                      background: isFilled ? palette.accent : `${palette.accent}25`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(track.duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})` }}
            >
              {isPlaying
                ? <Pause className="w-5 h-5 fill-current text-white" />
                : <Play className="w-5 h-5 fill-current text-white ml-0.5" />}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  </>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
type Phase = "loading" | "intro" | "video" | "envelope" | "message" | "memories" | "final" | "expired" | "notfound";

export default function AnimeTemplatePage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const code = pathname?.split("/t/")[1]?.split("?")[0] || "";
  const manageToken = searchParams?.get("manage") || null;

  const [template, setTemplate] = useState<AnimeTemplate | null>(null);
  const [storedPhase, setPhase] = useState<Phase>("loading");
  const phase: Phase = code ? storedPhase : "notfound";
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const replyToolConfig = template?.tools?.find((t): t is ReplyToolConfig => t.type === "reply");
  const invitationToolConfig = template?.tools?.find((t): t is InvitationToolConfig => t.type === "invitation");
  const pollToolConfig = template?.tools?.find((t): t is PollToolConfig => t.type === "poll");
  const questionToolConfig = template?.tools?.find((t): t is QuestionToolConfig => t.type === "question");
  const revealToolConfig = template?.tools?.find((t): t is RevealToolConfig => t.type === "private_reveal");
  const scratchToolConfig = template?.tools?.find((t): t is ScratchRevealToolConfig => t.type === "scratch_reveal");
  const couponToolConfig = template?.tools?.find((t): t is CouponToolConfig => t.type === "coupon");
  const openWhenToolConfig = template?.tools?.find((t): t is OpenWhenToolConfig => t.type === "open_when");
  const ourStoryToolConfig = template?.tools?.find((t): t is OurStoryToolConfig => t.type === "our_story");
  const bucketListToolConfig = template?.tools?.find((t): t is BucketListToolConfig => t.type === "bucket_list");

  const scene = SCENES[template?.scene_index ?? 0] ?? SCENES[0];
  const palette = scene.palette;
  const musicTrack = (template?.music_track ||
    (Array.isArray(template?.media_items)
      ? (template.media_items as unknown as Array<Record<string, unknown>>).find((m) => m?.type === "music_track")?.track
      : null) ||
    null) as MusicTrack | null;

  // ── Fetch template ──────────────────────────────────────
  useEffect(() => {
    if (!code) return;

    fetch(`/api/templates/${encodeURIComponent(code)}`)
      .then((r) => {
        if (r.status === 410) { setPhase("expired"); return null; }
        if (!r.ok) { setPhase("notfound"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setTemplate(data.template);
        setPhase("intro");
      })
      .catch(() => setPhase("notfound"));
  }, [code]);

  // ── Phase auto-progression ──────────────────────────────
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("video"), 3500);
      return () => clearTimeout(t);
    }
    // Phase "video" is driven by video playback (onEnded / safeComplete) or onSkip!
    // Removed the premature 6000ms timeout so the full 10.01s video plays till end.
    if (phase === "envelope") {
      // 5s for envelope presentation before auto-opening
      const t = setTimeout(() => setPhase("message"), 5000);
      return () => clearTimeout(t);
    }
    if (phase === "message") {
      const hasMedia = template?.has_media && (template?.media_items?.length ?? 0) > 0;
      const t = setTimeout(() => setPhase(hasMedia ? "memories" : "final"), 7500);
      return () => clearTimeout(t);
    }
    if (phase === "memories") {
      const count = template?.media_items?.length ?? 1;
      // Allow user to explore 3D gallery; auto-advances to final after count * 5s + 3s (max 35s)
      const t = setTimeout(() => setPhase("final"), Math.min(Math.max(count * 5000 + 3000, 15000), 35000));
      return () => clearTimeout(t);
    }
  }, [phase, template]);

  const skipToFinal = useCallback(() => setPhase("final"), []);
  const replayStory = useCallback(() => {
    setPhase("intro");
  }, []);

  /* Proceed to video phase */
  const handleBeginJourney = useCallback(() => {
    setPhase("video");
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const openLightbox = useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  // ── Loading ─────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)` }}
      >
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 mx-auto rounded-full border-4 border-t-transparent border-pink-400"
          />
          <p className="text-pink-200 text-sm tracking-widest">Opening your message 🌸</p>
        </div>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────
  if (phase === "expired") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="text-6xl">🌙</div>
          <h1 className="text-2xl font-bold text-white">This memory has faded...</h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            Like cherry blossoms in the wind, this link has expired. But the love behind it never does.
          </p>
          <a
            href="/anime-template"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Heart className="w-4 h-4 fill-current" />
            Create a New Message
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Not Found ───────────────────────────────────────────
  if (phase === "notfound") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="text-6xl">💔</div>
          <h1 className="text-2xl font-bold text-white">Message not found</h1>
          <p className="text-blue-200 text-sm">
            This link doesn&apos;t exist or may have been removed.
          </p>
          <a
            href="/anime-template"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)" }}
          >
            Create Your Own →
          </a>
        </motion.div>
      </div>
    );
  }

  if (!template) return null;

  if (template.theme === "our-little-pink-day") {
    return <OurLittlePinkDayViewer template={template} code={code} />;
  }

  if (template.theme === "halloween-midnight-key") {
    return <HalloweenMidnightKeyViewer template={template} code={code} />;
  }

  if (template.theme === "halloween-pumpkin-moon") {
    return <PumpkinMoonDateViewer template={template} code={code} />;
  }

  if (template.theme === "spooky-the-haunted-waltz") {
    return <HauntedWaltzViewer template={template} code={code} />;
  }

  if (template.theme === "starlit-story" || template.theme === "starlit") {
    return <StarlitStoryViewer template={template} code={code} />;
  }

  if (template.theme === "anime-storm-and-flame" || template.theme === "storm-and-flame") {
    return <AnimeStormAndFlameViewer template={template} code={code} />;
  }

  const mediaItems: MediaItem[] = Array.isArray(template.media_items) ? template.media_items : [];
  const hasMedia = template.has_media && mediaItems.length > 0;

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: palette.dark }}
    >
      {/* ── Background scene ── */}
      <motion.div
        key={template.scene_index}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${scene.bg}')`,
          filter: "brightness(0.45) saturate(1.3)",
        }}
      />

      {/* ── Scene overlay gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${palette.dark}60 0%, transparent 40%, ${palette.dark}95 100%)`,
        }}
      />

      {/* ── SVG ambient layer (phase-aware) ── */}
      <FloatingSvgLayer phase={phase} palette={palette} />

      {/* ── Floating Music Player (mounts when track exists) ── */}
      {musicTrack && (
        <FloatingMusicPlayer
          key={musicTrack.id}
          track={musicTrack}
          palette={palette}
          autoStart={true}
        />
      )}

      {/* ── Sakura petals ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <SakuraPetal key={i} index={i} />
        ))}
      </div>

      {/* ── Shooting stars (starry scene only) ── */}
      {template.scene_index === 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShootingStar key={i} index={i} />
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-8 min-h-screen">
        <AnimatePresence mode="wait">

          {/* INTRO */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-6 max-w-sm"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 160, delay: 0.3 }}
                className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-2xl"
                style={{
                  background: `radial-gradient(circle, ${palette.accent}40, ${palette.glow}20)`,
                  border: `2px solid ${palette.accent}60`,
                  boxShadow: `0 0 40px ${palette.glow}40`,
                }}
              >
                🌸
              </motion.div>

              <div className="space-y-2 sm:space-y-3">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xs font-bold tracking-[0.3em] uppercase"
                  style={{ color: palette.accent }}
                >
                  {template.partner_from} made this for you
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-4xl sm:text-5xl font-bold"
                  style={{ color: palette.text, fontFamily: "Georgia, serif" }}
                >
                  <Typewriter text={template.partner_name + ","} delay={1.0} />
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="text-sm sm:text-base opacity-75"
                  style={{ color: palette.text }}
                >
                  I wrote something just for you... 💕
                </motion.p>
              </div>

              {/* Begin Journey Button */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.4 }}
                className="pt-2"
              >
                <button
                  onClick={handleBeginJourney}
                  className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto cursor-pointer shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                    boxShadow: `0 0 25px ${palette.glow}60`,
                  }}
                >
                  <span>Open My Letter</span>
                  <span>💌</span>
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* FULL SCREEN VIDEO PHASE */}
          {phase === "video" && (
            <FullScreenVideoPhase
              palette={palette}
              videoSrc={
                template?.sender_gender === "female" ||
                template?.theme === "anime_female" ||
                template?.theme?.toLowerCase().includes("female")
                  ? SENDER_VIDEOS.female
                  : SENDER_VIDEOS.male
              }
              onComplete={() => setPhase("envelope")}
              onSkip={skipToFinal}
            />
          )}

          {/* FULL SCREEN ENVELOPE SVG PHASE */}
          {phase === "envelope" && (
            <FullScreenEnvelopeSvgPhase
              palette={palette}
              partnerName={template.partner_name}
              onOpen={() => setPhase("message")}
              onSkip={skipToFinal}
            />
          )}

          {/* MESSAGE */}
          {phase === "message" && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-lg space-y-6 select-none"
            >
              {/* Letter card */}
              <div
                className="rounded-3xl p-7 shadow-2xl space-y-5"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(28px)",
                  border: `1px solid ${palette.accent}30`,
                  boxShadow: `0 0 60px ${palette.glow}20`,
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-current" style={{ color: palette.accent }} />
                  <span
                    className="text-xs font-bold tracking-[0.25em] uppercase opacity-60"
                    style={{ color: palette.text }}
                  >
                    A letter for {template.partner_name}
                  </span>
                </div>

                {/* Message */}
                <p
                  className="text-lg sm:text-xl leading-relaxed italic"
                  style={{ color: palette.text, fontFamily: "Georgia, serif" }}
                >
                  &ldquo;
                  <Typewriter text={template.message} delay={0.5} />
                  &rdquo;
                </p>

                {/* Sign-off */}
                <p
                  className="text-right text-xl font-bold opacity-80"
                  style={{ color: palette.accent, fontFamily: "Georgia, serif" }}
                >
                  — {template.partner_from} ♥
                </p>
              </div>

              {/* Floating hearts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex justify-center gap-5"
              >
                {["❤️", "💜", "🌸", "💜", "❤️"].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 2.5, delay: i * 0.28, repeat: Infinity, ease: "easeInOut" }}
                    className="text-2xl"
                  >
                    {h}
                  </motion.span>
                ))}
              </motion.div>

              {/* Continue button */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setPhase(hasMedia ? "memories" : "final")}
                  className="px-6 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white transition-all bg-white/10 hover:bg-white/20 border border-white/20 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {hasMedia ? "View Our Memories →" : "Forever & Always →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* MEMORIES — 3D Hyperbolic Curved Arc Gallery */}
          {phase === "memories" && hasMedia && (
            <HyperbolicCurvedGallery
              key="memories"
              items={mediaItems}
              palette={palette}
              fromName={template.partner_from}
              toName={template.partner_name}
              onOpenLightbox={openLightbox}
              onFinishMemories={() => setPhase("final")}
            />
          )}

          {/* FINAL — Grand Finale with aaaaa.svg at last */}
          {phase === "final" && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg space-y-4 sm:space-y-5 text-center select-none"
            >
              {/* Grand Climax Animated Hearts (aaaaa.svg) */}
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.2 }}
                className="relative mx-auto w-36 sm:w-44 md:w-50 h-auto my-1"
              >
                {/* Radiant pulsating halo behind animated hearts */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${palette.accent}80 0%, ${palette.glow}40 50%, transparent 75%)`,
                    filter: "blur(30px)",
                    transform: "scale(1.2)",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/anime theme/svg/aaaaa.svg"
                  alt="Endless Love Hearts"
                  className="w-full h-auto object-contain relative z-10"
                  style={{
                    filter: `drop-shadow(0 0 25px ${palette.glow}95) drop-shadow(0 12px 30px rgba(0,0,0,0.6))`,
                  }}
                />
              </motion.div>

              <div className="space-y-2 sm:space-y-2.5">
                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold leading-snug"
                  style={{ color: palette.text, fontFamily: "Georgia, serif" }}
                >
                  In every universe,<br />
                  I choose you.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm sm:text-base opacity-85 font-medium tracking-wide"
                  style={{ color: palette.accent, fontFamily: "Georgia, serif" }}
                >
                  With all my love — {template.partner_from} ♥
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="flex justify-center gap-3 pt-0.5"
                >
                  {["🌸", "💕", "✨", "💕", "🌸"].map((e, i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                      className="text-lg sm:text-xl"
                    >
                      {e}
                    </motion.span>
                  ))}
                </motion.div>
              </div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
              >
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    color: palette.text,
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${palette.accent}35`,
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? "✓ Copied!" : "Share Link"}</span>
                </button>
                <a
                  href="/anime-template"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                    color: "#fff",
                    boxShadow: `0 0 25px ${palette.glow}60`,
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Yours</span>
                </a>
              </motion.div>

              {/* Sub-actions: Replay and Relive */}
              <div className="flex justify-center items-center gap-5 pt-1 text-xs opacity-75">
                {hasMedia && (
                  <button
                    onClick={() => setPhase("memories")}
                    className="underline underline-offset-4 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                    style={{ color: palette.accent }}
                  >
                    📸 Relive Memories
                  </button>
                )}
                <button
                  onClick={replayStory}
                  className="underline underline-offset-4 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                  style={{ color: palette.text }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replay Story
                </button>
              </div>

              {/* Interactive Tools: T07 Scratch Reveal */}
              {scratchToolConfig && (
                <div id="scratch_t07" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <ScratchRevealTool
                    templateCode={template.short_code}
                    config={scratchToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T08 Love Coupon */}
              {couponToolConfig && (
                <div id="coupon_t08" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <LoveCouponTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={couponToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T09 Open When Letters */}
              {openWhenToolConfig && (
                <div id="open_when_t09" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <OpenWhenLettersTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={openWhenToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T10 Our Story Memories */}
              {ourStoryToolConfig && (
                <div id="our_story_t10" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <OurStoryTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={ourStoryToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T11 Mini Couple Bucket List */}
              {bucketListToolConfig && (
                <div id="bucket_list_t11" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <BucketListTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={bucketListToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T06 Private Reveal */}
              {revealToolConfig && (
                <div id="reveal_t06" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <PrivateRevealTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={revealToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T05 Question Cards */}
              {questionToolConfig && (
                <div id="questions_t05" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <QuestionTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T04 Choice Cards & Polls */}
              {pollToolConfig && (
                <div className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <PollTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={pollToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T02/T03 Invitation Tool */}
              {invitationToolConfig && (
                <div id="invitation_t02" className="w-full max-w-xl mx-auto pt-6 text-left select-text">
                  <InvitationTool
                    templateCode={template.short_code}
                    partnerName={template.partner_name}
                    senderName={template.partner_from}
                    config={invitationToolConfig}
                    palette={palette}
                  />
                </div>
              )}

              {/* Interactive Tools: T01 Reply Tool */}
              <div className="w-full max-w-xl mx-auto pt-4 text-left select-text">
                <ReplyTool
                  templateCode={template.short_code}
                  partnerName={template.partner_name}
                  senderName={template.partner_from}
                  config={replyToolConfig}
                  palette={palette}
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Skip button (intro only — envelope has its own) */}
        {phase === "intro" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            onClick={skipToFinal}
            className="fixed bottom-8 right-6 text-xs opacity-30 hover:opacity-60 transition-opacity cursor-pointer z-20"
            style={{ color: palette.text }}
          >
            Skip →
          </motion.button>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        <Heart className="w-2.5 h-2.5 fill-current opacity-30" style={{ color: palette.accent }} />
        <span className="text-[10px] opacity-30 font-medium tracking-wide" style={{ color: palette.text }}>
          Made with QubitSells
        </span>
        <Heart className="w-2.5 h-2.5 fill-current opacity-30" style={{ color: palette.accent }} />
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && hasMedia && (
          <MediaLightbox
            items={mediaItems}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            palette={palette}
          />
        )}
      </AnimatePresence>

      {/* Creator Drawer */}
      {template && (
        <CreatorRepliesDrawer
          templateCode={template.short_code}
          manageToken={manageToken}
          palette={palette}
        />
      )}
    </div>
  );
}
