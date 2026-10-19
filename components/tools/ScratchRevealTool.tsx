"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  Ticket,
  Calendar,
  ExternalLink,
  RotateCcw,
  Check,
  Heart,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { ScratchRevealToolConfig } from "@/lib/supabase/coupleTemplates";

interface ScratchRevealToolProps {
  templateCode: string;
  config: ScratchRevealToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function ScratchRevealTool({
  templateCode,
  config,
  palette: propPalette,
}: ScratchRevealToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchedPercent, setScratchedPercent] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const checkThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `bonded_scratch_revealed_${templateCode}`;

  // Preserve opened state on return
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "true") {
        setIsRevealed(true);
      }
    } catch {
      // localStorage may be disabled in private mode
    }
  }, [storageKey]);

  // Initialize canvas with theme-compatible metallic shimmer foil
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(rect.height, 220);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Draw metallic luxury gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#2c1e38");
    grad.addColorStop(0.3, "#4a2a4b");
    grad.addColorStop(0.5, "#6b3b64");
    grad.addColorStop(0.7, "#3d1f3d");
    grad.addColorStop(1, "#1e1026");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add metallic stardust flecks
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    for (let i = 0; i < 70; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const rSize = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border inner glow
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, width - 8, height - 8);
  }, []);

  useEffect(() => {
    if (!isRevealed) {
      initCanvas();
      window.addEventListener("resize", initCanvas);
      return () => window.removeEventListener("resize", initCanvas);
    }
  }, [isRevealed, initCanvas]);

  const completeReveal = useCallback(() => {
    setIsRevealed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // silent
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: [palette.accent, "#ec4899", "#f59e0b"],
      });
    } catch {
      // silent
    }
  }, [storageKey, palette.accent]);

  // Measure scratched area
  const checkScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let transparentPixels = 0;
      const totalPixels = data.length / 4;

      // Sample every 16th pixel for performance
      const step = 16;
      let sampled = 0;
      for (let i = 3; i < data.length; i += 4 * step) {
        sampled++;
        if (data[i] === 0) {
          transparentPixels++;
        }
      }

      const percent = Math.round((transparentPixels / sampled) * 100);
      setScratchedPercent(percent);

      if (percent >= 40) {
        completeReveal();
      }
    } catch {
      // CORS or context error
    }
  }, [completeReveal, isRevealed]);

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 42 * dpr;

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x * dpr, lastPointRef.current.y * dpr);
      ctx.lineTo(x * dpr, y * dpr);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x * dpr, y * dpr, 21 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    lastPointRef.current = { x, y };

    if (!checkThrottleRef.current) {
      checkThrottleRef.current = setTimeout(() => {
        checkThrottleRef.current = null;
        checkScratchPercentage();
      }, 150);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    lastPointRef.current = pos;
    scratchAt(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    if (!pos) return;
    scratchAt(pos.x, pos.y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      completeReveal();
    }
  };

  const handleResetScratch = () => {
    setIsRevealed(false);
    setScratchedPercent(0);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // silent
    }
    setTimeout(initCanvas, 50);
  };

  const scrollToInvitation = () => {
    const el = document.getElementById("invitation_t02");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      id="scratch_t07"
      className="w-full max-w-xl mx-auto my-6 rounded-3xl overflow-hidden border backdrop-blur-xl shadow-2xl relative transition-all"
      style={{
        backgroundColor: "rgba(18, 12, 28, 0.75)",
        borderColor: `${palette.accent}33`,
        boxShadow: `0 8px 32px -4px ${palette.glow}20`,
      }}
    >
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: `${palette.accent}26` }}
          >
            <Sparkles className="w-4 h-4" style={{ color: palette.accent }} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide">
              {config.coverTitle || "A Secret Surprise"}
            </h3>
            <p className="text-xs text-white/50">
              {isRevealed
                ? "Surprise revealed!"
                : config.coverInstruction || "Scratch with your finger or mouse to reveal"}
            </p>
          </div>
        </div>

        {/* Scratch progress pill or reset button */}
        {isRevealed ? (
          <button
            type="button"
            onClick={handleResetScratch}
            className="text-[11px] text-white/40 hover:text-white/80 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            title="Cover and scratch again"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Scratch again</span>
          </button>
        ) : (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">
            {scratchedPercent}% scratched
          </span>
        )}
      </div>

      {/* Interactive Card Container */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="button"
        aria-label="Scratch card. Press Space or Enter to reveal immediately."
        onKeyDown={handleKeyDown}
        className="relative min-h-[220px] p-6 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-pink-500/50"
      >
        {/* Hidden Content (Revealed Underneath) */}
        <div className="w-full text-center select-text">
          {config.contentType === "message" && (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: `${palette.accent}25` }}
              >
                <Heart className="w-5 h-5" style={{ color: palette.accent }} />
              </div>
              <p className="text-xs uppercase tracking-widest text-white/50 font-bold">
                Secret Message
              </p>
              <p className="text-sm md:text-base font-semibold text-white/95 leading-relaxed whitespace-pre-wrap">
                {config.hiddenMessage || "You mean everything to me!"}
              </p>
            </div>
          )}

          {config.contentType === "photo" && config.hiddenPhotoUrl && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/15 max-h-72 mx-auto shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.hiddenPhotoUrl}
                  alt="Surprise revealed photo"
                  className="w-full h-auto object-cover max-h-72"
                />
              </div>
              {config.hiddenMessage && (
                <p className="text-xs text-white/80 italic">&ldquo;{config.hiddenMessage}&rdquo;</p>
              )}
            </div>
          )}

          {config.contentType === "invitation" && (
            <div
              className="p-6 rounded-2xl border text-center space-y-3 shadow-xl"
              style={{
                backgroundColor: `${palette.accent}15`,
                borderColor: `${palette.accent}40`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white"
                style={{ backgroundColor: palette.accent }}
              >
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-pink-300 block mb-1">
                  VIP Date Pass / Invitation
                </span>
                <h4 className="text-base font-bold text-white">
                  {config.hiddenMessage || "A Special Date Invitation For You"}
                </h4>
              </div>

              <button
                type="button"
                onClick={scrollToInvitation}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: palette.accent,
                  boxShadow: `0 4px 16px ${palette.accent}50`,
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>View Date Details &amp; RSVP</span>
              </button>
            </div>
          )}
        </div>

        {/* Scratchable Foil Canvas Layer */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 cursor-crosshair touch-none select-none flex items-center justify-center"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="absolute inset-0 w-full h-full"
              />

              {/* Cover Text centered on foil */}
              <div className="relative pointer-events-none text-center px-6 py-4 space-y-2 max-w-xs">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="w-5 h-5 animate-pulse text-amber-200" />
                </div>
                <p className="text-sm md:text-base font-bold text-white drop-shadow-md">
                  {config.coverTitle || "Scratch to Reveal"}
                </p>
                <p className="text-[11px] text-white/80 drop-shadow">
                  {config.coverInstruction || "Scratch with your finger or mouse"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accessible "Reveal now" Alternative button */}
      {!isRevealed && (
        <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs">
          <span className="text-white/50 text-[11px]">Can&apos;t scratch right now?</span>
          <button
            type="button"
            onClick={completeReveal}
            className="px-3 py-1.5 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reveal now</span>
          </button>
        </div>
      )}
    </div>
  );
}
