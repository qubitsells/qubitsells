"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShieldCheck, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";

export default function CTASection() {
  const router = useRouter();
  const { coupleCode } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const handlePairInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail) return;
    if (!coupleCode) { router.push("/login?redirect=/couple-space/profile"); return; }
    const invitation = `${window.location.origin}/signup?code=${encodeURIComponent(coupleCode)}`;
    window.location.assign(`mailto:${encodeURIComponent(partnerEmail)}?subject=${encodeURIComponent("Join our QubitSells space")}&body=${encodeURIComponent(`Join our shared couple space: ${invitation}`)}`);
    setInvited(true);
    try {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#fb7185", "#f43f5e", "#fda4af", "#e11d48", "#fff"],
      });
    } catch {}
  };

  return (
    <section id="cta" className="relative py-20 sm:py-28 overflow-hidden bg-[#fff6f8]">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="rounded-3xl p-8 sm:p-12 bg-white/95 backdrop-blur-2xl border border-rose-200/90 text-center shadow-[0_20px_60px_-15px_rgba(244,63,94,0.16)]">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#2a0818] tracking-tight leading-tight">
            Ready to Deepen Your <br className="hidden sm:inline" />
            <span className="font-script text-5xl sm:text-6xl md:text-7xl text-gradient-script font-normal inline-block pt-1.5 pb-1 px-2">Love Story?</span>
          </h2>

          <p className="mt-3 text-sm sm:text-base text-[#5a2037] max-w-lg mx-auto leading-relaxed font-medium">
            Invite your partner in seconds. Get instant access to the Vibe Check generator,
            shared dates calendar, and digital time capsule today.
          </p>

          {/* Instant Invite Form */}
          <form onSubmit={handlePairInvite} className="mt-7 max-w-md mx-auto">
            {invited ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl bg-rose-100 border border-rose-300 text-rose-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs"
              >
                <Check className="w-4 h-4 text-rose-600" />
                <span>Your invitation draft is ready for {partnerEmail}. Send it from your email app.</span>
              </motion.div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-xs">
                <input
                  type="email"
                  required
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="Enter partner's email..."
                  className="px-4 py-2.5 bg-transparent text-sm text-[#2a0818] placeholder:text-[#914763] focus:outline-none flex-1 font-medium"
                />
                <button
                  type="submit"
                  className="btn-love-primary text-xs sm:text-sm font-bold text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Pair Us Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>

          {/* Safeguards */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-y-1.5 gap-x-5 text-xs text-[#78304f] font-semibold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>Zero Ads · Private Couple Spaces</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-rose-300" />
            <span>Free Forever Starter Plan</span>
            <span className="w-1 h-1 rounded-full bg-rose-300" />
            <span>iOS, Android & Web</span>
          </div>

        </div>

      </div>
    </section>
  );
}
