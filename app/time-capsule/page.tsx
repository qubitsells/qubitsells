import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Hourglass, Sparkles } from "lucide-react";
import CapsuleWorkspace from "@/components/CapsuleWorkspace";
import FloatingHearts from "@/components/FloatingHearts";

export const metadata: Metadata = {
  title: "Digital Time Capsule — QubitSells Couple Sanctuary",
  description:
    "Seal vows, intimate voice notes, retro polaroids, and future predictions in an encrypted time capsule. Locked securely until your next anniversary.",
};

export default function TimeCapsulePage() {
  return (
    <main className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#fff6f8] via-[#fff1f5] to-[#ffeef3] text-[#280816] px-4 py-6 sm:py-10 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Ambient Floating Hearts & Sparkles */}
      <FloatingHearts />

      {/* Top Header Navigation Bar */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-rose-200 text-xs font-bold text-rose-900 hover:bg-rose-50 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Sanctuary</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800/80 bg-white/60 px-3 py-1 rounded-full border border-rose-200/50">
          <Hourglass className="w-3.5 h-3.5 text-rose-500 animate-spin" />
          <span>Private Couple Vault</span>
        </div>
      </div>

      {/* Main Interactive Time Capsule Studio */}
      <div className="w-full my-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[450px]">
              <div className="w-10 h-10 rounded-full border-3 border-rose-500 border-t-transparent animate-spin" />
            </div>
          }
        >
          <CapsuleWorkspace />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-rose-800/60 pt-8 pb-4">
        <p>© {new Date().getFullYear()} QubitSells Digital Time Capsule. Your memories are stored privately and cherished.</p>
      </footer>
    </main>
  );
}
