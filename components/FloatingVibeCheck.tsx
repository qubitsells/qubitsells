"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import Image from "next/image";
import {
  Sparkles,
  Clock,
  DollarSign,
  Compass,
  MessageCircleHeart,
  Shirt,
  Send,
  Check,
  X,
  Heart,
} from "lucide-react";

export interface VibePreset {
  id: string;
  name: string;
  emoji: string;
  badge: string;
  dateTitle: string;
  time: string;
  budget: string;
  dressCode: string;
  itinerary: string[];
  intimacyQuestion: string;
  blindDateClue?: string;
}

export const VIBE_PRESETS: VibePreset[] = [
  {
    id: "romantic",
    name: "Romantic & Intimate",
    emoji: "🍷",
    badge: "Most Popular",
    dateTitle: "The Secret Jazz & Midnight Fondue Night",
    time: "7:30 PM – 11:30 PM",
    budget: "$$ (Moderate)",
    dressCode: "Velvet, Silk & Subtle Perfume",
    itinerary: [
      "7:30 PM: Secret cocktail lounge with vinyl records playing",
      "8:45 PM: Warm artisan fondue by flickering candlelight",
      "10:15 PM: Scenic stroll sharing earphones to your special song",
    ],
    intimacyQuestion:
      "What is one tiny, unsaid thing I do every day that makes your heart feel the safest?",
  },
  {
    id: "spicy",
    name: "Spicy & Passionate",
    emoji: "🔥",
    badge: "High Chemistry",
    dateTitle: "The Velvet Lounge & Sensory Challenge",
    time: "9:00 PM – Late",
    budget: "$$$ (Indulgent)",
    dressCode: "Dress to turn heads & linger close",
    itinerary: [
      "9:00 PM: Dark speakeasy booth with intimate whispers only",
      "10:15 PM: Blindfolded dessert tasting game at home",
      "11:30 PM: 10-minute uninterrupted eye contact with no speaking allowed",
    ],
    intimacyQuestion:
      "If tonight had no rules and endless time, what is one desire you would whisper in my ear?",
  },
  {
    id: "blind",
    name: "Blind Date Mystery",
    emoji: "🎲",
    badge: "Mystery Unlock",
    dateTitle: "The 3-Envelope Mystery Adventure",
    time: "6:00 PM – 10:30 PM",
    budget: "$$ (Surprise)",
    dressCode: "Comfortable chic & mystery ready",
    itinerary: [
      "Envelope #1: Destination revealed only when the car engine turns on",
      "Envelope #2: Partner picks the dessert without the other seeing the menu",
      "Envelope #3: Sealed midnight location where a keepsake will be locked",
    ],
    intimacyQuestion:
      "If we were to pack one suitcase tonight and vanish to anywhere on earth tomorrow, where do we wake up?",
    blindDateClue: "GPS coordinates unlock at 5:30 PM sharp on both your devices.",
  },
  {
    id: "adventure",
    name: "Wild & Adventurous",
    emoji: "🏕️",
    badge: "Adrenaline",
    dateTitle: "Midnight Stargazing & Rooftop Picnic",
    time: "8:00 PM – 12:00 AM",
    budget: "$ (Low / High Magic)",
    dressCode: "Warm oversized hoodies & cozy sneakers",
    itinerary: [
      "8:00 PM: Hit the road with an impromptu acoustic playlist",
      "9:15 PM: Lay blankets on the hood of the car under the stars",
      "10:30 PM: Hot cocoa in thermoses while naming new constellations after your memories",
    ],
    intimacyQuestion:
      "When in our relationship did you feel most proud of us as a team against the world?",
  },
  {
    id: "cozy",
    name: "Cozy & Soft Chill",
    emoji: "🛋️",
    badge: "Pure Comfort",
    dateTitle: "The Living Room Fortress & Memory Reel",
    time: "7:00 PM – Sleep",
    budget: "$ (Free / Sweet)",
    dressCode: "Matching loungewear & soft socks",
    itinerary: [
      "7:00 PM: Build a cozy blanket fortress with fairy lights inside",
      "8:00 PM: Cook a comfort meal together where each person handles 3 ingredients",
      "9:30 PM: Scroll through your oldest photo album from year 1 together",
    ],
    intimacyQuestion:
      "What is a quiet memory of us that you replay whenever you need comfort?",
  },
];

export default function FloatingVibeCheck() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<VibePreset>(VIBE_PRESETS[0]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleTrigger = () => setModalOpen(true);
    const handleHash = () => { if (window.location.hash === "#vibe-check") handleTrigger(); };
    window.addEventListener("open-vibe-check", handleTrigger);
    window.addEventListener("hashchange", handleHash);
    const frame = window.requestAnimationFrame(handleHash);
    return () => {
      window.removeEventListener("open-vibe-check", handleTrigger);
      window.removeEventListener("hashchange", handleHash);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleSendToPartner = async () => {
    try {
      await navigator.clipboard.writeText(`${selectedVibe.dateTitle}\n${selectedVibe.time}\n${selectedVibe.dressCode}\n${selectedVibe.itinerary.join("\n")}\n${selectedVibe.intimacyQuestion}`);
    } catch { return; }
    setCopied(true);
    try {
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#fb7185", "#f43f5e", "#fda4af", "#e11d48", "#fff"],
      });
    } catch {}

    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      {/* ─── Persistent Floating Trigger Button with Love.svg ─── */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setModalOpen(true)}
          whileHover={{ scale: 1.06, y: -3 }}
          whileTap={{ scale: 0.94 }}
          className="group relative flex items-center gap-3.5 px-5 py-3 rounded-full bg-white/95 backdrop-blur-2xl border-2 border-rose-300 shadow-[0_15px_40px_-5px_rgba(244,63,94,0.35)] hover:border-rose-400 hover:shadow-[0_20px_50px_-5px_rgba(244,63,94,0.45)] transition-all cursor-pointer"
          id="floating-vibe-check-btn"
        >
          {/* Animated Love.svg Widescreen Display */}
          <div className="w-16 h-8 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-50 flex items-center justify-center overflow-hidden border border-rose-200/90 shadow-xs">
            <Image
              src="/svgs/Love.svg"
              alt="Love Heart Hands"
              width={64}
              height={32}
              className="w-full h-full object-contain"
              unoptimized
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs sm:text-sm font-extrabold text-[#280816] group-hover:text-rose-600 transition-colors leading-tight">
              Vibe Check
            </span>
            <span className="text-[10px] font-bold text-rose-600 leading-none">
              Tonight&apos;s Mood ✨
            </span>
          </div>

          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1" />
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-1 -right-1" />
        </motion.button>
      </div>

      {/* ─── Interactive Quick Vibe Check Modal Box ─── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-[#280816]/45 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl rounded-3xl bg-white/98 backdrop-blur-2xl border border-rose-200 shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header with Love.svg */}
              <div className="flex items-center justify-between pb-5 border-b border-rose-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-20 sm:w-24 h-11 sm:h-12 rounded-2xl bg-gradient-to-tr from-rose-50 to-pink-50 flex items-center justify-center border border-rose-200 p-1 overflow-hidden shadow-xs">
                    <Image
                      src="/svgs/Love.svg"
                      alt="Love SVG"
                      width={90}
                      height={45}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#2a0818]">
                      Tonight&apos;s Vibe Studio
                    </h3>
                    <p className="text-xs text-[#78304f] font-medium">
                      Select a mood to preview and send date blueprints
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-700 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mood Choices */}
              <div className="py-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Available Vibe Modes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {VIBE_PRESETS.map((vibe) => {
                    const isSelected = selectedVibe.id === vibe.id;
                    return (
                      <button
                        key={vibe.id}
                        onClick={() => setSelectedVibe(vibe)}
                        className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-400 shadow-xs ring-2 ring-rose-400/50"
                            : "bg-white border-rose-100 hover:border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{vibe.emoji}</span>
                          {isSelected && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-[#2a0818] leading-tight">
                          {vibe.name}
                        </h4>
                        <span className="text-[10px] text-[#78304f] block mt-0.5">
                          {vibe.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Mood Blueprint Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-[#2a0818]">
                    {selectedVibe.dateTitle}
                  </h4>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {selectedVibe.time}
                  </span>
                </div>

                {/* Itinerary */}
                <div className="space-y-2">
                  {selectedVibe.itinerary.map((step, i) => (
                    <div key={i} className="text-xs sm:text-sm text-[#350b1d] font-medium flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Intimacy Question */}
                <div className="p-3.5 rounded-xl bg-white border border-rose-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                    Intimacy Spark Prompt
                  </span>
                  <p className="text-xs sm:text-sm italic text-[#2a0818] font-serif font-medium leading-relaxed">
                    &ldquo;{selectedVibe.intimacyQuestion}&rdquo;
                  </p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="mt-5 pt-4 border-t border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-[#78304f] font-medium text-center sm:text-left">
                  Copy this plan to share with your partner
                </span>
                <motion.button
                  onClick={handleSendToPartner}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto btn-love-primary text-xs sm:text-sm font-bold text-white px-7 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Plan copied!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Copy Plan for Your Partner</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
