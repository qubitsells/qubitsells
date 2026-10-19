"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Copy, Check, ArrowLeft } from "lucide-react";

/* ─────────────────────────────────────────────
   TEMPLATE CONFIG MAP
───────────────────────────────────────────── */
const GRADIENT_MAP: Record<string, { gradient: string; textColor: string; accentColor: string; emoji: string }> = {
  "birthday-favorite-person": { gradient: "from-rose-900 via-rose-800 to-pink-900", textColor: "#fff", accentColor: "#fda4af", emoji: "🎂" },
  "birthday-countdown": { gradient: "from-gray-950 via-slate-900 to-gray-950", textColor: "#fff", accentColor: "#f43f5e", emoji: "🎆" },
  "birthday-princess": { gradient: "from-purple-950 via-purple-900 to-rose-900", textColor: "#fff", accentColor: "#d4af37", emoji: "👑" },
  "birthday-love-letter": { gradient: "from-amber-50 via-orange-50 to-yellow-50", textColor: "#451a03", accentColor: "#d97706", emoji: "✉️" },
  "birthday-beautiful": { gradient: "from-pink-100 via-rose-50 to-fuchsia-100", textColor: "#831843", accentColor: "#f43f5e", emoji: "🌸" },
  "birthday-memories": { gradient: "from-amber-100 via-yellow-50 to-orange-100", textColor: "#431407", accentColor: "#ea580c", emoji: "📸" },
  "birthday-another-year": { gradient: "from-slate-50 via-gray-50 to-zinc-100", textColor: "#1e293b", accentColor: "#f43f5e", emoji: "📅" },
  "anniversary-love-story": { gradient: "from-rose-950 via-red-900 to-rose-900", textColor: "#fff", accentColor: "#fda4af", emoji: "📖" },
  "anniversary-another-year": { gradient: "from-neutral-900 via-stone-900 to-neutral-950", textColor: "#fff", accentColor: "#d4af37", emoji: "💍" },
  "anniversary-forever": { gradient: "from-yellow-950 via-stone-950 to-neutral-950", textColor: "#fff", accentColor: "#d4af37", emoji: "♾️" },
  "anniversary-envelope": { gradient: "from-rose-100 via-pink-100 to-fuchsia-100", textColor: "#831843", accentColor: "#f43f5e", emoji: "💌" },
  "anniversary-365": { gradient: "from-white via-rose-50 to-pink-50", textColor: "#881337", accentColor: "#f43f5e", emoji: "📆" },
  "anniversary-journey": { gradient: "from-slate-900 via-blue-950 to-slate-900", textColor: "#fff", accentColor: "#60a5fa", emoji: "🗺️" },
  "anniversary-then-now": { gradient: "from-amber-50 via-stone-50 to-yellow-50", textColor: "#292524", accentColor: "#d97706", emoji: "🖼️" },
  "valentine-bemy": { gradient: "from-red-50 via-rose-50 to-pink-100", textColor: "#9f1239", accentColor: "#f43f5e", emoji: "💝" },
  "valentine-forever": { gradient: "from-rose-900 via-red-800 to-rose-900", textColor: "#fff", accentColor: "#fda4af", emoji: "💕" },
  "valentine-reasons": { gradient: "from-pink-50 via-rose-100 to-fuchsia-50", textColor: "#831843", accentColor: "#e879f9", emoji: "🃏" },
  "valentine-love-is": { gradient: "from-neutral-950 via-rose-950 to-neutral-950", textColor: "#fff", accentColor: "#fda4af", emoji: "✍️" },
  "valentine-open-when": { gradient: "from-amber-100 via-yellow-50 to-orange-50", textColor: "#451a03", accentColor: "#d97706", emoji: "📩" },
  "valentine-letter": { gradient: "from-rose-50 via-amber-50 to-yellow-50", textColor: "#3b1224", accentColor: "#be123c", emoji: "🖊️" },
  "valentine-memories": { gradient: "from-pink-100 via-rose-50 to-red-100", textColor: "#7f1d1d", accentColor: "#f43f5e", emoji: "📷" },
  "morning-sunrise": { gradient: "from-indigo-900 via-purple-800 to-amber-400", textColor: "#fff", accentColor: "#fbbf24", emoji: "🌄" },
  "morning-my-love": { gradient: "from-orange-400 via-amber-300 to-yellow-200", textColor: "#431407", accentColor: "#ea580c", emoji: "🌅" },
  "morning-coffee": { gradient: "from-amber-100 via-orange-50 to-amber-50", textColor: "#431407", accentColor: "#b45309", emoji: "☕" },
  "morning-beautiful": { gradient: "from-pink-50 via-rose-50 to-purple-50", textColor: "#831843", accentColor: "#ec4899", emoji: "🌸" },
  "morning-reminder": { gradient: "from-slate-50 to-gray-100", textColor: "#1e293b", accentColor: "#f43f5e", emoji: "💭" },
  "morning-start-day": { gradient: "from-yellow-100 via-amber-50 to-orange-100", textColor: "#451a03", accentColor: "#f59e0b", emoji: "🎊" },
  "morning-letter": { gradient: "from-amber-50 via-yellow-50 to-stone-50", textColor: "#292524", accentColor: "#a16207", emoji: "📝" },
  "night-my-love": { gradient: "from-slate-950 via-indigo-950 to-slate-950", textColor: "#e2e8f0", accentColor: "#c4b5fd", emoji: "🌙" },
  "night-moonlight": { gradient: "from-indigo-950 via-blue-950 to-slate-950", textColor: "#e0f2fe", accentColor: "#bae6fd", emoji: "🌕" },
  "night-sweet-dreams": { gradient: "from-purple-950 via-violet-900 to-indigo-950", textColor: "#f3e8ff", accentColor: "#a78bfa", emoji: "⭐" },
  "night-wish-here": { gradient: "from-gray-900 to-slate-900", textColor: "#cbd5e1", accentColor: "#f43f5e", emoji: "🥺" },
  "night-before-sleep": { gradient: "from-neutral-900 via-stone-900 to-zinc-900", textColor: "#fafafa", accentColor: "#fda4af", emoji: "💬" },
  "night-last-message": { gradient: "from-amber-950 via-stone-900 to-amber-950", textColor: "#fef3c7", accentColor: "#fbbf24", emoji: "🕯️" },
  "night-heart": { gradient: "from-rose-950 via-pink-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "💓" },
  "missyou-i-miss": { gradient: "from-slate-100 to-gray-200", textColor: "#1e293b", accentColor: "#f43f5e", emoji: "💔" },
  "missyou-wish-here": { gradient: "from-blue-950 via-cyan-900 to-blue-950", textColor: "#e0f2fe", accentColor: "#38bdf8", emoji: "🌊" },
  "missyou-distance": { gradient: "from-slate-950 via-gray-900 to-slate-950", textColor: "#f1f5f9", accentColor: "#f43f5e", emoji: "🗺️" },
  "missyou-cant-wait": { gradient: "from-rose-50 via-pink-100 to-fuchsia-50", textColor: "#831843", accentColor: "#ec4899", emoji: "🤗" },
  "missyou-until-together": { gradient: "from-neutral-900 to-stone-950", textColor: "#fafafa", accentColor: "#fda4af", emoji: "🕊️" },
  "missyou-open-when": { gradient: "from-amber-50 via-yellow-50 to-stone-50", textColor: "#292524", accentColor: "#d97706", emoji: "📩" },
  "love-i-love-you": { gradient: "from-rose-950 via-red-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "❤️" },
  "love-everything": { gradient: "from-indigo-950 via-purple-950 to-blue-950", textColor: "#fff", accentColor: "#a78bfa", emoji: "🌌" },
  "love-my-person": { gradient: "from-rose-100 via-pink-100 to-fuchsia-100", textColor: "#831843", accentColor: "#f43f5e", emoji: "🫂" },
  "love-make-happy": { gradient: "from-yellow-100 via-amber-50 to-orange-100", textColor: "#451a03", accentColor: "#f59e0b", emoji: "😊" },
  "love-forever": { gradient: "from-neutral-950 via-yellow-950 to-stone-950", textColor: "#fff", accentColor: "#d4af37", emoji: "♾️" },
  "love-safe-place": { gradient: "from-stone-50 to-amber-50", textColor: "#292524", accentColor: "#d97706", emoji: "🏡" },
  "love-thank-you-being": { gradient: "from-rose-50 to-pink-100", textColor: "#881337", accentColor: "#f43f5e", emoji: "🌷" },
  "love-just-because": { gradient: "from-fuchsia-50 via-pink-50 to-rose-100", textColor: "#831843", accentColor: "#a855f7", emoji: "🎁" },
  "love-reminder": { gradient: "from-white to-rose-50", textColor: "#1e293b", accentColor: "#f43f5e", emoji: "💡" },
  "love-home": { gradient: "from-gray-950 via-rose-950 to-gray-950", textColor: "#fce7f3", accentColor: "#f43f5e", emoji: "🕯️" },
  "apology-sorry": { gradient: "from-slate-900 via-stone-900 to-gray-900", textColor: "#f1f5f9", accentColor: "#fda4af", emoji: "🙏" },
  "apology-start-again": { gradient: "from-gray-50 to-slate-100", textColor: "#1e293b", accentColor: "#3b82f6", emoji: "🔄" },
  "apology-didnt-mean": { gradient: "from-stone-100 via-amber-50 to-stone-100", textColor: "#292524", accentColor: "#78716c", emoji: "💧" },
  "apology-make-right": { gradient: "from-emerald-50 via-teal-50 to-green-50", textColor: "#064e3b", accentColor: "#10b981", emoji: "🤝" },
  "apology-miss-smile": { gradient: "from-rose-100 to-pink-100", textColor: "#881337", accentColor: "#f43f5e", emoji: "🥺" },
  "apology-from-heart": { gradient: "from-gray-900 via-rose-950 to-gray-900", textColor: "#fce7f3", accentColor: "#f43f5e", emoji: "💔" },
  "apology-one-chance": { gradient: "from-neutral-900 to-stone-900", textColor: "#f5f5f5", accentColor: "#d4af37", emoji: "🕊️" },
  "thanks-loving-me": { gradient: "from-rose-900 via-pink-900 to-rose-900", textColor: "#fff", accentColor: "#fda4af", emoji: "🙌" },
  "thanks-always-there": { gradient: "from-amber-50 to-yellow-100", textColor: "#451a03", accentColor: "#d97706", emoji: "🤗" },
  "thanks-lucky": { gradient: "from-green-50 via-emerald-50 to-teal-50", textColor: "#064e3b", accentColor: "#10b981", emoji: "🍀" },
  "thanks-better-life": { gradient: "from-neutral-900 via-amber-950 to-stone-900", textColor: "#fff", accentColor: "#d4af37", emoji: "⭐" },
  "thanks-choosing-me": { gradient: "from-yellow-950 via-amber-900 to-stone-950", textColor: "#fef3c7", accentColor: "#fbbf24", emoji: "💛" },
  "thanks-everything-you-do": { gradient: "from-stone-50 via-amber-50 to-yellow-50", textColor: "#292524", accentColor: "#a16207", emoji: "📜" },
  "thanks-little": { gradient: "from-pink-50 via-rose-50 to-fuchsia-50", textColor: "#831843", accentColor: "#ec4899", emoji: "🎀" },
  "milestone-first-date": { gradient: "from-rose-950 via-red-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "🍽️" },
  "milestone-first-love": { gradient: "from-neutral-900 via-rose-950 to-stone-900", textColor: "#fff", accentColor: "#fda4af", emoji: "💬" },
  "milestone-first-kiss": { gradient: "from-rose-100 via-pink-100 to-red-100", textColor: "#881337", accentColor: "#f43f5e", emoji: "💋" },
  "milestone-100days": { gradient: "from-pink-50 via-rose-100 to-fuchsia-50", textColor: "#831843", accentColor: "#ec4899", emoji: "💯" },
  "milestone-6months": { gradient: "from-purple-950 via-violet-900 to-indigo-950", textColor: "#f3e8ff", accentColor: "#a78bfa", emoji: "🌙" },
  "milestone-1year": { gradient: "from-yellow-950 via-amber-900 to-stone-950", textColor: "#fef3c7", accentColor: "#d4af37", emoji: "🏆" },
  "milestone-2years": { gradient: "from-rose-950 via-pink-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "✨" },
  "milestone-first-trip": { gradient: "from-sky-100 via-blue-50 to-cyan-100", textColor: "#0c4a6e", accentColor: "#0ea5e9", emoji: "✈️" },
  "milestone-we-met": { gradient: "from-amber-50 via-stone-50 to-yellow-50", textColor: "#292524", accentColor: "#b45309", emoji: "📅" },
  "milestone-became-us": { gradient: "from-gray-950 via-rose-950 to-gray-950", textColor: "#fce7f3", accentColor: "#f43f5e", emoji: "🌹" },
  "ld-miles-apart": { gradient: "from-slate-950 via-blue-950 to-slate-950", textColor: "#e2e8f0", accentColor: "#60a5fa", emoji: "🌍" },
  "ld-until-see": { gradient: "from-gray-50 to-slate-100", textColor: "#1e293b", accentColor: "#f43f5e", emoji: "⏳" },
  "ld-distance-story": { gradient: "from-neutral-900 to-stone-900", textColor: "#fafafa", accentColor: "#fda4af", emoji: "📖" },
  "ld-counting-down": { gradient: "from-rose-50 via-pink-100 to-fuchsia-50", textColor: "#831843", accentColor: "#ec4899", emoji: "📆" },
  "ld-across-miles": { gradient: "from-gray-950 via-indigo-950 to-gray-950", textColor: "#e0e7ff", accentColor: "#a78bfa", emoji: "🌃" },
  "ld-no-distance": { gradient: "from-yellow-950 via-stone-950 to-amber-950", textColor: "#fef3c7", accentColor: "#d4af37", emoji: "💎" },
  "ld-next-visit": { gradient: "from-sky-950 via-blue-900 to-cyan-950", textColor: "#e0f2fe", accentColor: "#38bdf8", emoji: "🛫" },
  "proposal-will-you": { gradient: "from-yellow-950 via-amber-900 to-stone-950", textColor: "#fef3c7", accentColor: "#d4af37", emoji: "💍" },
  "proposal-forever-starts": { gradient: "from-rose-950 via-pink-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "✨" },
  "proposal-future-wife": { gradient: "from-neutral-900 via-rose-950 to-stone-900", textColor: "#fff", accentColor: "#fda4af", emoji: "👰" },
  "proposal-future-husband": { gradient: "from-slate-900 via-gray-900 to-neutral-900", textColor: "#f1f5f9", accentColor: "#d4af37", emoji: "🤵" },
  "proposal-beginning": { gradient: "from-indigo-950 via-purple-950 to-blue-950", textColor: "#e0e7ff", accentColor: "#a78bfa", emoji: "🌌" },
  "proposal-next-chapter": { gradient: "from-amber-100 via-stone-100 to-yellow-50", textColor: "#292524", accentColor: "#b45309", emoji: "📚" },
  "proposal-she-said-yes": { gradient: "from-rose-100 via-pink-100 to-fuchsia-100", textColor: "#831843", accentColor: "#ec4899", emoji: "🎊" },
  "proposal-he-said-yes": { gradient: "from-blue-950 via-indigo-900 to-slate-950", textColor: "#e0e7ff", accentColor: "#60a5fa", emoji: "💍" },
  "wedding-our-day": { gradient: "from-yellow-50 via-amber-50 to-white", textColor: "#451a03", accentColor: "#d4af37", emoji: "👰" },
  "wedding-we-said-i-do": { gradient: "from-stone-50 via-rose-50 to-amber-50", textColor: "#292524", accentColor: "#f43f5e", emoji: "💒" },
  "wedding-forever-begins": { gradient: "from-rose-100 via-pink-100 to-white", textColor: "#881337", accentColor: "#f43f5e", emoji: "🕊️" },
  "wedding-two-hearts": { gradient: "from-rose-950 via-red-900 to-rose-950", textColor: "#fff", accentColor: "#fda4af", emoji: "💑" },
  "wedding-special-day": { gradient: "from-amber-50 via-rose-50 to-pink-50", textColor: "#292524", accentColor: "#f43f5e", emoji: "📸" },
  "wedding-mr-mrs": { gradient: "from-neutral-950 via-amber-950 to-stone-950", textColor: "#fff", accentColor: "#d4af37", emoji: "💍" },
  "wedding-new-chapter": { gradient: "from-stone-100 via-amber-50 to-yellow-50", textColor: "#1c1917", accentColor: "#b45309", emoji: "📖" },
  "festival-eid": { gradient: "from-emerald-950 via-teal-900 to-green-950", textColor: "#d1fae5", accentColor: "#34d399", emoji: "🌙" },
  "festival-eid-gift": { gradient: "from-emerald-50 via-teal-50 to-green-50", textColor: "#064e3b", accentColor: "#10b981", emoji: "🎁" },
  "festival-ramadan": { gradient: "from-green-950 via-emerald-900 to-teal-950", textColor: "#ecfdf5", accentColor: "#6ee7b7", emoji: "☪️" },
  "festival-christmas": { gradient: "from-red-900 via-green-900 to-red-900", textColor: "#fff", accentColor: "#fbbf24", emoji: "🎄" },
  "festival-new-year": { gradient: "from-indigo-950 via-purple-900 to-blue-950", textColor: "#e0e7ff", accentColor: "#818cf8", emoji: "🎆" },
  "festival-womens-day": { gradient: "from-purple-900 via-pink-900 to-rose-900", textColor: "#fdf4ff", accentColor: "#f0abfc", emoji: "🌸" },
  "festival-mens-day": { gradient: "from-blue-950 via-indigo-900 to-slate-950", textColor: "#dbeafe", accentColor: "#60a5fa", emoji: "💙" },
  "festival-mothers-day": { gradient: "from-rose-100 via-pink-100 to-fuchsia-100", textColor: "#831843", accentColor: "#f43f5e", emoji: "🌷" },
  "festival-fathers-day": { gradient: "from-amber-950 via-stone-900 to-amber-950", textColor: "#fef3c7", accentColor: "#d97706", emoji: "👨‍👧" },
  "festival-birthday-general": { gradient: "from-pink-100 via-purple-100 to-blue-100", textColor: "#4a044e", accentColor: "#a855f7", emoji: "🎈" },
  "fun-more-in-love": { gradient: "from-pink-50 via-rose-100 to-fuchsia-50", textColor: "#831843", accentColor: "#ec4899", emoji: "🤔" },
  "fun-quiz": { gradient: "from-violet-50 via-purple-100 to-fuchsia-50", textColor: "#4c1d95", accentColor: "#a855f7", emoji: "🧠" },
  "fun-10-things": { gradient: "from-yellow-50 via-amber-50 to-orange-50", textColor: "#451a03", accentColor: "#f59e0b", emoji: "📋" },
  "fun-bingo": { gradient: "from-green-50 via-emerald-100 to-teal-50", textColor: "#064e3b", accentColor: "#10b981", emoji: "🎯" },
  "fun-this-or-that": { gradient: "from-orange-50 via-amber-100 to-yellow-50", textColor: "#451a03", accentColor: "#f97316", emoji: "🆚" },
  "fun-inside-jokes": { gradient: "from-amber-100 via-yellow-50 to-lime-50", textColor: "#1a2e05", accentColor: "#65a30d", emoji: "😂" },
  "fun-who-said-first": { gradient: "from-pink-50 via-rose-50 to-red-50", textColor: "#7f1d1d", accentColor: "#dc2626", emoji: "🗣️" },
  "fun-couple-stats": { gradient: "from-slate-50 to-gray-100", textColor: "#0f172a", accentColor: "#f43f5e", emoji: "📊" },
  "fun-relationship-wrapped": { gradient: "from-gray-950 via-green-950 to-gray-950", textColor: "#fff", accentColor: "#22c55e", emoji: "🎵" },
  "fun-love-wrapped": { gradient: "from-neutral-950 via-rose-950 to-neutral-950", textColor: "#fce7f3", accentColor: "#f43f5e", emoji: "🎁" },
};

const DEFAULT_TEMPLATE = {
  gradient: "from-rose-950 via-red-900 to-rose-950",
  textColor: "#fff",
  accentColor: "#fda4af",
  emoji: "❤️",
};

/* ── Floating particle ── */
function FloatingParticle({ color, delay, index }: { color: string; delay: number; index: number }) {
  const x = (index * 8.3) % 100;
  const duration = 5 + (index % 4);
  const size = 4 + (index % 6);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        bottom: "-20px",
        width: size,
        height: size,
        backgroundColor: color,
        opacity: 0.5,
      }}
      animate={{ y: [0, -700], opacity: [0, 0.6, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ── Typewriter ── */
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

/* ── Envelope reveal ── */
function EnvelopeReveal({ onComplete, accentColor, textColor }: { onComplete: () => void; accentColor: string; textColor: string }) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"), 1200);
    const t2 = setTimeout(() => { setPhase("open"); onComplete(); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <motion.div
        className="relative w-52 h-36"
        animate={phase === "opening" ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 0.6 }}
      >
        {/* Envelope body */}
        <div
          className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: `${accentColor}25`, border: `2px solid ${accentColor}50` }}
        />

        {/* Bottom fold triangles */}
        <div className="absolute bottom-0 left-0 right-0 h-full overflow-hidden rounded-2xl pointer-events-none">
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              borderLeft: "104px solid transparent",
              borderRight: "0px solid transparent",
              borderBottom: `72px solid ${accentColor}35`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              borderRight: "104px solid transparent",
              borderLeft: "0px solid transparent",
              borderBottom: `72px solid ${accentColor}30`,
            }}
          />
        </div>

        {/* Flap */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-20 origin-top overflow-hidden rounded-t-2xl"
          animate={
            phase === "opening" || phase === "open"
              ? { rotateX: 180, opacity: 0.6 }
              : { rotateX: 0, opacity: 1 }
          }
          style={{ transformStyle: "preserve-3d" }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              borderLeft: "104px solid transparent",
              borderRight: "104px solid transparent",
              borderTop: `80px solid ${accentColor}55`,
            }}
          />
        </motion.div>

        {/* Heart inside */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center mt-4"
          animate={phase === "open" ? { scale: [0, 1.3, 1], opacity: [0, 1] } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Heart className="w-12 h-12 fill-current" style={{ color: accentColor }} />
        </motion.div>

        {/* Wax seal */}
        {phase === "closed" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xl z-10"
            style={{ backgroundColor: accentColor }}
          >
            ♥
          </motion.div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "closed" ? 0.7 : 0 }}
        className="text-sm font-medium"
        style={{ color: textColor }}
      >
        ✉️ Opening your letter...
      </motion.p>
    </div>
  );
}

/* ── Relationship Wrapped Card ── */
function RelationshipWrapped({ to, from, textColor, accentColor }: { to: string; from: string; textColor: string; accentColor: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 400); return () => clearTimeout(t); }, []);

  const stats = [
    { label: "Dates", value: "47" },
    { label: "Movie nights", value: "93" },
    { label: "'I love you's", value: "1,247+" },
    { label: "Moments I smiled because of you", value: "∞" },
    { label: "Reasons to love you", value: "∞" },
  ];

  return (
    <div className="space-y-5 w-full max-w-sm mx-auto">
      <div className="text-center space-y-1">
        <p className="text-[10px] font-bold tracking-widest uppercase opacity-50" style={{ color: textColor }}>
          OUR LOVE — {new Date().getFullYear()}
        </p>
        <h2 className="font-serif text-2xl font-bold" style={{ color: textColor }}>
          {to} & {from}
        </h2>
      </div>

      <div className="space-y-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -24 }}
            animate={show ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.18 }}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-xs font-medium opacity-75" style={{ color: textColor }}>
              {stat.label}
            </span>
            <span className="text-lg font-bold" style={{ color: accentColor }}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : {}}
        transition={{ delay: 1.2 }}
        className="p-4 rounded-2xl text-center"
        style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
      >
        <p className="font-serif text-sm italic leading-relaxed" style={{ color: textColor }}>
          &ldquo;And one person I would choose again. And again. And again.&rdquo;
        </p>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function LoveRecipientPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const wishCode = searchParams.get("wish");
  const [storedWish, setStoredWish] = useState<Record<string, string> | null>(null);
  const [wishError, setWishError] = useState<string | null>(null);
  useEffect(() => {
    if (!wishCode) return;
    const controller = new AbortController();
    fetch(`/api/wishes/${encodeURIComponent(wishCode)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => setStoredWish(data.wish))
      .catch(error => { if (error.name !== "AbortError") setWishError("This wish could not be opened. Please check the link or try again."); });
    return () => controller.abort();
  }, [wishCode]);
  const field = (name: string) => wishCode ? storedWish?.[name] : searchParams.get(name);

  const to = field("to") || "My Love";
  const from = field("from") || "Your Love";
  const message = field("msg") || "I love you more than words can say.";
  const memory = field("memory") || "";
  const distance = field("distance") || "";
  const days = field("days") || "";

  // Get slug from pathname
  const slug = pathname?.split("/love/")[1]?.split("?")[0] || "";
  const templateConfig = GRADIENT_MAP[slug] || DEFAULT_TEMPLATE;
  const isWrapped = slug.includes("wrapped");

  type Phase = "intro" | "envelope" | "reveal" | "message" | "final";
  const [phase, setPhase] = useState<Phase>("intro");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("envelope"), 3200);
    return () => clearTimeout(t);
  }, []);

  const handleEnvelopeComplete = useCallback(() => {
    setTimeout(() => setPhase("reveal"), 700);
  }, []);

  useEffect(() => {
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("message"), 3800);
      return () => clearTimeout(t);
    }
    if (phase === "message") {
      const t = setTimeout(() => setPhase("final"), 7000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const tc = templateConfig;
  if (wishCode && !storedWish) return <div className="min-h-screen flex items-center justify-center bg-rose-950 text-rose-100">{wishError || "Opening your wish..."}</div>;

  return (
    <div className={`relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br ${tc.gradient}`}>
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <FloatingParticle key={i} color={tc.accentColor} delay={i * 0.6} index={i} />
        ))}
      </div>

      {/* Back nav */}
      <div className="absolute top-5 left-5 z-20">
        <a
          href="/wishes"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", color: tc.textColor, backdropFilter: "blur(10px)" }}
        >
          <ArrowLeft className="w-3 h-3" />
          Wishes
        </a>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 min-h-screen">
        <AnimatePresence mode="wait">

          {/* INTRO */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-7 max-w-sm"
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 180, delay: 0.2 }}
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl shadow-2xl"
                style={{ backgroundColor: `${tc.accentColor}30`, border: `2px solid ${tc.accentColor}40` }}
              >
                {tc.emoji}
              </motion.div>

              <div className="space-y-3">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs font-bold tracking-widest uppercase opacity-60"
                  style={{ color: tc.textColor }}
                >
                  {from} made something for you
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="font-serif text-4xl sm:text-5xl font-bold"
                  style={{ color: tc.textColor }}
                >
                  <Typewriter text={to + ","} delay={0.9} />
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="text-base opacity-75"
                  style={{ color: tc.textColor }}
                >
                  I made something for you... 💕
                </motion.p>
              </div>

              {/* Pulse dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 2.6, duration: 1.5, repeat: Infinity }}
                className="flex justify-center gap-1"
              >
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, delay: d, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: tc.accentColor }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ENVELOPE */}
          {phase === "envelope" && (
            <motion.div
              key="envelope"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center w-full max-w-sm space-y-2"
            >
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium opacity-65 mb-8"
                style={{ color: tc.textColor }}
              >
                I wrote this just for you ✍️
              </motion.p>
              <EnvelopeReveal
                onComplete={handleEnvelopeComplete}
                accentColor={tc.accentColor}
                textColor={tc.textColor}
              />
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6 max-w-md w-full"
            >
              {memory && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: `${tc.accentColor}22`, color: tc.textColor }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: tc.accentColor }} />
                  <span>Do you remember... {memory}?</span>
                </motion.div>
              )}

              {distance && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-6xl font-bold" style={{ color: tc.accentColor }}>
                    {distance} km
                  </p>
                  <p className="text-sm opacity-65" style={{ color: tc.textColor }}>
                    between us — but you&apos;re always in my heart
                  </p>
                </motion.div>
              )}

              {days && !distance && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-7xl font-bold" style={{ color: tc.accentColor }}>
                    {days}
                  </p>
                  <p className="text-sm opacity-65" style={{ color: tc.textColor }}>
                    days until I hold you again
                  </p>
                </motion.div>
              )}

              {!memory && !distance && !days && (
                <motion.div
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-7xl"
                >
                  {tc.emoji}
                </motion.div>
              )}

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="font-serif text-2xl font-bold"
                style={{ color: tc.textColor }}
              >
                <Typewriter text={to + "..."} delay={0.8} />
              </motion.h2>
            </motion.div>
          )}

          {/* MESSAGE */}
          {phase === "message" && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="w-full max-w-md space-y-5"
            >
              {isWrapped ? (
                <RelationshipWrapped
                  to={to}
                  from={from}
                  textColor={tc.textColor}
                  accentColor={tc.accentColor}
                />
              ) : (
                <>
                  {/* Letter card */}
                  <div
                    className="rounded-3xl p-6 shadow-2xl space-y-4"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.12)",
                      backdropFilter: "blur(24px)",
                      border: `1px solid ${tc.accentColor}30`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 fill-current" style={{ color: tc.accentColor }} />
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-60" style={{ color: tc.textColor }}>
                        A letter for {to}
                      </span>
                    </div>

                    <p
                      className="font-serif text-lg sm:text-xl leading-relaxed italic"
                      style={{ color: tc.textColor }}
                    >
                      &ldquo;
                      <Typewriter text={message} delay={0.4} />
                      &rdquo;
                    </p>

                    {memory && (
                      <div
                        className="pt-3 border-t text-sm opacity-65"
                        style={{ borderColor: `${tc.accentColor}35`, color: tc.textColor }}
                      >
                        📍 {memory}
                      </div>
                    )}

                    <p
                      className="text-right text-xl font-script opacity-80"
                      style={{ color: tc.accentColor }}
                    >
                      — {from} ♥
                    </p>
                  </div>

                  {/* Floating hearts */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex justify-center gap-4"
                  >
                    {["❤️", "💕", "✨", "💕", "❤️"].map((h, i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2.2, delay: i * 0.22, repeat: Infinity, ease: "easeInOut" }}
                        className="text-xl"
                      >
                        {h}
                      </motion.span>
                    ))}
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {/* FINAL */}
          {phase === "final" && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md space-y-8 text-center"
            >
              {/* Beating heart */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex justify-center"
              >
                <Heart
                  className="w-24 h-24 fill-current drop-shadow-2xl"
                  style={{ color: tc.accentColor }}
                />
              </motion.div>

              <div className="space-y-3">
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-serif text-3xl sm:text-4xl font-bold leading-snug"
                  style={{ color: tc.textColor }}
                >
                  I would choose you
                  <br />
                  in every lifetime.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm opacity-65 font-medium"
                  style={{ color: tc.textColor }}
                >
                  With all my love — {from} ♥
                </motion.p>
              </div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)", color: tc.textColor, backdropFilter: "blur(8px)" }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href="/wishes"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  style={{ backgroundColor: tc.accentColor, color: "#fff" }}
                >
                  <Sparkles className="w-4 h-4" />
                  Create Your Own Wish
                </a>
              </motion.div>

              {/* Reply prompt */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="pt-4 border-t space-y-2"
                style={{ borderColor: `${tc.accentColor}30` }}
              >
                <p className="text-xs opacity-45" style={{ color: tc.textColor }}>
                  Want to send one back? ✨
                </p>
                <a
                  href="/wishes"
                  className="text-xs font-bold underline underline-offset-2 hover:opacity-75 transition-opacity"
                  style={{ color: tc.accentColor }}
                >
                  Browse 100+ romantic templates →
                </a>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Skip btn */}
        {(phase === "intro" || phase === "envelope" || phase === "reveal") && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            onClick={() => setPhase("final")}
            className="fixed bottom-8 right-6 text-xs opacity-35 hover:opacity-60 transition-opacity cursor-pointer"
            style={{ color: tc.textColor }}
          >
            Skip →
          </motion.button>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        <Heart className="w-2.5 h-2.5 fill-current opacity-35" style={{ color: tc.accentColor }} />
        <span className="text-[10px] opacity-35 font-medium" style={{ color: tc.textColor }}>
          Made with QubitSells Wishes
        </span>
        <Heart className="w-2.5 h-2.5 fill-current opacity-35" style={{ color: tc.accentColor }} />
      </div>
    </div>
  );
}
