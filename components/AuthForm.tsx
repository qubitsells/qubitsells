"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Flame,
  Stars,
  ShieldCheck,
  Loader2,
  Gift,
} from "lucide-react";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/security/validation";

interface AuthFormProps {
  initialMode?: "login" | "signup";
}

const LOVE_QUOTES = [
  {
    quote: "In all the world, there is no heart for me like yours.",
    author: "Maya Angelou",
    mood: "✨ 100% Soulmate Connection",
  },
  {
    quote: "Whatever our souls are made of, his and mine are the same.",
    author: "Emily Brontë",
    mood: "💖 Endless Devotion",
  },
  {
    quote: "I look at you and see the rest of my life in front of my eyes.",
    author: "Unknown",
    mood: "🌹 Pure Romance",
  },
  {
    quote: "You are my today and all of my tomorrows.",
    author: "Leo Christopher",
    mood: "🥂 Deep Intimacy",
  },
];

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams?.get("code") || "";
  const redirectTo = safeRedirect(searchParams?.get("redirect"), inviteCode ? `/profile?code=${encodeURIComponent(inviteCode)}` : "/");

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [authMethod, setAuthMethod] = useState<"password" | "magic_link">("password");
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [coupleCode, setCoupleCode] = useState(inviteCode);
  const [hasPartnerCode, setHasPartnerCode] = useState(!!inviteCode);
  const [rememberMe, setRememberMe] = useState(true);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(() => searchParams?.get("error") ? { type: "error", text: searchParams.get("error")! } : null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const supabase = createClient();

  // Cycle romantic quotes every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LOVE_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMessage({
          type: "info",
          text: `You are already signed in as ${user.email}! Redirecting to sanctuary...`,
        });
        setTimeout(() => {
          router.push(redirectTo);
        }, 1000);
      }
    };
    checkSession();
  }, [supabase, router, redirectTo]);


  // Calculate playful password strength
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: "", color: "bg-rose-200" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, text: "Faint Spark ✨", color: "bg-amber-400" };
    if (score === 2) return { level: 2, text: "Sweet Romance 💖", color: "bg-pink-500" };
    if (score >= 3) return { level: 3, text: "Unbreakable Connection 🔐💝", color: "bg-rose-600" };
    return { level: 1, text: "Sparks flying...", color: "bg-rose-400" };
  };

  const triggerLoveConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f43f5e", "#fda4af", "#be123c", "#fce7f3", "#fff", "#fb7185"],
      });
    } catch {}
  };
  const savePersistencePreference = () => {
    document.cookie = `bonded_remember_session=${rememberMe ? "1" : "0"}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  };

  // Handle email/password or magic link authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    savePersistencePreference();
    const destination = hasPartnerCode && coupleCode.trim() ? `/profile?code=${encodeURIComponent(coupleCode.trim())}` : redirectTo;

    try {
      if (authMethod === "magic_link") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          },
        });

        if (error) throw error;

        setMessage({
          type: "success",
          text: `💌 A magic love link was sent to ${email}! Click it to instantly enter your shared space.`,
        });
        triggerLoveConfetti();
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          triggerLoveConfetti();
          setMessage({
            type: "success",
            text: "Welcome back, lover! Opening your sanctuary...",
          });
          setTimeout(() => {
            router.push(destination);
            router.refresh();
          }, 1200);
        }
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              partner_nickname: partnerNickname,
              anniversary_date: anniversaryDate,
              couple_code: coupleCode || undefined,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          },
        });

        if (error) throw error;

        triggerLoveConfetti();

        if (data.user && !data.session) {
          setMessage({
            type: "info",
            text: `🎉 Beautiful! We sent a confirmation email to ${email}. Please confirm to seal your couple space.`,
          });
        } else {
          setMessage({
            type: "success",
            text: "💖 Your romantic haven is ready! Entering QubitSells...",
          });
          setTimeout(() => {
            router.push(destination);
            router.refresh();
          }, 1400);
        }
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err instanceof Error ? err.message : "Please try again.") || "Oops, couldn't connect. Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleAuth = async () => {
    try {
      setSocialLoading(true);
      savePersistencePreference();
      setMessage(null);
      const destination = hasPartnerCode && coupleCode.trim() ? `/profile?code=${encodeURIComponent(coupleCode.trim())}` : redirectTo;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err instanceof Error ? err.message : "Please try again.") || "Google sign-in could not be completed.",
      });
      setSocialLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      
      {/* ─── LEFT: Romantic Interactive Showcase & Live Quote Banner (Desktop) ─── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:col-span-5 flex-col gap-6"
      >
        {/* Brand Header */}
        <div className="space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/25 text-white"
            >
              <Heart className="w-5 h-5 fill-white text-white" />
            </motion.div>
            <span className="font-script text-4xl text-gradient-script font-bold tracking-wide">
              QubitSells
            </span>
          </Link>
          <p className="text-sm text-[#63223c] font-medium leading-relaxed">
            The private, encrypted sanctuary for modern romance, shared countdowns, and intimate dates.
          </p>
        </div>

        {/* Dynamic Romantic Quote & Mood Card */}
        <div className="relative rounded-3xl p-6 bg-gradient-to-br from-white/95 via-rose-50/70 to-pink-50/60 backdrop-blur-xl border border-rose-200/80 shadow-[0_15px_35px_-10px_rgba(244,63,94,0.15)] overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/30 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-semibold border border-rose-200/60 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Daily Couple Aura
            </span>
            <span className="text-xs font-bold text-rose-600/80">
              {LOVE_QUOTES[quoteIndex].mood}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="space-y-2 min-h-[110px] flex flex-col justify-center"
            >
              <p className="font-serif italic text-base sm:text-lg text-[#3b1222] leading-relaxed">
                &quot;{LOVE_QUOTES[quoteIndex].quote}&quot;
              </p>
              <p className="text-xs font-semibold text-rose-700">
                — {LOVE_QUOTES[quoteIndex].author}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots progress indicator */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-rose-100">
            {LOVE_QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => setQuoteIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === quoteIndex ? "w-6 bg-rose-500" : "w-1.5 bg-rose-200"
                }`}
                aria-label={`Go to quote ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Feature Highlights Pill Box */}
        <div className="rounded-2xl p-5 bg-white/70 backdrop-blur-md border border-rose-200/50 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            What awaits inside your love hub:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-[#4a182c]">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/50">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Vibe Check Generator</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/50">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              <span>Shared Dates Calendar</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/50">
              <Gift className="w-3.5 h-3.5 text-rose-500" />
              <span>Time Capsule & Jars</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/50">
              <Stars className="w-3.5 h-3.5 text-rose-500" />
              <span>Love Heat Map Log</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── RIGHT: Main Romantic Glassmorphism Auth Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="lg:col-span-7"
      >
        <div className="relative rounded-3xl p-6 sm:p-10 bg-white/95 backdrop-blur-2xl border border-rose-200/90 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.18)]">
          
          {/* Subtle Romantic Top Accent Line */}
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-rose-400 to-transparent rounded-full opacity-80" />

          {/* Header Mobile Brand */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
              <Heart className="w-4 h-4 fill-white text-white" />
            </div>
            <span className="font-script text-3xl text-gradient-script font-bold">QubitSells</span>
          </div>

          {/* Form Mode Selector Tabs (Sign In vs Sign Up) */}
          <div className="flex p-1 rounded-2xl bg-rose-100/70 border border-rose-200/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "login"
                  ? "bg-white text-rose-900 shadow-sm border border-rose-200/80"
                  : "text-[#68243e] hover:text-rose-900 hover:bg-rose-50/50"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${mode === "login" ? "text-rose-500 fill-rose-500" : "text-rose-400"}`} />
              <span>Welcome Back</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "signup"
                  ? "bg-white text-rose-900 shadow-sm border border-rose-200/80"
                  : "text-[#68243e] hover:text-rose-900 hover:bg-rose-50/50"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${mode === "signup" ? "text-rose-500 fill-rose-500" : "text-rose-400"}`} />
              <span>Create Couple Space</span>
            </button>
          </div>

          {/* Subtitle / Romantic Greeting */}
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#290817] tracking-tight">
              {mode === "login" ? (
                <>
                  Enter Your <span className="font-script text-4xl text-gradient-script font-normal">Sanctuary</span>
                </>
              ) : (
                <>
                  Begin Your <span className="font-script text-4xl text-gradient-script font-normal">Love Story</span>
                </>
              )}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#5d2138] font-medium">
              {mode === "login"
                ? "Sign in to view your partner's love notes, calendar dates & vibes."
                : "Create a private shared world reserved just for the two of you."}
            </p>
          </div>

          {/* Alerts / Error & Success Banner */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className={`p-3.5 rounded-2xl mb-5 text-xs sm:text-sm font-medium flex items-start gap-2.5 border shadow-xs ${
                  message.type === "success"
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                    : message.type === "info"
                    ? "bg-rose-50/95 border-rose-200 text-rose-900"
                    : "bg-rose-50/95 border-rose-300 text-rose-950"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : message.type === "info" ? (
                  <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Sign-In Button (Google) */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={socialLoading || loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-rose-50/70 border border-rose-200/80 text-[#3a1222] text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all duration-200 shadow-2xs hover:shadow-xs hover:border-rose-300 cursor-pointer disabled:opacity-50"
          >
            {socialLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-rose-200/70" />
            </div>
            <div className="relative flex justify-center text-xs font-semibold uppercase">
              <span className="bg-white/90 px-3 text-rose-800/70 tracking-wider">
                Or with romantic email
              </span>
            </div>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Sign Up Fields: Full Name & Partner Nickname */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#4a182c] mb-1.5">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                      <input
                        type="text"
                        required={mode === "signup"}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Juliet"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-[#280816] placeholder:text-rose-300 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4a182c] mb-1.5">
                      Partner&#39;s Pet Name 💕
                    </label>
                    <div className="relative">
                      <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                      <input
                        type="text"
                        value={partnerNickname}
                        onChange={(e) => setPartnerNickname(e.target.value)}
                        placeholder="e.g. My Romeo / Honey"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-[#280816] placeholder:text-rose-300 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Anniversary / Special Date */}
                <div>
                  <label className="block text-xs font-bold text-[#4a182c] mb-1.5 flex items-center justify-between">
                    <span>Anniversary / Milestone Date</span>
                    <span className="text-[10px] text-rose-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                    <input
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-[#280816] text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Partner Code Switcher Toggle */}
                <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200/70 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#4a182c]">
                      Did your partner give you a Love Code?
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasPartnerCode(!hasPartnerCode)}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      {hasPartnerCode ? "I'm the first" : "Yes, I have a code"}
                    </button>
                  </div>

                  {hasPartnerCode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-1.5"
                    >
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                        <input
                          type="text"
                          value={coupleCode}
                          onChange={(e) => setCoupleCode(e.target.value.toUpperCase())}
                          placeholder="e.g. LOVE-8824"
                          maxLength={70}
                          className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-rose-300 text-rose-900 uppercase font-mono tracking-wider text-xs font-bold focus:outline-hidden focus:border-rose-500"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-[#4a182c] mb-1.5">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lovebirds@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-[#280816] placeholder:text-rose-300 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field (when using password method) */}
            {authMethod === "password" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#4a182c]">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setAuthMethod("magic_link")}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Email me a Magic Link instead
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200/80 text-[#280816] placeholder:text-rose-300 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Love Meter (Sign Up Only) */}
                {mode === "signup" && password.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-rose-50/80 border border-rose-200/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
                      <span>Connection Strength:</span>
                      <span>{strength.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-rose-200/80 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.level >= 1 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "33%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.level >= 2 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "33%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.level >= 3 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "34%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Magic Link Notice */}
            {authMethod === "magic_link" && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
                <span>We&#39;ll email you a passwordless instant sign-in link.</span>
                <button
                  type="button"
                  onClick={() => setAuthMethod("password")}
                  className="font-bold text-rose-600 hover:underline shrink-0 ml-2"
                >
                  Use Password
                </button>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-500"
                />
                <span className="text-xs font-semibold text-[#501c31]">
                  Keep our spark alive (Remember me)
                </span>
              </label>
            </div>

            {/* Submit CTA Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              className="w-full py-3.5 px-4 rounded-2xl btn-love-primary text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-60 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sealing our connection...</span>
                </>
              ) : mode === "login" ? (
                <>
                  <Heart className="w-4 h-4 fill-white" />
                  <span>
                    {authMethod === "magic_link" ? "Send Magic Love Link" : "Enter Couple Sanctuary"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Our Couple Space</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Mode Switch Footer */}
          <div className="mt-6 pt-5 border-t border-rose-100 text-center text-xs text-[#5f2239]">
            {mode === "login" ? (
              <p>
                New couple on QubitSells?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setMessage(null);
                  }}
                  className="font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer ml-1"
                >
                  Create your free shared space ✨
                </button>
              </p>
            ) : (
              <p>
                Already have a couple sanctuary?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setMessage(null);
                  }}
                  className="font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer ml-1"
                >
                  Sign in here 💕
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
