"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Flame,
  Eye,
  Calendar,
  PiggyBank,
  Check,
  ArrowUpRight,
  X,
  type LucideIcon,
} from "lucide-react";

interface FeatureCardData {
  id: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  image: string;
  accentColor: string;
  icon: LucideIcon;
  bulletPoints: string[];
}

const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: "time-capsule",
    title: "Time Capsule",
    category: "Encrypted Romantic Vault",
    tagline: "Sealed Until Your Next Milestone",
    description:
      "Seal letters, voice recordings, and hidden memories in an encrypted vault that only unlocks when both partners approve after the selected unlock date.",
    image: "/images/features/time_capsule.jpg",
    accentColor: "#ec4899",
    icon: Hourglass,
    bulletPoints: [
      "Separate approval from both partners",
      "Private audio recordings & voice vow storage",
      "Milestone timer sealed for 1, 3, or 5 years",
    ],
  },
  {
    id: "heatmap",
    title: "Love Heatmap",
    category: "Connection Consistency",
    tagline: "Visualize Your Shared Bond",
    description:
      "A stunning 52-week streak tracker celebrating daily touchpoints, intimacy answers, surprise dates, and milestones glowing together in real-time.",
    image: "/images/features/love_flame.jpg",
    accentColor: "#f43f5e",
    icon: Flame,
    bulletPoints: [
      "Visual GitHub-style 52-week connection grid",
      "Level 1-4 spark ratings for date nights & chats",
      "Monthly romance milestone celebration badges",
    ],
  },
  {
    id: "blind-dates",
    title: "Blind Date Mystery",
    category: "Adventure Itineraries",
    tagline: "Turn Date Night into an Adventure",
    description:
      "Surprise your partner with mystery dates where destinations stay locked. Clues and GPS coordinates reveal only as your evening unfolds.",
    image: "/images/features/mystery_date.jpg",
    accentColor: "#d946ef",
    icon: Eye,
    bulletPoints: [
      "3-Envelope mystery envelope reveal system",
      "Live GPS unlock 30 mins before departure",
      "Auto-curated secret restaurants & playlists",
    ],
  },
  {
    id: "calendar",
    title: "Shared Calendar",
    category: "Date-Only Sanctuary",
    tagline: "Pure Romance. Zero Chore Noise.",
    description:
      "Unlike generic task apps, QubitSells's calendar is purely dedicated to date nights, milestones, trips, and anniversary alarms that you will never forget.",
    image: "/images/features/calendar.jpg",
    accentColor: "#f43f5e",
    icon: Calendar,
    bulletPoints: [
      "Strictly dates, trips & anniversaries only",
      "Smart Push Notification Event Guard",
      "Live countdown clock widgets for iOS & Android",
    ],
  },
  {
    id: "saving-jar",
    title: "Co-Saving Jar",
    category: "Dream Vacations & Goals",
    tagline: "Build Your Future Together",
    description:
      "Gamified couple co-saving jar where you both drop micro-contributions towards dream getaways, wedding funds, and anniversary celebrations.",
    image: "/images/features/savings_jar.jpg",
    accentColor: "#e11d48",
    icon: PiggyBank,
    bulletPoints: [
      "Instant matching micro-deposits ($25 / $50)",
      "Visual goal milestones for dream getaways",
      "Celebration animations when milestones hit",
    ],
  },
];

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedModalCard, setSelectedModalCard] = useState<FeatureCardData | null>(null);
  const total = FEATURE_CARDS.length;

  // Active continuous auto-sliding every 3.2 seconds
  useEffect(() => {
    if (selectedModalCard) return; // pause only when inspecting detail modal
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3200);
    return () => clearInterval(timer);
  }, [selectedModalCard, total, activeIndex]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  // Calculate 3D offset relative to active card
  const getCardStyle = (index: number) => {
    let diff = index - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);

    // Active Center Card
    if (diff === 0) {
      return {
        zIndex: 30,
        transform: "translateX(0%) scale(1.02) rotateY(0deg)",
        opacity: 1,
        filter: "brightness(1) contrast(1.02)",
        cursor: "pointer",
      };
    }

    // Direct Left
    if (diff === -1) {
      return {
        zIndex: 20,
        transform: "translateX(-65%) scale(0.85) rotateY(25deg)",
        opacity: 0.85,
        filter: "brightness(0.95)",
        cursor: "pointer",
      };
    }

    // Direct Right
    if (diff === 1) {
      return {
        zIndex: 20,
        transform: "translateX(65%) scale(0.85) rotateY(-25deg)",
        opacity: 0.85,
        filter: "brightness(0.95)",
        cursor: "pointer",
      };
    }

    // Far Left
    if (diff === -2 || (diff < -2 && absDiff <= 2)) {
      return {
        zIndex: 10,
        transform: "translateX(-115%) scale(0.7) rotateY(36deg)",
        opacity: 0.45,
        filter: "brightness(0.85)",
        cursor: "pointer",
      };
    }

    // Far Right
    if (diff === 2 || (diff > 2 && absDiff <= 2)) {
      return {
        zIndex: 10,
        transform: "translateX(115%) scale(0.7) rotateY(-36deg)",
        opacity: 0.45,
        filter: "brightness(0.85)",
        cursor: "pointer",
      };
    }

    // Hidden Outliers
    return {
      zIndex: 0,
      transform: `translateX(${diff > 0 ? "140%" : "-140%"}) scale(0.55) rotateY(${diff > 0 ? "-45deg" : "45deg"})`,
      opacity: 0,
      filter: "brightness(0.5)",
      pointerEvents: "none" as const,
    };
  };

  const activeFeature = FEATURE_CARDS[activeIndex];

  return (
    <section
      id="features"
      className="relative py-14 sm:py-18 overflow-hidden bg-gradient-to-b from-[#fff8fa] via-[#fff0f3] to-[#fff8fa] text-[#280816]"
    >
      {/* Background Soft Ambient Glows & Light Ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-70">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-r from-rose-300/30 via-pink-200/30 to-rose-200/30 rounded-full blur-[130px]" />
        <svg
          className="absolute w-full h-full opacity-30"
          viewBox="0 0 1440 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100,300 C300,150 600,450 1000,250 C1250,120 1400,380 1600,280"
            stroke="url(#rose-ribbon-light)"
            strokeWidth="3"
            strokeDasharray="6 8"
          />
          <path
            d="M-100,380 C250,220 700,520 1100,320 C1350,200 1500,420 1650,320"
            stroke="url(#rose-ribbon-light)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="rose-ribbon-light" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#fb7185" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Clean Light-Mode Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#280816] tracking-tight">
            Crafted for <span className="font-script text-5xl sm:text-6xl md:text-7xl text-gradient-script font-normal inline-block px-1.5 py-0.5">Every Chapter</span> of Love
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#64243d] font-medium">
            Swipe or tap to explore the 6 luxury romantic modules designed exclusively for couples.
          </p>
        </div>

        {/* ─── 3D Crystal Carousel Stage (Light Mode Glassmorphism) ─── */}
        <div
          className="relative w-full max-w-4xl mx-auto h-[380px] sm:h-[420px] flex items-center justify-center"
          style={{ perspective: "1200px" }}
        >
          {/* Navigation Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white backdrop-blur-xl border border-rose-200/90 text-rose-700 hover:text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/15 transition-all cursor-pointer hover:scale-110 active:scale-95"
            aria-label="Previous Feature"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Navigation Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 hover:bg-white backdrop-blur-xl border border-rose-200/90 text-rose-700 hover:text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/15 transition-all cursor-pointer hover:scale-110 active:scale-95"
            aria-label="Next Feature"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* 3D Cards Container */}
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            {FEATURE_CARDS.map((card, idx) => {
              const style = getCardStyle(idx);
              const isCenter = idx === activeIndex;

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (isCenter) {
                      setSelectedModalCard(card);
                    } else {
                      setActiveIndex(idx);
                    }
                  }}
                  style={style}
                  className="absolute w-[240px] sm:w-[280px] md:w-[310px] h-[330px] sm:h-[370px] rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] select-none pointer-events-auto group"
                >
                  {/* Outer Crystal Glass Body in Soft White/Pink Glass */}
                  <div
                    className={`relative w-full h-full rounded-3xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden backdrop-blur-2xl border transition-all duration-300 ${
                      isCenter
                        ? "bg-white/95 border-2 border-rose-300 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.22),0_0_35px_rgba(253,164,175,0.35)] ring-1 ring-rose-200"
                        : "bg-white/75 border border-rose-200/70 shadow-lg shadow-rose-500/5 hover:border-rose-300"
                    }`}
                  >
                    {/* Gloss Top Specular Shimmer */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent rounded-t-3xl pointer-events-none" />

                    {/* Top Tag */}
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-50/90 backdrop-blur-md border border-rose-200/80">
                        {card.category}
                      </span>

                      {isCenter && (
                        <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Center 3D Crystal Image Art */}
                    <div className="relative w-full h-[180px] sm:h-[210px] my-auto flex items-center justify-center overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 bg-rose-200/20 rounded-2xl blur-md" />
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={280}
                        height={280}
                        className={`w-full h-full object-cover rounded-2xl transition-transform duration-500 ${
                          isCenter ? "group-hover:scale-105" : ""
                        }`}
                        priority={idx === 0 || idx === 1}
                      />
                    </div>

                    {/* Bottom Title & Subtitle */}
                    <div className="text-center z-10 pt-1 pb-0.5">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#280816] tracking-tight group-hover:text-rose-600 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-[#6e2b46] font-medium truncate max-w-[220px] mx-auto">
                        {card.tagline}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Dots Indicator & Active Card Quick Bar */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {FEATURE_CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeIndex
                    ? "w-8 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                    : "w-2 bg-rose-200 hover:bg-rose-300"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Quick Active Feature Pill */}
          <motion.div
            key={activeFeature.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-rose-200 shadow-xs text-xs text-[#280816]"
          >
            <span className="font-bold text-[#280816]">{activeFeature.title}</span>
            <span className="w-1 h-1 rounded-full bg-rose-400" />
            <span className="text-[#6e2b46] font-medium">{activeFeature.tagline}</span>
            <button
              onClick={() => setSelectedModalCard(activeFeature)}
              className="ml-2 text-rose-600 hover:text-rose-700 font-bold underline text-[11px] cursor-pointer"
            >
              Details →
            </button>
          </motion.div>
        </div>

      </div>

      {/* ─── Detail Modal Box on Card Click (Light Mode) ─── */}
      <AnimatePresence>
        {selectedModalCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalCard(null)}
              className="absolute inset-0 bg-[#280816]/45 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg rounded-3xl bg-white/98 backdrop-blur-2xl border border-rose-200 shadow-2xl p-6 sm:p-7 z-10 text-[#280816] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                    <selectedModalCard.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#280816]">
                      {selectedModalCard.title}
                    </h3>
                    <span className="text-xs text-rose-600 font-bold">
                      {selectedModalCard.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedModalCard(null)}
                  className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 3D Visual & Description */}
              <div className="py-4 space-y-3">
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-rose-200">
                  <Image
                    src={selectedModalCard.image}
                    alt={selectedModalCard.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <p className="text-xs sm:text-sm text-[#5a2037] leading-relaxed font-medium">
                  {selectedModalCard.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-rose-100">
                  {selectedModalCard.bulletPoints.map((bp, i) => (
                    <div key={i} className="text-xs text-[#280816] font-medium flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{bp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-rose-100 flex items-center justify-between">
                <span className="text-[11px] text-[#78304f] font-medium">
                  Included in QubitSells Couple Sanctuary
                </span>
                <div className="flex items-center gap-2">
                  {selectedModalCard.id === "time-capsule" && (
                    <a
                      href="/time-capsule"
                      className="btn-love-primary text-xs font-bold text-white px-4 py-2 rounded-full cursor-pointer shadow-md flex items-center gap-1"
                    >
                      <span>Open Vault</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedModalCard(null)}
                    className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
