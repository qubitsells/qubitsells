"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, X, Quote } from "lucide-react";

export interface FloatingGalleryItem {
  id: string;
  url: string;
  quote: string;
  author?: string;
  caption?: string;
  aspect?: "tall" | "wide" | "square" | "circle" | "badge";
  aspectRatio?: "tall" | "wide" | "square" | "circle" | "badge" | "portrait";
  size?: "sm" | "md" | "lg" | "xl";
  rotation?: number; // subtle tilt in degrees
}

interface FloatingQuoteGalleryProps {
  items: FloatingGalleryItem[];
  title?: string;
  subtitle?: string;
  isStudioPreview?: boolean;
  accentColor?: string;
  theme?: "pink" | "halloween" | string;
}

// Gentle floating animation variations for organic zero-gravity feel
const FLOAT_VARIANTS = [
  { y: [-6, 7, -6], rotate: [-1, 1, -1], duration: 4.2, delay: 0 },
  { y: [7, -6, 7], rotate: [1.2, -1, 1.2], duration: 5.1, delay: 0.4 },
  { y: [-8, 5, -8], rotate: [-0.8, 1.4, -0.8], duration: 4.6, delay: 0.8 },
  { y: [5, -7, 5], rotate: [1.5, -0.8, 1.5], duration: 3.9, delay: 0.2 },
  { y: [-5, 8, -5], rotate: [-1.2, 0.8, -1.2], duration: 4.8, delay: 0.6 },
  { y: [6, -5, 6], rotate: [0.8, -1.2, 0.8], duration: 4.3, delay: 1.0 },
  { y: [-7, 6, -7], rotate: [-1.5, 1, -1.5], duration: 5.4, delay: 0.3 },
];

export function FloatingQuoteGallery({
  items,
  title = "Our Floating Memories & Whispers",
  subtitle = "Hover over any memory to reveal the secret quote inside my heart ✨",
  isStudioPreview = false,
  accentColor = "#A43F66",
  theme,
}: FloatingQuoteGalleryProps) {
  const [activeItem, setActiveItem] = useState<FloatingGalleryItem | null>(null);
  const [tappedId, setTappedId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const isStormAndFlame =
    theme === "anime-storm-and-flame" ||
    theme === "storm-and-flame" ||
    accentColor === "#00E5FF" ||
    accentColor?.toLowerCase().includes("00e5ff");

  const isHauntedWaltz =
    theme === "haunted-waltz" ||
    theme === "spooky-the-haunted-waltz" ||
    accentColor === "#90C9C6" ||
    accentColor?.toLowerCase().includes("90c9c6");

  const isStarlitStory =
    theme === "starlit-story" ||
    accentColor === "#C26D7A" ||
    accentColor?.toLowerCase().includes("c26d7a") ||
    accentColor === "#F6D089" ||
    accentColor?.toLowerCase().includes("f6d089");

  const isHalloween =
    theme === "halloween" ||
    accentColor === "#F3B574" ||
    accentColor?.toLowerCase().includes("f3b574");

  const isPumpkinMoon =
    theme === "pumpkin-moon" ||
    theme === "halloween-pumpkin-moon" ||
    accentColor === "#FF7518" ||
    accentColor?.toLowerCase().includes("ff7518");

  // Split items into 4 columns to achieve the mosaic collage wall
  const col1 = items.filter((_, idx) => idx % 4 === 0);
  const col2 = items.filter((_, idx) => idx % 4 === 1);
  const col3 = items.filter((_, idx) => idx % 4 === 2);
  const col4 = items.filter((_, idx) => idx % 4 === 3);
  const columns = [col1, col2, col3, col4];

  return (
    <div className="relative w-full max-w-5xl mx-auto py-8 px-2 sm:px-4 select-none">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h2
          className={
            isStormAndFlame
              ? "text-3xl sm:text-5xl font-storm-flame text-[#EFF7FF] tracking-wide drop-shadow-[0_2px_20px_rgba(0,229,255,0.45)]"
              : isStarlitStory
              ? "text-3xl sm:text-5xl font-starlit text-[#3A231C] tracking-wide drop-shadow-xs"
              : isHauntedWaltz
              ? "text-3xl sm:text-5xl font-mystical-horror text-[#EDF1ED] tracking-wide drop-shadow-[0_2px_15px_rgba(144,201,198,0.35)]"
              : isPumpkinMoon
              ? "text-3xl sm:text-5xl font-halloween text-[#FFF3E3] tracking-wide drop-shadow-[0_2px_18px_rgba(255,117,24,0.45)]"
              : isHalloween
              ? "text-3xl sm:text-5xl font-halloween text-[#FFE2BD] tracking-wide drop-shadow-[0_2px_15px_rgba(243,181,116,0.35)]"
              : "text-2xl sm:text-3xl font-black text-[#51253E] tracking-tight"
          }
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`text-xs sm:text-sm font-medium max-w-xl mx-auto leading-relaxed ${
              isStormAndFlame
                ? "text-[#B9CBDF]"
                : isStarlitStory
                ? "text-[#75564C]"
                : isHauntedWaltz
                ? "text-[#B8C6CE]"
                : isPumpkinMoon
                ? "text-[#C49A76]"
                : isHalloween
                ? "text-[#D6BDC8]"
                : "text-[#79566C]"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Floating Canvas Area */}
      <div
        className={`relative w-full rounded-3xl p-4 sm:p-8 overflow-hidden shadow-inner border ${
          isStormAndFlame
            ? "bg-gradient-to-b from-[#0F1A2E]/95 via-[#070F1E]/98 to-[#0F1A2E]/95 border-[#273B5E]"
            : isStarlitStory
            ? "bg-gradient-to-b from-[#FFF8F4]/90 via-white to-[#FFF8F4]/90 border-[#F0D5C9]"
            : isHauntedWaltz
            ? "bg-gradient-to-b from-[#152026]/90 via-[#0B1015]/95 to-[#152026]/90 border-[#2E414A]"
            : isPumpkinMoon
            ? "bg-gradient-to-b from-[#1C1109]/95 via-[#0F0A06]/98 to-[#1C1109]/95 border-[#542D14]"
            : isHalloween
            ? "bg-gradient-to-b from-[#1D1429]/90 via-[#120D1C]/95 to-[#1D1429]/90 border-[#4A3258]"
            : "bg-gradient-to-b from-[#FFF0F5]/50 via-white/80 to-[#FFF0F5]/50 border-[#F7BFD5]/80"
        }`}
      >
        {/* Scattered floating accent dots */}
        {isStormAndFlame ? (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.25, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-[#00E5FF] shadow-lg shadow-[#00E5FF]/50 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.3, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-[#FF9900] shadow-lg shadow-[#FF9900]/50 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.2, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-[#38BDF8] shadow-md shadow-[#38BDF8]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-[#F97316] shadow-md shadow-[#F97316]/40 pointer-events-none z-10"
            />
          </>
        ) : isStarlitStory ? (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.25, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-[#C26D7A] shadow-md shadow-[#C26D7A]/30 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.3, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-[#D99443] shadow-md shadow-[#D99443]/30 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.2, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-[#FAD4A8] shadow-sm shadow-[#FAD4A8]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-[#6B7A58] pointer-events-none z-10"
            />
          </>
        ) : isHauntedWaltz ? (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-[#90C9C6] shadow-md shadow-[#90C9C6]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.25, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-[#FFCC99] shadow-md shadow-[#FFCC99]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-[#172B31] shadow-sm shadow-[#172B31]/50 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-[#A4DAD7] pointer-events-none z-10"
            />
          </>
        ) : isPumpkinMoon ? (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-[#FF7518] shadow-md shadow-[#FF7518]/50 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.25, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-[#FFD166] shadow-md shadow-[#FFD166]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-[#8C441B] shadow-sm shadow-[#8C441B]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-[#F4A261] pointer-events-none z-10"
            />
          </>
        ) : isHalloween ? (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-[#F3B574] shadow-md shadow-[#F3B574]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.25, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-[#FFBC73] shadow-md shadow-[#FFBC73]/40 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-[#593354] shadow-sm shadow-[#593354]/30 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-[#E5A158] pointer-events-none z-10"
            />
          </>
        ) : (
          <>
            <motion.div
              animate={{ y: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-12 left-6 w-5 h-5 rounded-full bg-rose-500 shadow-md shadow-rose-300 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [12, -8, 12], scale: [1, 1.25, 1] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full bg-rose-500 shadow-md shadow-rose-300 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [-9, 9, -9], scale: [1, 1.15, 1] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-rose-400 shadow-sm shadow-rose-200 pointer-events-none z-10"
            />
            <motion.div
              animate={{ y: [8, -8, 8], scale: [1, 1.2, 1] }}
              transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-16 right-1/4 w-3.5 h-3.5 rounded-full bg-pink-400 pointer-events-none z-10"
            />
          </>
        )}

        {/* 4-Column Mosaic Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-start relative z-10">
          {columns.map((columnItems, colIdx) => (
            <div
              key={colIdx}
              className={`flex flex-col gap-5 sm:gap-6 ${
                colIdx === 1 ? "md:pt-8" : colIdx === 2 ? "md:pt-4" : colIdx === 3 ? "md:pt-10" : ""
              }`}
            >
              {columnItems.map((item, itemIdx) => {
                const globalIdx = colIdx * 3 + itemIdx;
                const floatConfig = FLOAT_VARIANTS[globalIdx % FLOAT_VARIANTS.length];
                const isTapped = tappedId === item.id;

                // Aspect ratio and shape styling
                const resolvedAspect =
                  item.aspect ||
                  (item.aspectRatio === "portrait" ? "tall" : item.aspectRatio) ||
                  "square";
                let shapeClass = "aspect-[3/4] rounded-2xl";
                let isCircle = false;
                if (resolvedAspect === "wide") shapeClass = "aspect-[16/10] rounded-2xl";
                else if (resolvedAspect === "tall") shapeClass = "aspect-[2/3] rounded-3xl";
                else if (resolvedAspect === "square") shapeClass = "aspect-square rounded-2xl";
                else if (resolvedAspect === "circle") {
                  shapeClass = "aspect-square rounded-full";
                  isCircle = true;
                } else if (resolvedAspect === "badge") {
                  shapeClass = "aspect-square rounded-xl max-w-[130px] mx-auto";
                }

                return (
                  <motion.div
                    key={item.id}
                    animate={{
                      y: floatConfig.y,
                      rotate: floatConfig.rotate,
                    }}
                    transition={{
                      duration: floatConfig.duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: floatConfig.delay,
                    }}
                    whileHover={{ scale: 1.04, zIndex: 20 }}
                    onClick={() => {
                      setTappedId(isTapped ? null : item.id);
                      setActiveItem(item);
                    }}
                    className={`group relative overflow-hidden shadow-md transition-shadow hover:shadow-2xl cursor-pointer border-2 ${
                      isStormAndFlame
                        ? isCircle
                          ? "border-[#273B5E] ring-4 ring-[#18253E] bg-[#070F1E]"
                          : "border-[#273B5E] hover:border-[#00E5FF] bg-[#070F1E]"
                        : isStarlitStory
                        ? isCircle
                          ? "border-[#F0D5C9] ring-4 ring-[#FFF0EB] bg-white"
                          : "border-[#F0D5C9] hover:border-[#C26D7A] bg-white"
                        : isHauntedWaltz
                        ? isCircle
                          ? "border-[#2E414A] ring-4 ring-[#172B31] bg-[#0B1015]"
                          : "border-[#2E414A] hover:border-[#90C9C6] bg-[#0B1015]"
                        : isPumpkinMoon
                        ? isCircle
                          ? "border-[#542D14] ring-4 ring-[#2A180C] bg-[#0F0A06]"
                          : "border-[#542D14] hover:border-[#FF7518] bg-[#0F0A06]"
                        : isHalloween
                        ? isCircle
                          ? "border-[#4A3258] ring-4 ring-[#342038] bg-[#120D1C]"
                          : "border-[#4A3258] hover:border-[#F3B574] bg-[#120D1C]"
                        : isCircle
                        ? "border-[#F7BFD5] ring-4 ring-rose-100 bg-white"
                        : "border-[#F7BFD5]/90 bg-white"
                    } ${shapeClass}`}
                  >
                    {/* Background Image */}
                    <Image
                      src={item.url}
                      alt={item.author || "Romantic memory"}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className={`object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${
                        isCircle ? "rounded-full" : ""
                      }`}
                    />

                    {/* Hover Quote Overlay */}
                    <div
                      className={`absolute inset-0 flex flex-col justify-end p-3.5 sm:p-5 text-white transition-opacity duration-300 ${
                        isStormAndFlame
                          ? "bg-gradient-to-t from-[#050B16]/95 via-[#070F1E]/75 to-[#070F1E]/30"
                          : isStarlitStory
                          ? "bg-gradient-to-t from-[#2B1810]/95 via-[#2B1810]/75 to-[#2B1810]/25"
                          : isHauntedWaltz
                          ? "bg-gradient-to-t from-[#0B1015]/95 via-[#0B1015]/75 to-[#0B1015]/30"
                          : isPumpkinMoon
                          ? "bg-gradient-to-t from-[#0F0A06]/95 via-[#0F0A06]/75 to-[#0F0A06]/35"
                          : isHalloween
                          ? "bg-gradient-to-t from-[#0B0612]/95 via-[#0B0612]/70 to-[#0B0612]/30"
                          : "bg-gradient-to-t from-black/90 via-black/60 to-black/25"
                      } ${
                        isCircle ? "rounded-full items-center text-center justify-center p-4" : ""
                      } ${
                        isTapped
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {/* Quote Symbol */}
                      <Quote
                        className={`w-5 h-5 mb-1.5 shrink-0 opacity-90 drop-shadow ${
                          isStormAndFlame
                            ? "text-[#00E5FF]"
                            : isStarlitStory
                            ? "text-[#FAD4A8]"
                            : isHauntedWaltz
                            ? "text-[#90C9C6]"
                            : isPumpkinMoon
                            ? "text-[#FF7518]"
                            : isHalloween
                            ? "text-[#F3B574]"
                            : "text-rose-300"
                        }`}
                      />

                      {/* Quote Text */}
                      <p
                        className={`text-xs sm:text-sm font-semibold leading-relaxed tracking-wide drop-shadow-md line-clamp-4 ${
                          isStormAndFlame
                            ? "text-[#EFF7FF]"
                            : isStarlitStory
                            ? "text-[#FFFDF7]"
                            : isHauntedWaltz
                            ? "text-[#EDF1ED]"
                            : isPumpkinMoon
                            ? "text-[#FFF3E3]"
                            : isHalloween
                            ? "text-[#FFE2BD]"
                            : "text-rose-50"
                        }`}
                      >
                        &ldquo;{item.quote}&rdquo;
                      </p>

                      {/* Author / Caption Tag */}
                      {item.author && (
                        <div
                          className={`mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold ${
                            isStormAndFlame
                              ? "text-[#FF9900]"
                              : isStarlitStory
                              ? "text-[#FAD4A8]"
                              : isHauntedWaltz
                              ? "text-[#FFCC99]"
                              : isPumpkinMoon
                              ? "text-[#FFD166]"
                              : isHalloween
                              ? "text-[#FFBC73]"
                              : "text-rose-200"
                          }`}
                        >
                          {isStormAndFlame ? (
                            <Sparkles className="w-3 h-3 text-[#00E5FF]" />
                          ) : isStarlitStory ? (
                            <Sparkles className="w-3 h-3 text-[#D99443]" />
                          ) : isHauntedWaltz ? (
                            <Sparkles className="w-3 h-3 text-[#90C9C6]" />
                          ) : isPumpkinMoon ? (
                            <Sparkles className="w-3 h-3 text-[#FF7518]" />
                          ) : isHalloween ? (
                            <Sparkles className="w-3 h-3 text-[#F3B574]" />
                          ) : (
                            <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                          )}
                          <span className="truncate">{item.author}</span>
                        </div>
                      )}

                      <span
                        className={`mt-2 text-[9px] font-medium hidden sm:inline-block ${
                          isStormAndFlame
                            ? "text-[#B9CBDF]/80"
                            : isStarlitStory
                            ? "text-[#FAD4A8]/80"
                            : isHauntedWaltz
                            ? "text-[#8B9DA6]"
                            : isPumpkinMoon
                            ? "text-[#C49A76]"
                            : isHalloween
                            ? "text-[#AA91A5]"
                            : "text-white/60"
                        }`}
                      >
                        Click to enlarge ✨
                      </span>
                    </div>

                    {/* Subtle permanent badge for tap/hover hint */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1 opacity-70 group-hover:opacity-0 transition-opacity">
                      <Quote
                        className={`w-2.5 h-2.5 ${
                          isStormAndFlame
                            ? "text-[#00E5FF]"
                            : isStarlitStory
                            ? "text-[#D99443]"
                            : isHauntedWaltz
                            ? "text-[#90C9C6]"
                            : isPumpkinMoon
                            ? "text-[#FF7518]"
                            : isHalloween
                            ? "text-[#F3B574]"
                            : "text-rose-300"
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal on Click */}
      <AnimatePresence>
        {activeItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setActiveItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border ${
                isStormAndFlame
                  ? "bg-[#0F1A2E] border-[#273B5E]"
                  : isStarlitStory
                  ? "bg-white border-[#F0D5C9]"
                  : isHauntedWaltz
                  ? "bg-[#152026] border-[#2E414A]"
                  : isPumpkinMoon
                  ? "bg-[#1C1109] border-[#542D14]"
                  : isHalloween
                  ? "bg-[#1D1429] border-[#4A3258]"
                  : "bg-white border-rose-200"
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Photo Display */}
              <div className="relative w-full aspect-[4/3] bg-neutral-950">
                <Image
                  src={activeItem.url}
                  alt={activeItem.author || "Enlarged Memory"}
                  fill
                  sizes="600px"
                  className="object-cover"
                />
              </div>

              {/* Quote Card Below Photo */}
              <div
                className={`p-6 space-y-3 text-center ${
                  isStormAndFlame
                    ? "bg-[#070F1E]"
                    : isStarlitStory
                    ? "bg-[#FFF9F5]"
                    : isHauntedWaltz
                    ? "bg-[#0B1015]"
                    : isPumpkinMoon
                    ? "bg-[#0F0A06]"
                    : isHalloween
                    ? "bg-[#120D1C]"
                    : "bg-[#FFF8FC]"
                }`}
              >
                <Quote
                  className={`w-6 h-6 mx-auto opacity-80 ${
                    isStormAndFlame
                      ? "text-[#00E5FF]"
                      : isStarlitStory
                      ? "text-[#C26D7A]"
                      : isHauntedWaltz
                      ? "text-[#90C9C6]"
                      : isPumpkinMoon
                      ? "text-[#FF7518]"
                      : isHalloween
                      ? "text-[#F3B574]"
                      : "text-[#A43F66]"
                  }`}
                />
                <p
                  className={`text-sm sm:text-base font-semibold italic leading-relaxed ${
                    isStormAndFlame
                      ? "text-[#EFF7FF]"
                      : isStarlitStory
                      ? "text-[#3A231C]"
                      : isHauntedWaltz
                      ? "text-[#EDF1ED]"
                      : isPumpkinMoon
                      ? "text-[#FFF3E3]"
                      : isHalloween
                      ? "text-[#FFE2BD]"
                      : "text-[#51253E]"
                  }`}
                >
                  &ldquo;{activeItem.quote}&rdquo;
                </p>
                {activeItem.author && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isStormAndFlame
                        ? "bg-[#18253E] text-[#00E5FF] border-[#273B5E]"
                        : isStarlitStory
                        ? "bg-[#FFF0EB] text-[#C26D7A] border-[#F0D5C9]"
                        : isHauntedWaltz
                        ? "bg-[#172B31] text-[#90C9C6] border-[#2E414A]"
                        : isPumpkinMoon
                        ? "bg-[#2A180C] text-[#FFD166] border-[#542D14]"
                        : isHalloween
                        ? "bg-[#342038] text-[#FFBC73] border-[#4A3258]"
                        : "bg-[#FFE9F1] text-[#A43F66] border-transparent"
                    }`}
                  >
                    {isStormAndFlame ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                    ) : isStarlitStory ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#C26D7A]" />
                    ) : isHauntedWaltz ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#90C9C6]" />
                    ) : isPumpkinMoon ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7518]" />
                    ) : isHalloween ? (
                      <Sparkles className="w-3.5 h-3.5 text-[#F3B574]" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 fill-[#A43F66]" />
                    )}
                    <span>{activeItem.author}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
