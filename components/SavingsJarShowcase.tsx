"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PiggyBank, Plus, Coins } from "lucide-react";
import confetti from "canvas-confetti";

export default function SavingsJarShowcase() {
  const [savedAmount, setSavedAmount] = useState(3850);
  const targetAmount = 5000;
  const progressPercent = Math.min(Math.round((savedAmount / targetAmount) * 100), 100);

  const handleAddCoins = (amount: number) => {
    setSavedAmount((prev) => Math.min(prev + amount, targetAmount + 500));
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#fb7185", "#f43f5e", "#fda4af", "#e11d48", "#fff"],
      });
    } catch {}
  };

  return (
    <section className="relative py-18 sm:py-24 overflow-hidden bg-[#fff6f8]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Explainer */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2a0818] tracking-tight">
              The Couple <span className="font-script text-5xl sm:text-6xl text-gradient-script font-normal inline-block px-1.5 py-0.5">Savings Jar</span>
            </h2>

            <p className="text-sm text-[#5a2037] leading-relaxed">
              Dreaming of an Amalfi Coast escape, a cozy countryside cottage, or your dream wedding?
              QubitSells&apos;s upcoming Co-Saving Jar turns shared financial goals into an intimate visual celebration.
            </p>

            <div className="space-y-2 text-xs sm:text-sm text-[#350b1d] font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Micro-contributions matched with fun couple rewards</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Visual goal milestones with celebration alerts for both</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Zero hidden fees · Integrated directly with joint bank accounts</span>
              </div>
            </div>
          </div>

          {/* Right Interactive Jar Demo Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-[0_15px_40px_-10px_rgba(244,63,94,0.12)]">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-rose-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Active Co-Goal
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[#2a0818] mt-0.5">
                    Amalfi Coast Summer 2026 🍋
                  </h3>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                  {progressPercent}% Funded
                </span>
              </div>

              {/* Progress Bar */}
              <div className="py-5 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-[#2a0818]">
                    ${savedAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#78304f] font-semibold">
                    Target: ${targetAmount.toLocaleString()}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-rose-100 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-rose-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#78304f] font-medium pt-0.5">
                  <span>Example: $1,925 deposited</span>
                  <span>Sarah: $1,925 deposited</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3.5 border-t border-rose-100 flex flex-wrap gap-2 items-center justify-between">
                <span className="text-xs text-[#5a2037] font-semibold">Simulate Co-Drop:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddCoins(25)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> $25
                  </button>
                  <button
                    onClick={() => handleAddCoins(50)}
                    className="px-3.5 py-1.5 rounded-xl btn-love-primary text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3" /> +$50 Drop
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
