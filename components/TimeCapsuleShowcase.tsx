"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Hourglass, Lock, Unlock, FileText, Mic, Image as ImageIcon } from "lucide-react";
import confetti from "canvas-confetti";

export default function TimeCapsuleShowcase() {
  const [unlocked, setUnlocked] = useState(false);

  const handleToggleLock = () => {
    if (!unlocked) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#fb7185", "#f43f5e", "#fda4af", "#e11d48", "#fff"],
        });
      } catch {}
    }
    setUnlocked(!unlocked);
  };

  return (
    <section className="relative py-18 sm:py-24 overflow-hidden bg-[#fff8fa]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="rounded-3xl p-6 sm:p-10 bg-white/95 backdrop-blur-2xl border border-rose-200/90 shadow-[0_20px_50px_-15px_rgba(244,63,94,0.12)] relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Left Description */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2a0818] tracking-tight">
                The Digital <span className="font-script text-5xl sm:text-6xl text-gradient-script font-normal inline-block px-1.5 py-0.5">Time Capsule</span>
              </h2>

              <p className="text-sm text-[#5a2037] leading-relaxed">
                Seal secrets, vows, voice notes, and private photos inside an encrypted vault.
                Set the unlock timer for your next anniversary. Both partners must place
                their thumbs on the screen simultaneously to break the digital seal.
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                  <FileText className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                  <span className="text-xs text-[#2a0818] font-bold">Secret Letters</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                  <Mic className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                  <span className="text-xs text-[#2a0818] font-bold">Voice Notes</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                  <ImageIcon className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                  <span className="text-xs text-[#2a0818] font-bold">Hidden Photos</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="/time-capsule"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-love-primary text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>Enter Full Time Capsule Vault ✨</span>
                </a>
              </div>
            </div>

            {/* Right Vault Card */}
            <div className="lg:col-span-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/80 border border-rose-200 text-center space-y-3.5">
                
                <div className="flex items-center justify-between text-xs text-[#78304f] font-medium border-b border-rose-200/70 pb-2.5">
                  <span>Capsule #004: &quot;Our First Year in Tokyo&quot;</span>
                  <span className="text-rose-700 font-bold">Sealed: Oct 14, 2024</span>
                </div>

                <div className="py-4 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ scale: unlocked ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: 0.4 }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      unlocked
                        ? "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/25"
                        : "bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/25"
                    }`}
                  >
                    {unlocked ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
                  </motion.div>

                  <h4 className="text-base font-bold text-[#2a0818] mt-3">
                    {unlocked ? "✨ Capsule Seal Broken!" : "Locked Until 3rd Anniversary"}
                  </h4>
                  <p className="text-xs text-[#5a2037] mt-0.5 max-w-xs font-medium">
                    {unlocked
                      ? "12 photos, 2 voice letters, and 1 handwritten promise revealed."
                      : "Unlocks automatically on September 14, 2026."}
                  </p>
                </div>

                <motion.button
                  onClick={handleToggleLock}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                    unlocked
                      ? "bg-white text-rose-700 border border-rose-200"
                      : "btn-love-primary text-white"
                  }`}
                >
                  {unlocked ? "🔒 Re-Seal Digital Capsule" : "Simulate Thumbprint Unlock"}
                </motion.button>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
