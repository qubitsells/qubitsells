"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  ArrowRight,
  Music,
  Calendar,
  Lock,
  MessageSquare,
  Gift,
  Mail,
  BookOpen,
  Compass,
  CheckCircle2,
  ExternalLink,
  Eye,
  Sliders,
  ChevronRight,
  X,
  Play,
  Share2,
  Inbox,
  Hourglass,
  HelpCircle,
  Smartphone,
  ShieldCheck,
  Flame,
  Key,
  Moon,
  Ghost,
  Zap,
} from "lucide-react";
import { SCENES, SceneDefinition } from "@/lib/constants/scenes";

interface ToolItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: typeof MessageSquare;
  color: string;
  bgLight: string;
  badge: string;
}

const TEMPLATE_TOOLS: ToolItem[] = [
  {
    id: "reply",
    name: "Voice & Photo Love Notes",
    tagline: "Partner can record voice notes & snap instant photos",
    description:
      "Your partner can leave high-fidelity voice notes, upload memorable photos, write love messages, and react with romantic emojis directly on your webpage.",
    icon: MessageSquare,
    color: "#f43f5e",
    bgLight: "bg-rose-50 border-rose-200 text-rose-600",
    badge: "Interactive Reply",
  },
  {
    id: "invitation",
    name: "Date Night & RSVP Planner",
    tagline: "Propose dates with flexible times and instant RSVP",
    description:
      "Set up romantic date ideas with proposed dates and times. Your partner can accept with a single tap, choose between multiple slots, or counterpropose another time.",
    icon: Calendar,
    color: "#8b5cf6",
    bgLight: "bg-purple-50 border-purple-200 text-purple-600",
    badge: "Date Booking",
  },
  {
    id: "poll",
    name: "Romantic Decision Polls",
    tagline: "Vote together on dinner, movies, and weekend trips",
    description:
      "End the 'I don't know, you pick' dilemma! Set up custom voting cards for weekend getaways, favorite comfort dinners, or romantic activities.",
    icon: Sliders,
    color: "#f59e0b",
    bgLight: "bg-amber-50 border-amber-200 text-amber-600",
    badge: "Couple Decision",
  },
  {
    id: "question",
    name: "Heart-to-Heart Question Cards",
    tagline: "Deep intimacy prompts to rediscover each other",
    description:
      "Pose meaningful questions. You can choose whether your partner answers first, reveal answers simultaneously, or keep them hidden until you both unlock them.",
    icon: Sparkles,
    color: "#ec4899",
    bgLight: "bg-pink-50 border-pink-200 text-pink-600",
    badge: "Intimacy Prompt",
  },
  {
    id: "reveal",
    name: "Synchronized Secret Reveal",
    tagline: "Locked surprises revealed only when both are ready",
    description:
      "Lock secret confessions, surprise vacation reveals, or special gifts behind a dual-lock timer. Answers remain encrypted until both of you unlock simultaneously.",
    icon: Lock,
    color: "#6366f1",
    bgLight: "bg-indigo-50 border-indigo-200 text-indigo-600",
    badge: "Synchronized Lock",
  },
  {
    id: "coupon",
    name: "Redeemable Love Coupons",
    tagline: "Sweet tokens for massages, breakfast, and dates",
    description:
      "Gift personalized digital coupons that your partner can redeem anytime with a click. Schedule redemption dates and track accepted vouchers.",
    icon: Gift,
    color: "#10b981",
    bgLight: "bg-emerald-50 border-emerald-200 text-emerald-600",
    badge: "Sweet Perks",
  },
  {
    id: "open_when",
    name: "Open When Sealed Letters",
    tagline: "Virtual envelopes for when they need comfort most",
    description:
      "Write heartfelt letters sealed for specific emotional moments — 'Open when you miss me', 'Open when you had a hard day', or 'Open on our anniversary'.",
    icon: Mail,
    color: "#06b6d4",
    bgLight: "bg-cyan-50 border-cyan-200 text-cyan-600",
    badge: "Emotional Sanctuary",
  },
  {
    id: "our_story",
    name: "Our Story Milestone Timeline",
    tagline: "Chronicle your journey from first glance to today",
    description:
      "Showcase your relationship milestones with beautiful Polaroid-style photo cards, dates, and captions, celebrating how far you both have come.",
    icon: BookOpen,
    color: "#e11d48",
    bgLight: "bg-rose-50 border-rose-200 text-rose-600",
    badge: "Memory Journey",
  },
  {
    id: "bucket_list",
    name: "Shared Couple Bucket List",
    tagline: "Dreams and adventures to check off together",
    description:
      "Create a shared checklist of concerts, road trips, romantic milestones, and stargazing spots you vow to conquer hand-in-hand.",
    icon: Compass,
    color: "#0284c7",
    bgLight: "bg-sky-50 border-sky-200 text-sky-600",
    badge: "Life Adventures",
  },
  {
    id: "scratch",
    name: "Interactive Scratch Card Surprise",
    tagline: "Scratch off silver foil to reveal hidden love notes",
    description:
      "An interactive foil overlay that your partner scratches off with their finger or mouse to uncover a secret love note, intimate voucher, or surprise photo.",
    icon: Flame,
    color: "#d97706",
    bgLight: "bg-amber-50 border-amber-200 text-amber-600",
    badge: "Secret Reveal",
  },
  {
    id: "capsule",
    name: "Anniversary Time Capsule Vault",
    tagline: "Sealed memories locked until a special future milestone",
    description:
      "Preserve voice notes, photos, and letters locked until your 1st, 5th, or 10th anniversary. Countdowns build romantic anticipation for years to come.",
    icon: Hourglass,
    color: "#9333ea",
    bgLight: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600",
    badge: "Locked Vault",
  },
];

const SCENE_DETAILS = [
  {
    tag: "⭐ Most Popular",
    vibe: "Intimate Late Nights & Stargazing",
    bestFor: "Anniversaries, deep romantic confessions & nighttime surprises",
  },
  {
    tag: "🌸 Romantic Classic",
    vibe: "Cherry Blossoms & Golden Balcony",
    bestFor: "First date memories, Valentine's tributes & cozy relationship milestones",
  },
  {
    tag: "☁️ Serene & Dreamy",
    vibe: "Peaceful Blue Sky & Drifting Clouds",
    bestFor: "Playful summer love, road trips, promise letters & everyday appreciation",
  },
  {
    tag: "🌅 Warm Golden Hour",
    vibe: "Sunset Glow & Tender Reflections",
    bestFor: "Proposal hints, golden hour dates, vacation memories & future vows",
  },
];

export default function TemplatesCatalog() {
  const [selectedFilter, setSelectedFilter] = useState<number | "all">("all");
  const [previewSceneIndex, setPreviewSceneIndex] = useState<number | null>(null);

  const filteredScenes =
    selectedFilter === "all"
      ? SCENES.map((scene, idx) => ({ ...scene, index: idx }))
      : SCENES.map((scene, idx) => ({ ...scene, index: idx })).filter(
          (_, idx) => idx === selectedFilter
        );

  const previewScene =
    previewSceneIndex !== null ? SCENES[previewSceneIndex] : null;

  return (
    <div className="relative pt-24 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────
          1. HERO HEADER
      ───────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-bold tracking-wide shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>Cinematic Couple Templates Catalog</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span className="text-[11px] font-semibold text-rose-600">4 Scenes • 11 Interactive Tools</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-[#2e091b] tracking-tight leading-tight"
        >
          Turn Your Love Story Into a{" "}
          <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent">
            Cinematic Webpage
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-[#6d2440] font-medium leading-relaxed max-w-2xl mx-auto"
        >
          Select an anime aesthetic theme, choose curated background soundtracks, and
          embed interactive date RSVP planners, voice note love notes, secret reveals, and memory timelines.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <Link
            href="/anime-template"
            id="hero-open-template-studio-btn"
            className="px-6 py-3 rounded-full btn-love-primary text-white font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Open Template Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#scenes"
            className="px-5 py-3 rounded-full bg-white/90 hover:bg-rose-50 border border-rose-200 text-rose-950 font-bold text-sm flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <span>Explore 4 Themes</span>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </a>

          <Link
            href="/creator-center"
            className="px-5 py-3 rounded-full bg-white/70 hover:bg-white border border-rose-200 text-[#5c1c34] font-semibold text-sm flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Inbox className="w-4 h-4 text-rose-500" />
            <span>View Creator Center</span>
          </Link>
        </motion.div>

        {/* Value Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#7c2948]">
          <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-rose-100 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            100% Free to Build & Share
          </span>
          <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-rose-100 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            No App or Sign-Up Needed for Partner
          </span>
          <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-rose-100 shadow-2xs">
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            Mobile & Desktop Responsive
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          FEATURED PREMIER TEMPLATE: OUR LITTLE PINK DAY
      ───────────────────────────────────────────── */}
      <section className="mb-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#FFE9F1] to-[#FFF3F8] border-2 border-[#F7BFD5] p-6 sm:p-10 shadow-lg flex flex-col md:flex-row items-center gap-8">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#F7BFD5] group">
            <Image
              src="/templates/our-little-pink-day/01-my-favorite-meetup.png"
              alt="Our Little Pink Day"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#A43F66] text-xs font-bold shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A43F66]" />
              <span>✨ New Illustrated Template</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/50 text-[10px]">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#F7BFD5] text-[#A43F66] text-xs font-bold shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-[#A43F66]" />
              <span>Contemporary 2D Pastel Romance</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#51253E] tracking-tight">
              Our Little Pink Day
            </h2>

            <p className="text-sm font-semibold text-[#A43F66]">
              &quot;Little moments. Favorite person.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#79566C] font-medium leading-relaxed">
              Take your partner on an everyday romantic date through a cafe meetup, strawberry dessert, bunny plush surprise, photo booth laughs, shared umbrella in the rain, and a cozy evening balcony.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#51253E]">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs flex items-center gap-1">
                🍰 Pick Our Next Date RSVP
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs flex items-center gap-1">
                💌 Voice & Photo Replies
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs flex items-center gap-1">
                🎵 Background Lofi Music
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/our-little-pink-day"
                className="px-6 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: "#A43F66" }}
              >
                <span>Customize &quot;Our Little Pink Day&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── The Midnight Key (Halloween Template) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#120D1C] via-[#1D1429] to-[#291D38] border-2 border-[#F3B574]/60 p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center gap-8 mt-6">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#75536D]/60 group">
            <Image
              src="/templates/halloween-midnight-key/01-the-hidden-key.png"
              alt="The Midnight Key"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#120D1C]/90 backdrop-blur-md text-[#FFBC73] text-xs font-bold shadow-xs flex items-center gap-1.5 border border-[#F3B574]/40">
              <Key className="w-3.5 h-3.5 text-[#F3B574]" />
              <span>🎃 New Halloween Template</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-[#FFE2BD] text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-[#FFBC73]">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4 text-[#F7EDE2]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#291D38] border border-[#75536D] text-[#FFBC73] text-xs font-bold shadow-2xs">
              <Moon className="w-3.5 h-3.5 text-[#F3B574]" />
              <span>Disney-Inspired 3D Halloween Adventure</span>
            </div>

            <h2 className="font-halloween text-2xl sm:text-3xl font-black text-[#FFE2BD] tracking-tight">
              The Midnight Key
            </h2>

            <p className="text-sm font-semibold text-[#FFBC73]">
              &quot;A little adventure, just for us.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#D6BDC8] font-medium leading-relaxed">
              Step into an enchanted midnight garden. Discover a brass key, follow fireflies across the bridge, unlock the secret garden gate, find the glowing glass heart treasure, and dance beneath the Halloween moon.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#FFE2BD]">
              <span className="px-2.5 py-1 rounded-xl bg-[#1D1429] border border-[#4A3258] shadow-2xs flex items-center gap-1">
                🗝️ Secret Key &amp; Garden Gate
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#1D1429] border border-[#4A3258] shadow-2xs flex items-center gap-1">
                ✨ Glowing Heart Confession
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#1D1429] border border-[#4A3258] shadow-2xs flex items-center gap-1">
                🌙 Halloween Date RSVP
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/halloween-midnight-key"
                className="px-6 py-3 rounded-full text-[#1A0F24] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
              >
                <span>Customize &quot;The Midnight Key&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Pumpkin Moon Date (Cozy Warm Halloween Template) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F0A06] via-[#1C1109] to-[#2A180C] border-2 border-[#FF7518]/60 p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center gap-8 mt-6">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#542D14] group">
            <Image
              src="/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png"
              alt="Pumpkin Moon Date"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0F0A06]/90 backdrop-blur-md text-[#FFD166] text-xs font-bold shadow-xs flex items-center gap-1.5 border border-[#FF7518]/50">
              <span className="text-sm">🎃</span>
              <span>New Halloween Template</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-[#FFF3E3] text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-[#FFD166]">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4 text-[#FFF3E3]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A180C] border border-[#542D14] text-[#FFD166] text-xs font-bold shadow-2xs">
              <Moon className="w-3.5 h-3.5 text-[#FF7518]" />
              <span>Disney-Inspired 3D Halloween Story</span>
            </div>

            <h2 className="font-halloween text-2xl sm:text-3xl font-black text-[#FFF3E3] tracking-tight drop-shadow-[0_2px_15px_rgba(255,117,24,0.4)]">
              Pumpkin Moon Date
            </h2>

            <p className="text-sm font-semibold text-[#FFD166]">
              &quot;A little Halloween magic, just for you.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#C49A76] font-medium leading-relaxed">
              Meet outside a glowing cottage, pick pumpkins together, carve glowing jack-o&#39;-lanterns side by side, receive a mysterious sealed invitation from a friendly little ghost, and celebrate beneath the warm harvest pumpkin moon.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#FFF3E3]">
              <span className="px-2.5 py-1 rounded-xl bg-[#1C1109] border border-[#542D14] shadow-2xs flex items-center gap-1">
                🎃 Pumpkin Patch &amp; Lanterns
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#1C1109] border border-[#542D14] shadow-2xs flex items-center gap-1">
                💌 Ghost&#39;s Moonlit Letter
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#1C1109] border border-[#542D14] shadow-2xs flex items-center gap-1">
                🌙 Halloween Date RSVP
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/halloween-pumpkin-moon"
                className="px-6 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
              >
                <span>Customize &quot;Pumpkin Moon Date&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── The Haunted Waltz (Gothic Romance Template) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B1015] via-[#152026] to-[#172B31] border-2 border-[#90C9C6]/60 p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center gap-8 mt-6">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#2E414A] group">
            <Image
              src="/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png"
              alt="The Haunted Waltz"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0B1015]/90 backdrop-blur-md text-[#90C9C6] text-xs font-bold shadow-xs flex items-center gap-1.5 border border-[#90C9C6]/50">
              <Ghost className="w-3.5 h-3.5 text-[#90C9C6]" />
              <span>New Gothic Romance Template</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-[#EDF1ED] text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-[#90C9C6]">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4 text-[#EDF1ED]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#172B31] border border-[#2E414A] text-[#90C9C6] text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FFCC99]" />
              <span>Gothic 2D Storybook &amp; Waltz</span>
            </div>

            <h2 className="font-mystical-horror text-2xl sm:text-3xl font-normal text-[#EDF1ED] tracking-wide drop-shadow-[0_2px_15px_rgba(144,201,198,0.4)]">
              The Haunted Waltz
            </h2>

            <p className="text-sm font-semibold text-[#90C9C6]">
              &quot;Hold my hand. Let&apos;s see what&apos;s waiting.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#B8C6CE] font-medium leading-relaxed">
              Step into an eerie moonlit manor, follow glowing supernatural footsteps, greet two ballroom spirits waiting for their last dance, and join them in a breathtaking waltz beneath the chandelier before sunrise.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#EDF1ED]">
              <span className="px-2.5 py-1 rounded-xl bg-[#152026] border border-[#2E414A] shadow-2xs flex items-center gap-1">
                🕯️ Midnight Manor &amp; Ballroom
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#152026] border border-[#2E414A] shadow-2xs flex items-center gap-1">
                👻 Spectral Waltz &amp; Spirits
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#152026] border border-[#2E414A] shadow-2xs flex items-center gap-1">
                🌙 Spooky Night Date RSVP
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/spooky-the-haunted-waltz"
                className="px-6 py-3 rounded-full text-[#0B1015] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99]"
              >
                <span>Customize &quot;The Haunted Waltz&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Starlit Story (Warm Light Rooftop Romance Template) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFF8F4] via-[#FAF6F0] to-[#FFF0EB] border-2 border-[#F0D5C9] p-6 sm:p-10 shadow-lg flex flex-col md:flex-row items-center gap-8 mt-6">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#F0D5C9] group">
            <Image
              src="/templates/starlit-story/01-the-meeting.png"
              alt="Starlit Story"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#C26D7A] text-xs font-bold shadow-xs flex items-center gap-1.5 border border-[#F0D5C9]">
              <Sparkles className="w-3.5 h-3.5 text-[#D99443]" />
              <span>✨ New Contemporary 3D Romance</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/50 text-[10px] text-white">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4 text-[#3A231C]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#F0D5C9] text-[#C26D7A] text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#D99443]" />
              <span>Fairytale Rooftop &amp; Fairy Lights</span>
            </div>

            <h2 className="font-starlit text-2xl sm:text-3xl font-black text-[#3A231C] tracking-tight">
              Starlit Story
            </h2>

            <p className="text-sm font-bold text-[#C26D7A]">
              &quot;Under one sky, every moment is brighter with you.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#75564C] font-medium leading-relaxed">
              Meet your partner on a cozy rooftop garden at sunset, exchange a single pink rose and an ivory envelope across the table, unseal a tender love letter, and lean shoulder to shoulder beneath glowing fairy lights and twilight skies.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#3A231C]">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-[#F0D5C9] shadow-2xs flex items-center gap-1">
                ✨ Rooftop Fairy Lights &amp; Rose
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-[#F0D5C9] shadow-2xs flex items-center gap-1">
                💌 Scene 4 Love Letter Reveal
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-[#F0D5C9] shadow-2xs flex items-center gap-1">
                🌙 Starlit Date Proposal RSVP
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/starlit-story"
                className="px-6 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-[#C26D7A] hover:bg-[#B55D6B]"
              >
                <span>Customize &quot;Starlit Story&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Storm & Flame (Battle-Fantasy Anime Romance Template) ── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#070F1E] via-[#0F1A2E] to-[#18253E] border-2 border-[#00E5FF]/60 p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center gap-8 mt-6">
          {/* Visual 16:9 Thumbnail Preview */}
          <div className="w-full md:w-1/2 aspect-video relative rounded-2xl overflow-hidden shadow-md border border-[#273B5E] group">
            <Image
              src="/templates/anime-storm-and-flame/05-our-combined-strength.png"
              alt="Storm & Flame"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#070F1E]/90 backdrop-blur-md text-[#00E5FF] text-xs font-bold shadow-xs flex items-center gap-1.5 border border-[#00E5FF]/40">
              <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>⚡ New Battle Fantasy Template</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-[#EFF7FF] text-xs font-semibold drop-shadow-sm flex items-center justify-between">
              <span>6 Continuous Scenes • 27.5s Playback</span>
              <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-[#00E5FF]">16:9 Viewport</span>
            </div>
          </div>

          {/* Details & CTA */}
          <div className="w-full md:w-1/2 space-y-4 text-[#EFF7FF]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-[#00E5FF] text-xs font-bold shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
              <Flame className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>Japanese Theatrical 2D Anime Romance</span>
            </div>

            <h2 className="font-storm-flame text-2xl sm:text-3xl font-bold text-[#EFF7FF] tracking-wide drop-shadow-[0_2px_15px_rgba(0,229,255,0.4)]">
              Storm &amp; Flame
            </h2>

            <p className="font-storm-flame text-sm font-semibold text-[#FF9900] tracking-wide">
              &quot;Two powers. One promise.&quot;
            </p>

            <p className="text-xs sm:text-sm text-[#B9CBDF] font-medium leading-relaxed">
              Her cyan lightning meets his golden fire. Train together, awaken complementary elemental powers, shield each other against the tempest, seal a sacred vow in Scene 4, combine your strength, and rest together after the storm.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#EFF7FF]">
              <span className="px-2.5 py-1 rounded-xl bg-[#0F1A2E] border border-[#273B5E] shadow-2xs flex items-center gap-1 text-[#00E5FF]">
                ⚡ Cyan Lightning &amp; Fire
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#0F1A2E] border border-[#273B5E] shadow-2xs flex items-center gap-1 text-[#FF9900]">
                📜 Scene 4 Sacred Vow Reveal
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#0F1A2E] border border-[#273B5E] shadow-2xs flex items-center gap-1 text-[#EFF7FF]">
                ⚔️ Next Adventure RSVP
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/templates/anime-storm-and-flame"
                className="px-6 py-3 rounded-full text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#00E5FF] via-[#38BDF8] to-[#FF9900]"
              >
                <span>Customize &quot;Storm &amp; Flame&quot;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          2. SCENE THEMES CATALOG
      ───────────────────────────────────────────── */}
      <section id="scenes" className="mb-24 scroll-mt-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">
              <Sparkles className="w-3 h-3 text-rose-500" />
              <span>Aesthetic Themes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#280816]">
              Choose Your Romantic Backdrop
            </h2>
            <p className="text-xs sm:text-sm text-[#6c243f] font-medium mt-1">
              Every theme features animated drifting sakura particles, ambient lighting, and bespoke typography.
            </p>
          </div>

          {/* Theme Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-rose-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedFilter === "all"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-[#5e1e36] hover:bg-rose-50"
              }`}
            >
              All Themes
            </button>
            {SCENES.map((scene, idx) => (
              <button
                key={scene.label}
                type="button"
                onClick={() => setSelectedFilter(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedFilter === idx
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-[#5e1e36] hover:bg-rose-50"
                }`}
              >
                <span>{scene.emoji}</span>
                <span>{scene.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scene Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {filteredScenes.map((scene) => {
            const details = SCENE_DETAILS[scene.index];
            return (
              <motion.div
                key={scene.label}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl border border-rose-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Visual Scene Header & Image */}
                <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-[#1c0a15]">
                  <Image
                    src={scene.bg}
                    alt={scene.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-95"
                  />
                  {/* Gradient overlays for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-xs flex items-center gap-1.5">
                      <span>{scene.emoji}</span>
                      <span>{scene.label}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[11px] font-bold backdrop-blur-md shadow-xs">
                      {details.tag}
                    </span>
                  </div>

                  {/* Floating Action Button (Live Preview Lightbox) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => setPreviewSceneIndex(scene.index)}
                      className="px-4 py-2.5 rounded-full bg-white/95 text-rose-950 font-bold text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-rose-600" />
                      <span>Live Interactive Preview</span>
                    </button>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-lg font-black drop-shadow-sm">
                      {scene.description}
                    </p>
                    <p className="text-rose-200/90 text-xs font-medium drop-shadow-xs flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      {details.vibe}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    {/* Best For Scenario */}
                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100/90 text-xs text-[#52182e]">
                      <span className="font-bold text-rose-800">Best for: </span>
                      <span className="font-medium">{details.bestFor}</span>
                    </div>

                    {/* Palette Swatches */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] font-bold text-[#6d2440] uppercase tracking-wider">
                        Color Theme
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: scene.palette.accent }}
                          title={`Accent: ${scene.palette.accent}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: scene.palette.glow }}
                          title={`Glow: ${scene.palette.glow}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: scene.palette.dark }}
                          title={`Dark: ${scene.palette.dark}`}
                        />
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#66243d]">
                      <div className="flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-rose-500" />
                        <span>Curated Soundtracks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        <span>Sakura Petal Physics</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                        <span>11 Interactive Tools</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Instant Mobile Link</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2 border-t border-rose-100">
                    <button
                      type="button"
                      onClick={() => setPreviewSceneIndex(scene.index)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-[#3d1223] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-rose-500" />
                      <span>Preview</span>
                    </button>

                    <Link
                      href={`/anime-template?scene=${scene.index}`}
                      className="flex-1 py-2.5 px-3 rounded-xl btn-love-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <span>Customize</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          3. 11 INTERACTIVE TOOLS SHOWCASE
      ───────────────────────────────────────────── */}
      <section className="mb-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 uppercase tracking-widest">
            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
            <span>Interactive Love Ecosystem</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#2e091b]">
            11 Interactive Tools You Can Embed
          </h2>
          <p className="text-xs sm:text-sm text-[#6c243f] font-medium">
            Toggle whichever tools fit your moment. Your partner interacts seamlessly from any mobile or desktop browser without registering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TEMPLATE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-rose-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tool.bgLight}`}>
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-[#2b0818]">
                      {tool.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5">
                      {tool.tagline}
                    </p>
                  </div>

                  <p className="text-xs text-[#5e1c34] font-medium leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-rose-100 flex items-center justify-between text-[11px] font-bold text-rose-700">
                  <span>Available in all 4 scenes</span>
                  <span className="flex items-center gap-1 text-rose-500 group-hover:translate-x-0.5 transition-transform">
                    <span>Activate in studio</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          4. HOW IT WORKS (3-STEP PROCESS)
      ───────────────────────────────────────────── */}
      <section className="mb-24 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-rose-100/70 via-pink-50/50 to-amber-50/40 border border-rose-200/90 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">
            Effortless Creation
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#2b0818]">
            Crafted in 3 Simple Steps
          </h2>
          <p className="text-xs sm:text-sm text-[#6c243f] font-medium">
            No technical skills needed. From inspiration to your partner&#39;s smile in under 5 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-rose-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
              01
            </div>
            <h3 className="text-base font-bold text-[#2a0818]">
              Pick Theme & Music
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              Choose an anime backdrop like Starry Night or Sunset Balcony. Select from curated lofi melodies or paste any YouTube romantic song URL.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-rose-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
              02
            </div>
            <h3 className="text-base font-bold text-[#2a0818]">
              Toggle Your Tools
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              Write your personalized love note, propose a candlelight dinner date with RSVP slots, or add secret reveal cards and redeemable coupons.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-rose-200/80 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
              03
            </div>
            <h3 className="text-base font-bold text-[#2a0818]">
              Share & Receive Replies
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              Copy your private link and send it via text or WhatsApp. Listen to their voice note replies and track RSVPs in your Creator Center inbox.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/anime-template"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full btn-love-primary text-white font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          5. FAQ ACCORDION / GRID
      ───────────────────────────────────────────── */}
      <section className="mb-24 max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-1">
          <h2 className="text-2xl font-black text-[#2e091b]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#6c243f] font-medium">
            Everything you need to know about couple templates and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/90 border border-rose-200/80 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#2a0818] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
              Does my partner need an account?
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              No account required! Your partner can open the link on their phone, read your notes, record voice replies, upload photos, and RSVP immediately without signing in.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 border border-rose-200/80 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#2a0818] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              Are our voice notes and photos private?
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              Yes, completely private. Template links are unindexed, protected with cryptographic shortcodes, and audio/photo replies are only accessible to you in your secure Creator Center.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 border border-rose-200/80 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#2a0818] flex items-center gap-2">
              <Music className="w-4 h-4 text-rose-500 shrink-0" />
              Can I use our favorite song?
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              Yes! You can choose from our curated copyright-free lofi and romantic library, or simply paste any YouTube video link to play as the backdrop.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 border border-rose-200/80 shadow-2xs space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#2a0818] flex items-center gap-2">
              <Inbox className="w-4 h-4 text-rose-500 shrink-0" />
              Where do I see my partner&#39;s responses?
            </h3>
            <p className="text-xs text-[#61213b] font-medium leading-relaxed">
              All love notes, audio replies, photos, and date RSVPs are automatically delivered to your Creator Center (/creator-center), where you can listen, view in lightbox, and respond.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          6. BOTTOM CLIMAX CALL TO ACTION
      ───────────────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden p-8 sm:p-14 text-center bg-gradient-to-tr from-[#2b0818] via-[#4a1228] to-[#1e0712] text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-rose-300 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            <span>Create a Keepsake They Will Treasure</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to Sweep Your Partner Off Their Feet?
          </h2>

          <p className="text-sm sm:text-base text-rose-200/90 font-medium leading-relaxed">
            Choose a theme, add your memories and songs, and create a romantic webpage that feels like magic.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/anime-template"
              className="px-8 py-3.5 rounded-full btn-love-primary text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Template Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/creator-center"
              className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-all shadow-2xs"
            >
              <span>Manage Existing Templates</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          7. LIVE PREVIEW LIGHTBOX MODAL
      ───────────────────────────────────────────── */}
      <AnimatePresence>
        {previewScene && previewSceneIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl h-[88vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20 bg-black"
            >
              {/* Full Background Preview */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={previewScene.bg}
                  alt={previewScene.label}
                  fill
                  className="object-cover object-center"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, ${previewScene.palette.dark}95 100%)`,
                  }}
                />
              </div>

              {/* Top Modal Bar */}
              <div className="relative z-10 flex items-center justify-between p-4 sm:p-5 bg-black/40 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">
                    {previewScene.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>{previewScene.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90 font-medium">
                        Live Preview Mode
                      </span>
                    </h3>
                    <p className="text-[11px] text-white/70 font-medium">
                      {previewScene.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/anime-template?scene=${previewSceneIndex}`}
                    className="px-4 py-2 rounded-full btn-love-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform"
                  >
                    <span>Use This Theme</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setPreviewSceneIndex(null)}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close Preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Sample Interactive Page Content Styled in this Scene's Palette */}
              <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center text-center space-y-6">
                {/* Floating Mockup Card */}
                <div
                  className="w-full max-w-lg p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-xl text-left space-y-4"
                  style={{
                    backgroundColor: previewScene.palette.card,
                    borderColor: `${previewScene.palette.accent}40`,
                    boxShadow: `0 10px 40px -10px ${previewScene.palette.glow}50`,
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-3 border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: previewScene.palette.accent }} />
                      <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                        QubitSells Sanctuary Preview
                      </span>
                    </div>
                    <span className="text-xs text-white/70 font-medium flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" style={{ color: previewScene.palette.accent }} />
                      Lofi Love Track Playing...
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-white">
                      Dear Partner, You Are My Universe ✨
                    </h4>
                    <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed mt-2">
                      &quot;Every moment with you feels like our own anime movie. I built this private page to remind you how much you mean to me.&quot;
                    </p>
                  </div>

                  {/* Sample Interactive Reply & RSVP Tools inside preview */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-white/90 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" style={{ color: previewScene.palette.accent }} />
                      <div>
                        <div className="font-bold">Leave Voice Note</div>
                        <div className="text-[10px] text-white/60">Partner audio enabled</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-white/90 flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: previewScene.palette.accent }} />
                      <div>
                        <div className="font-bold">Date RSVP</div>
                        <div className="text-[10px] text-white/60">Candlelight Stargazing</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scene Switcher inside Lightbox */}
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/15">
                  <span className="text-xs font-semibold text-white/70 pl-2">Switch Theme:</span>
                  {SCENES.map((s, idx) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setPreviewSceneIndex(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        previewSceneIndex === idx
                          ? "bg-white text-black shadow-xs"
                          : "text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Lightbox Bar */}
              <div className="relative z-10 p-3 sm:p-4 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-xs text-white/70">
                <span>Designed for mobile phones & desktop browsers</span>
                <Link
                  href={`/anime-template?scene=${previewSceneIndex}`}
                  className="font-bold text-white hover:underline flex items-center gap-1"
                >
                  <span>Open in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
