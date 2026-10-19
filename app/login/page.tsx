import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import FloatingHearts from "@/components/FloatingHearts";
import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Welcome Back — Sign In to QubitSells",
  description: "Sign in to your private couple sanctuary on QubitSells. Check vibes, shared dates, and intimate memories.",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#fff5f7] via-[#fff0f4] to-[#ffeef2] text-[#280816] px-4 py-8 sm:py-12 overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Floating Ambient Hearts & Sparkles */}
      <FloatingHearts />

      {/* Top Floating Mini Header */}
      <div className="relative z-20 max-w-5xl mx-auto w-full flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-rose-200 text-xs font-bold text-rose-900 hover:bg-rose-50 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800/80">
          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
          <span>Private Couple Space</span>
        </div>
      </div>

      {/* Main Interactive Auth Studio */}
      <div className="relative z-20 w-full my-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            </div>
          }
        >
          <AuthForm initialMode="login" />
        </Suspense>
      </div>

      {/* Bottom Footer Note */}
      <footer className="relative z-20 text-center text-xs text-rose-800/60 pt-8">
        <p>© {new Date().getFullYear()} QubitSells. Designed with boundless love for couples worldwide.</p>
      </footer>
    </main>
  );
}
