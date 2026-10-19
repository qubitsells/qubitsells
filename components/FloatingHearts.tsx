"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  icon: string;
  opacity: number;
}

const ICONS = ["💗", "🌸", "✨", "🩷", "💫", "🌹", "💖"];

export default function FloatingHearts() {
  const reducedMotion = useReducedMotion();
  const particles: Particle[] = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      x: (i * 7.14) + Math.sin(i * 12.3) * 1.5,
      size: Math.floor(12 + (i % 4) * 4),
      duration: 12 + (i % 5) * 3,
      delay: (i * 0.8) % 6,
      icon: ICONS[i % ICONS.length],
      opacity: 0.18 + (i % 3) * 0.08,
    }));
  if (reducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: "105vh", x: `${p.x}vw`, opacity: 0, scale: 0.7 }}
          animate={{
            y: "-10vh",
            x: [`${p.x}vw`, `${p.x + (p.id % 2 === 0 ? 2.5 : -2.5)}vw`, `${p.x}vw`],
            opacity: [0, p.opacity, p.opacity, 0],
            scale: [0.7, 1.05, 0.95, 0.6],
            rotate: [0, p.id % 2 === 0 ? 20 : -20, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
          className="absolute select-none will-change-transform drop-shadow-xs"
          style={{ fontSize: `${p.size}px` }}
        >
          {p.icon}
        </motion.div>
      ))}
    </div>
  );
}
