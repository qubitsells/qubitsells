"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Heart,
  Sparkles,
  Calendar,
  ArrowRight,
  Hourglass,
  Lock,
  Compass,
  CheckCircle2,
  Star,
} from "lucide-react";

export default function HeroSection() {
  const [loveCount, setLoveCount] = useState(1420);
  const [revealedBlindDate, setRevealedBlindDate] = useState(false);
  const [activeMood, setActiveMood] = useState("Romance");

  const handleLoveClick = () => {
    setLoveCount((prev) => prev + 1);

    try {
      confetti({
        particleCount: 30,
        spread: 70,
        origin: { y: 0.75 },
        colors: ["#fb7185", "#f43f5e", "#fda4af", "#e11d48", "#fff"],
      });
    } catch {
      // safe fallback
    }
  };

  const moods = [
    { name: "Romance", icon: "🥂" },
    { name: "Adventure", icon: "🏕️" },
    { name: "Intimacy", icon: "🔥" },
    { name: "Cozy", icon: "🛋️" },
  ];

  return (
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-18 overflow-hidden bg-gradient-to-b from-[#fff5f7] via-[#fff8fa] to-[#fff5f7]">
      
      {/* ─── Clear, Vivid Background Video Layer ─── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover filter brightness-[0.9] contrast-[1.02] saturate-[1.12]"
        >
          <source src="/62666-504665647.mp4" type="video/mp4" />
        </video>

        {/* Soft, Light Luminous Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/45 to-[#fff6f8]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/35 via-rose-50/45 to-[#fff6f8]/85" />
        
        {/* Soft Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-rose-300/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Hero Header with generous spacing & clean typography */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#280816]"
          >
            <span className="block font-sans drop-shadow-xs pb-1 sm:pb-2">
              Where True Love Becomes an
            </span>
            <span className="font-script text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gradient-script block pt-3 sm:pt-4 pb-2 sm:pb-3 px-2 leading-[1.3] tracking-normal font-normal">
              Unforgettable Adventure
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-[#5c243b] max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Date night generator, intimate vibe checks, locked time capsules, connection heatmaps,
            and shared date calendars — all together in one beautiful place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto btn-love-primary text-sm font-bold text-white px-7 py-3.5 rounded-full flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/25 cursor-pointer"
              id="hero-cta-get-started"
            >
              <Heart className="w-4 h-4 fill-white text-white animate-pulse" />
              <span>Start Free with Partner</span>
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            <motion.a
              href="#features"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto btn-love-secondary text-sm font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Explore Features</span>
            </motion.a>
          </motion.div>

          {/* Social Proof Tags - Themed with Rose Accent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-y-1.5 gap-x-5 text-xs text-[#6e2b46] font-medium"
          >
            <span className="flex items-center gap-1">
              <span className="flex text-rose-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                ))}
              </span>
              <span className="font-bold text-[#350b1d] ml-1">4.9/5</span> Rating
            </span>
            <span className="w-1 h-1 rounded-full bg-rose-300" />
            <span className="font-semibold text-rose-900">85,000+ Couples QubitSells</span>
            <span className="w-1 h-1 rounded-full bg-rose-300" />
            <span className="text-rose-800">A Private Shared Space</span>
          </motion.div>
        </div>

        {/* ─── Compact Hero Interactive Live Couple Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Outer Glass Card */}
          <div className="relative rounded-2xl p-4 sm:p-6 bg-white/90 backdrop-blur-xl border border-rose-200/90 shadow-[0_15px_45px_-10px_rgba(244,63,94,0.14)] overflow-hidden">
            
            {/* Top Widget Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    M
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-400 to-pink-400 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    S
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[#350b1d]">Alex & Jamie</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      ● Live Synced
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78304f]">Day 412 together · Next: Anniversary in 18d</p>
                </div>
              </div>

              {/* Live Heart Tap */}
              <motion.button
                onClick={handleLoveClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-bounce" />
                <span>Send Love Tap ({loveCount})</span>
              </motion.button>
            </div>

            {/* Compact Dashboard Row - Cohesive Rose/Pink Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5">
              
              {/* Item 1: Tonight's Vibe */}
              <div className="p-3 rounded-xl bg-[#fff5f7] border border-rose-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-500" /> Tonight&apos;s Vibe
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                    98% Match
                  </span>
                </div>

                <div className="flex items-center gap-2 my-1">
                  <span className="text-xl">🍷</span>
                  <div>
                    <h4 className="text-xs font-bold text-[#350b1d]">Candlelight & Jazz</h4>
                    <p className="text-[10px] text-[#78304f]">Deep Talk & Intimacy</p>
                  </div>
                </div>

                <div className="flex gap-1 pt-1.5 border-t border-rose-100">
                  {moods.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setActiveMood(m.name)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md flex-1 font-semibold transition-all cursor-pointer ${
                        activeMood === m.name
                          ? "bg-rose-500 text-white shadow-xs"
                          : "bg-white text-rose-800 hover:bg-rose-100"
                      }`}
                    >
                      {m.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item 2: Next Date Night */}
              <div className="p-3 rounded-xl bg-[#fff5f7] border border-rose-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-rose-500" /> Next Big Date
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                    in 3 Days
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#350b1d]">Secret Rooftop Stargazing ✨</h4>
                  <p className="text-[10px] text-[#78304f] mt-0.5">Saturday, 8:30 PM · Cozy Chic</p>
                </div>

                <div className="pt-1.5 border-t border-rose-100 flex items-center justify-between text-[10px]">
                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                    <Hourglass className="w-2.5 h-2.5 text-rose-500" /> Anniversary in 18d
                  </span>
                  <span className="text-rose-600 font-bold cursor-pointer hover:underline">
                    Calendar →
                  </span>
                </div>
              </div>

              {/* Item 3: Blind Date Mystery - Themed in Rose */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                    <Compass className="w-3 h-3 text-rose-500" /> Blind Date Mode
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    Mystery
                  </span>
                </div>

                {revealedBlindDate ? (
                  <div className="py-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                      <CheckCircle2 className="w-3 h-3 text-rose-600" />
                      <span>Unlocked Destination!</span>
                    </div>
                    <p className="text-xs font-bold text-[#350b1d]">Secret Italian Wine Tasting 🍷</p>
                  </div>
                ) : (
                  <div className="py-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-900">
                      <Lock className="w-2.5 h-2.5 text-rose-600" />
                      <span>Location Clue Locked:</span>
                    </div>
                    <p className="text-[10px] italic text-[#6e2b46]">
                      &quot;Where candle shadows dance and acoustic strings whisper...&quot;
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setRevealedBlindDate(!revealedBlindDate)}
                  className="mt-1 text-[10px] py-1 px-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold transition-all text-center cursor-pointer"
                >
                  {revealedBlindDate ? "Hide Details" : "🎲 Tap to Scratch Clue"}
                </button>
              </div>

            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
