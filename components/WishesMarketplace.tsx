"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  X,
  ArrowRight,
  Search,
  Star,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Share2,
  Wand2,
  Eye,
  Camera,
  Music,
  Globe,
  Flame,
  Moon,
  Sun,
  Gift,
  MapPin,
  Clock,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  style: string;
  emoji: string;
  featured?: boolean;
  premium?: boolean;
  gradient: string;
  textColor: string;
  accentColor: string;
  preview: string; // short preview line
  tags: string[];
}

interface Category {
  id: string;
  label: string;
  emoji: string;
  count: number;
  color: string;
}

/* ─────────────────────────────────────────────
   CATEGORY DATA
───────────────────────────────────────────── */
const CATEGORIES: Category[] = [
  { id: "all", label: "All Wishes", emoji: "✨", count: 0, color: "#f43f5e" },
  { id: "birthday", label: "Birthday", emoji: "🎂", count: 7, color: "#ec4899" },
  { id: "anniversary", label: "Anniversary", emoji: "💍", count: 7, color: "#8b5cf6" },
  { id: "valentine", label: "Valentine's Day", emoji: "💌", count: 7, color: "#f43f5e" },
  { id: "goodmorning", label: "Good Morning", emoji: "☀️", count: 7, color: "#f59e0b" },
  { id: "goodnight", label: "Good Night", emoji: "🌙", count: 7, color: "#6366f1" },
  { id: "missyou", label: "Miss You", emoji: "💔", count: 6, color: "#06b6d4" },
  { id: "love", label: "Love & Romantic", emoji: "❤️", count: 10, color: "#f43f5e" },
  { id: "apology", label: "Apology", emoji: "🙏", count: 7, color: "#14b8a6" },
  { id: "thankyou", label: "Thank You", emoji: "🙌", count: 7, color: "#10b981" },
  { id: "milestones", label: "Milestones", emoji: "🏆", count: 10, color: "#d97706" },
  { id: "longdistance", label: "Long Distance", emoji: "✈️", count: 7, color: "#3b82f6" },
  { id: "proposal", label: "Proposal", emoji: "💎", count: 8, color: "#a855f7" },
  { id: "wedding", label: "Wedding", emoji: "👰", count: 7, color: "#f43f5e" },
  { id: "festival", label: "Festival & Occasions", emoji: "🌟", count: 10, color: "#eab308" },
  { id: "fun", label: "Relationship Fun", emoji: "😄", count: 10, color: "#06b6d4" },
];

/* ─────────────────────────────────────────────
   TEMPLATE DATA
───────────────────────────────────────────── */
const TEMPLATES: Template[] = [
  // BIRTHDAY
  {
    id: "birthday-favorite-person",
    name: "My Favorite Person",
    description: "Elegant romantic design with photo + heartfelt message",
    category: "birthday",
    style: "Elegant",
    emoji: "🎂",
    featured: true,
    gradient: "from-rose-900 via-rose-800 to-pink-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "To my favorite person in the entire world...",
    tags: ["photo", "romantic", "elegant"],
  },
  {
    id: "birthday-love-letter",
    name: "Birthday Love Letter",
    description: "Handwritten letter aesthetic with elegant typography",
    category: "birthday",
    style: "Vintage",
    emoji: "✉️",
    gradient: "from-amber-50 via-orange-50 to-yellow-50",
    textColor: "#451a03",
    accentColor: "#d97706",
    preview: "My dearest love, on this beautiful day...",
    tags: ["handwritten", "vintage", "letter"],
  },
  {
    id: "birthday-another-year",
    name: "Another Year With You",
    description: "Timeline / memory style with year-by-year memories",
    category: "birthday",
    style: "Minimal",
    emoji: "📅",
    gradient: "from-slate-50 via-gray-50 to-zinc-100",
    textColor: "#1e293b",
    accentColor: "#f43f5e",
    preview: "Year 1... Year 2... Year 3...",
    tags: ["timeline", "memories", "minimal"],
  },
  {
    id: "birthday-princess",
    name: "Birthday Princess",
    description: "Elegant premium design fit for royalty",
    category: "birthday",
    style: "Luxury",
    emoji: "👑",
    featured: true,
    gradient: "from-purple-950 via-purple-900 to-rose-900",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Today, the universe celebrates its greatest masterpiece — you.",
    tags: ["luxury", "gold", "premium"],
  },
  {
    id: "birthday-beautiful",
    name: "You Make Life Beautiful",
    description: "Soft romantic animation with floating petals",
    category: "birthday",
    style: "Romantic",
    emoji: "🌸",
    gradient: "from-pink-100 via-rose-50 to-fuchsia-100",
    textColor: "#831843",
    accentColor: "#f43f5e",
    preview: "Every single day with you is a gift I never expected.",
    tags: ["romantic", "soft", "animated"],
  },
  {
    id: "birthday-memories",
    name: "Our Favorite Memories",
    description: "Collage of couple photos and moments",
    category: "birthday",
    style: "Scrapbook",
    emoji: "📸",
    gradient: "from-amber-100 via-yellow-50 to-orange-100",
    textColor: "#431407",
    accentColor: "#ea580c",
    preview: "Remember when we...",
    tags: ["photos", "memories", "scrapbook"],
  },
  {
    id: "birthday-countdown",
    name: "Birthday Countdown",
    description: "Dramatic countdown timer that explodes into confetti",
    category: "birthday",
    style: "Cinematic",
    emoji: "🎆",
    featured: true,
    gradient: "from-gray-950 via-slate-900 to-gray-950",
    textColor: "#fff",
    accentColor: "#f43f5e",
    preview: "3... 2... 1... Happy Birthday, my love! 🎉",
    tags: ["countdown", "confetti", "dramatic"],
  },

  // ANNIVERSARY
  {
    id: "anniversary-love-story",
    name: "Our Love Story",
    description: "Relationship timeline from first meeting to today",
    category: "anniversary",
    style: "Cinematic",
    emoji: "📖",
    featured: true,
    gradient: "from-rose-950 via-red-900 to-rose-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "Chapter 1: The day everything changed...",
    tags: ["timeline", "story", "cinematic"],
  },
  {
    id: "anniversary-another-year",
    name: "Another Year of Us",
    description: "Elegant cinematic template with full-screen aesthetic",
    category: "anniversary",
    style: "Elegant",
    emoji: "💍",
    gradient: "from-neutral-900 via-stone-900 to-neutral-950",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Another year. A thousand memories. One endless love.",
    tags: ["elegant", "cinematic", "gold"],
  },
  {
    id: "anniversary-365",
    name: "365 Days of Love",
    description: "Yearly memories with animated number counters",
    category: "anniversary",
    style: "Minimal",
    emoji: "📆",
    gradient: "from-white via-rose-50 to-pink-50",
    textColor: "#881337",
    accentColor: "#f43f5e",
    preview: "365 mornings. 365 goodnights. 365 reasons I love you.",
    tags: ["minimal", "counter", "stats"],
  },
  {
    id: "anniversary-then-now",
    name: "From Then → Now",
    description: "Two-photo comparison — who you were vs who you are together",
    category: "anniversary",
    style: "Scrapbook",
    emoji: "🖼️",
    gradient: "from-amber-50 via-stone-50 to-yellow-50",
    textColor: "#292524",
    accentColor: "#d97706",
    preview: "Then: strangers. Now: everything.",
    tags: ["photos", "comparison", "scrapbook"],
  },
  {
    id: "anniversary-forever",
    name: "Forever & Always",
    description: "Luxury black and gold design with premium typography",
    category: "anniversary",
    style: "Luxury",
    emoji: "♾️",
    featured: true,
    gradient: "from-yellow-950 via-stone-950 to-neutral-950",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Forever isn't long enough for what I feel for you.",
    tags: ["luxury", "gold", "premium"],
  },
  {
    id: "anniversary-journey",
    name: "Our Journey",
    description: "Interactive scrolling story of your relationship",
    category: "anniversary",
    style: "Cinematic",
    emoji: "🗺️",
    gradient: "from-slate-900 via-blue-950 to-slate-900",
    textColor: "#fff",
    accentColor: "#60a5fa",
    preview: "Every step brought us closer. Every step was worth it.",
    tags: ["interactive", "journey", "scroll"],
  },
  {
    id: "anniversary-envelope",
    name: "Love Letter Anniversary",
    description: "Animated envelope that unfolds to reveal your message",
    category: "anniversary",
    style: "Romantic",
    emoji: "💌",
    featured: true,
    gradient: "from-rose-100 via-pink-100 to-fuchsia-100",
    textColor: "#831843",
    accentColor: "#f43f5e",
    preview: "Open carefully — this letter carries my whole heart.",
    tags: ["envelope", "animated", "romantic"],
  },

  // VALENTINE'S
  {
    id: "valentine-bemy",
    name: "Be My Valentine?",
    description: "Interactive proposal-style card with Yes/No buttons",
    category: "valentine",
    style: "Cute",
    emoji: "💝",
    featured: true,
    gradient: "from-red-50 via-rose-50 to-pink-100",
    textColor: "#9f1239",
    accentColor: "#f43f5e",
    preview: "Will you be mine? (No button runs away 😄)",
    tags: ["interactive", "fun", "cute"],
  },
  {
    id: "valentine-forever",
    name: "To My Forever Person",
    description: "Deeply romantic full-screen Valentine's template",
    category: "valentine",
    style: "Romantic",
    emoji: "💕",
    gradient: "from-rose-900 via-red-800 to-rose-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "In every universe, I find my way back to you.",
    tags: ["romantic", "deep", "emotional"],
  },
  {
    id: "valentine-reasons",
    name: "Reasons I Love You",
    description: "Cards flipping to reveal reasons one by one",
    category: "valentine",
    style: "Cute",
    emoji: "🃏",
    gradient: "from-pink-50 via-rose-100 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#e879f9",
    preview: "Reason #1: Your laugh. Reason #2: How you...",
    tags: ["flip-cards", "animated", "cute"],
  },
  {
    id: "valentine-love-is",
    name: "Our Love Is...",
    description: "Customizable romantic poem with elegant typography",
    category: "valentine",
    style: "Elegant",
    emoji: "✍️",
    gradient: "from-neutral-950 via-rose-950 to-neutral-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "Our love is... quiet mornings and loud laughter.",
    tags: ["poem", "elegant", "typography"],
  },
  {
    id: "valentine-open-when",
    name: "Open When You Miss Me",
    description: "A sealed envelope experience for missing moments",
    category: "valentine",
    style: "Vintage",
    emoji: "📩",
    gradient: "from-amber-100 via-yellow-50 to-orange-50",
    textColor: "#451a03",
    accentColor: "#d97706",
    preview: "Open this when you miss me most...",
    tags: ["envelope", "vintage", "emotional"],
  },
  {
    id: "valentine-letter",
    name: "Love Letter",
    description: "Classic animated love letter in handwritten style",
    category: "valentine",
    style: "Vintage",
    emoji: "🖊️",
    gradient: "from-rose-50 via-amber-50 to-yellow-50",
    textColor: "#3b1224",
    accentColor: "#be123c",
    preview: "My darling, I sit here thinking of you...",
    tags: ["handwritten", "vintage", "letter"],
  },
  {
    id: "valentine-memories",
    name: "Our Valentine Memories",
    description: "Gallery of your Valentine's moments together",
    category: "valentine",
    style: "Scrapbook",
    emoji: "📷",
    gradient: "from-pink-100 via-rose-50 to-red-100",
    textColor: "#7f1d1d",
    accentColor: "#f43f5e",
    preview: "Every Valentine's was special — but this one...",
    tags: ["photos", "gallery", "scrapbook"],
  },

  // GOOD MORNING
  {
    id: "morning-my-love",
    name: "Good Morning, My Love",
    description: "Warm sunrise animation with gentle wakeup message",
    category: "goodmorning",
    style: "Romantic",
    emoji: "🌅",
    featured: true,
    gradient: "from-orange-400 via-amber-300 to-yellow-200",
    textColor: "#431407",
    accentColor: "#ea580c",
    preview: "Good morning, sunshine. You're the first thing I think about.",
    tags: ["sunrise", "warm", "romantic"],
  },
  {
    id: "morning-coffee",
    name: "Morning Coffee + Love",
    description: "Cozy morning aesthetic with coffee cup animation",
    category: "goodmorning",
    style: "Cute",
    emoji: "☕",
    gradient: "from-amber-100 via-orange-50 to-amber-50",
    textColor: "#431407",
    accentColor: "#b45309",
    preview: "Your smile is better than my morning coffee. And I love coffee.",
    tags: ["coffee", "cozy", "cute"],
  },
  {
    id: "morning-beautiful",
    name: "Wake Up Beautiful",
    description: "Soft pastel aesthetic for your morning person",
    category: "goodmorning",
    style: "Minimal",
    emoji: "🌸",
    gradient: "from-pink-50 via-rose-50 to-purple-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "Wake up, beautiful. The world needs your light today.",
    tags: ["soft", "minimal", "gentle"],
  },
  {
    id: "morning-reminder",
    name: "A Little Morning Reminder",
    description: "Simple but powerful love reminder to start the day",
    category: "goodmorning",
    style: "Minimal",
    emoji: "💭",
    gradient: "from-slate-50 to-gray-100",
    textColor: "#1e293b",
    accentColor: "#f43f5e",
    preview: "Reminder: You are loved. Deeply, truly, always.",
    tags: ["minimal", "reminder", "simple"],
  },
  {
    id: "morning-start-day",
    name: "Start Your Day With My Love",
    description: "Energetic morning boost with animated confetti",
    category: "goodmorning",
    style: "Cute",
    emoji: "🎊",
    gradient: "from-yellow-100 via-amber-50 to-orange-100",
    textColor: "#451a03",
    accentColor: "#f59e0b",
    preview: "Today is going to be amazing — I just know it!",
    tags: ["energetic", "confetti", "cute"],
  },
  {
    id: "morning-sunrise",
    name: "Sunrise For You",
    description: "Animated sunrise gradient that plays on load",
    category: "goodmorning",
    style: "Cinematic",
    emoji: "🌄",
    featured: true,
    gradient: "from-indigo-900 via-purple-800 via-rose-600 to-amber-400",
    textColor: "#fff",
    accentColor: "#fbbf24",
    preview: "I captured this sunrise for you. A new day. A new chance to love you.",
    tags: ["animated", "cinematic", "sunrise"],
  },
  {
    id: "morning-letter",
    name: "Morning Love Letter",
    description: "A heartfelt letter written just before dawn",
    category: "goodmorning",
    style: "Vintage",
    emoji: "📝",
    gradient: "from-amber-50 via-yellow-50 to-stone-50",
    textColor: "#292524",
    accentColor: "#a16207",
    preview: "I wrote this at 5am because I couldn't stop thinking about you.",
    tags: ["letter", "vintage", "heartfelt"],
  },

  // GOOD NIGHT
  {
    id: "night-my-love",
    name: "Good Night, My Love",
    description: "Deep starry night sky with a gentle goodnight message",
    category: "goodnight",
    style: "Cinematic",
    emoji: "🌙",
    featured: true,
    gradient: "from-slate-950 via-indigo-950 to-slate-950",
    textColor: "#e2e8f0",
    accentColor: "#c4b5fd",
    preview: "As you close your eyes, know that you are my favorite thought.",
    tags: ["starry", "night", "cinematic"],
  },
  {
    id: "night-sweet-dreams",
    name: "Sweet Dreams, Beautiful",
    description: "Soft dreamy aesthetic with floating stars",
    category: "goodnight",
    style: "Romantic",
    emoji: "⭐",
    gradient: "from-purple-950 via-violet-900 to-indigo-950",
    textColor: "#f3e8ff",
    accentColor: "#a78bfa",
    preview: "Sweet dreams, my love. I'll meet you there.",
    tags: ["dreamy", "stars", "soft"],
  },
  {
    id: "night-wish-here",
    name: "Wish You Were Here",
    description: "Longing goodnight message with poetic aesthetic",
    category: "goodnight",
    style: "Minimal",
    emoji: "🥺",
    gradient: "from-gray-900 to-slate-900",
    textColor: "#cbd5e1",
    accentColor: "#f43f5e",
    preview: "I reach for you in my sleep without realizing it.",
    tags: ["longing", "minimal", "poetic"],
  },
  {
    id: "night-before-sleep",
    name: "Before You Sleep...",
    description: "Final message of the day, tender and personal",
    category: "goodnight",
    style: "Elegant",
    emoji: "💬",
    gradient: "from-neutral-900 via-stone-900 to-zinc-900",
    textColor: "#fafafa",
    accentColor: "#fda4af",
    preview: "Before you sleep tonight, I want you to know...",
    tags: ["tender", "elegant", "personal"],
  },
  {
    id: "night-last-message",
    name: "One Last Message Tonight",
    description: "Late-night love note with cozy amber tones",
    category: "goodnight",
    style: "Vintage",
    emoji: "🕯️",
    gradient: "from-amber-950 via-stone-900 to-amber-950",
    textColor: "#fef3c7",
    accentColor: "#fbbf24",
    preview: "It's late. But I had to tell you — you made today better.",
    tags: ["late-night", "candle", "cozy"],
  },
  {
    id: "night-moonlight",
    name: "Moonlight Love",
    description: "Stars and moon animation with glowing text",
    category: "goodnight",
    style: "Cinematic",
    emoji: "🌕",
    featured: true,
    gradient: "from-indigo-950 via-blue-950 to-slate-950",
    textColor: "#e0f2fe",
    accentColor: "#bae6fd",
    preview: "The moon is beautiful tonight. But not as beautiful as you.",
    tags: ["moon", "stars", "glowing"],
  },
  {
    id: "night-heart",
    name: "Good Night From My Heart",
    description: "Heartfelt, sincere goodnight with animated heartbeat",
    category: "goodnight",
    style: "Romantic",
    emoji: "💓",
    gradient: "from-rose-950 via-pink-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "Goodnight. My heart beats a little slower without you.",
    tags: ["heartbeat", "sincere", "romantic"],
  },

  // MISS YOU
  {
    id: "missyou-i-miss",
    name: "I Miss You",
    description: "Raw, emotional miss you message with beautiful typography",
    category: "missyou",
    style: "Minimal",
    emoji: "💔",
    gradient: "from-slate-100 to-gray-200",
    textColor: "#1e293b",
    accentColor: "#f43f5e",
    preview: "I didn't know missing someone could feel this loud.",
    tags: ["emotional", "minimal", "honest"],
  },
  {
    id: "missyou-wish-here",
    name: "Wish You Were Here",
    description: "Cinematic distant memory aesthetic",
    category: "missyou",
    style: "Cinematic",
    emoji: "🌊",
    gradient: "from-blue-950 via-cyan-900 to-blue-950",
    textColor: "#e0f2fe",
    accentColor: "#38bdf8",
    preview: "There are moments so beautiful that feel incomplete without you.",
    tags: ["cinematic", "ocean", "longing"],
  },
  {
    id: "missyou-distance",
    name: "Distance Means Nothing",
    description: "Map with glowing line between two hearts, distance counter",
    category: "missyou",
    style: "Cinematic",
    emoji: "🗺️",
    featured: true,
    gradient: "from-slate-950 via-gray-900 to-slate-950",
    textColor: "#f1f5f9",
    accentColor: "#f43f5e",
    preview: "Only {distance} km between us, but you feel so close.",
    tags: ["map", "distance", "counter"],
  },
  {
    id: "missyou-cant-wait",
    name: "Can't Wait To See You",
    description: "Countdown to your next reunion",
    category: "missyou",
    style: "Cute",
    emoji: "🤗",
    gradient: "from-rose-50 via-pink-100 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "Every day without you is practice for forever with you.",
    tags: ["countdown", "reunion", "hopeful"],
  },
  {
    id: "missyou-until-together",
    name: "Until We're Together Again",
    description: "Poetic long-distance love with elegant design",
    category: "missyou",
    style: "Elegant",
    emoji: "🕊️",
    gradient: "from-neutral-900 to-stone-950",
    textColor: "#fafafa",
    accentColor: "#fda4af",
    preview: "Until I see you again, you live in my every thought.",
    tags: ["elegant", "poetic", "longing"],
  },
  {
    id: "missyou-open-when",
    name: "Open This When You Miss Me",
    description: "Sealed letter that opens to a warm message",
    category: "missyou",
    style: "Vintage",
    emoji: "📩",
    gradient: "from-amber-50 via-yellow-50 to-stone-50",
    textColor: "#292524",
    accentColor: "#d97706",
    preview: "I knew you'd open this. Because I miss you too.",
    tags: ["envelope", "warm", "vintage"],
  },

  // LOVE & ROMANTIC
  {
    id: "love-i-love-you",
    name: "I Love You",
    description: "Three simple words. Infinite meaning. Maximum impact.",
    category: "love",
    style: "Minimal",
    emoji: "❤️",
    featured: true,
    gradient: "from-rose-950 via-red-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "I love you. Not just today. Not just always. Infinitely.",
    tags: ["simple", "powerful", "minimal"],
  },
  {
    id: "love-everything",
    name: "You Mean Everything To Me",
    description: "Deep emotional declaration with cinematic presence",
    category: "love",
    style: "Cinematic",
    emoji: "🌌",
    gradient: "from-indigo-950 via-purple-950 to-blue-950",
    textColor: "#fff",
    accentColor: "#a78bfa",
    preview: "Before you, I didn't know what everything felt like.",
    tags: ["emotional", "cinematic", "deep"],
  },
  {
    id: "love-my-person",
    name: "You're My Person",
    description: "Warm, personal declaration of being chosen",
    category: "love",
    style: "Romantic",
    emoji: "🫂",
    gradient: "from-rose-100 via-pink-100 to-fuchsia-100",
    textColor: "#831843",
    accentColor: "#f43f5e",
    preview: "Out of everyone in the world — you're my person.",
    tags: ["personal", "warm", "romantic"],
  },
  {
    id: "love-make-happy",
    name: "You Make Me Happy",
    description: "Joyful, bright celebration of your person",
    category: "love",
    style: "Cute",
    emoji: "😊",
    gradient: "from-yellow-100 via-amber-50 to-orange-100",
    textColor: "#451a03",
    accentColor: "#f59e0b",
    preview: "You give me the kind of happiness that doesn't need a reason.",
    tags: ["joyful", "bright", "cute"],
  },
  {
    id: "love-forever",
    name: "My Forever",
    description: "Luxury declaration of eternal love",
    category: "love",
    style: "Luxury",
    emoji: "♾️",
    featured: true,
    gradient: "from-neutral-950 via-yellow-950 to-stone-950",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Forever is not enough. But I'll choose you in every one of them.",
    tags: ["luxury", "eternal", "gold"],
  },
  {
    id: "love-safe-place",
    name: "You're My Safe Place",
    description: "Tender message about comfort and belonging",
    category: "love",
    style: "Minimal",
    emoji: "🏡",
    gradient: "from-stone-50 via-warm-50 to-amber-50",
    textColor: "#292524",
    accentColor: "#d97706",
    preview: "In your arms, the whole world gets quieter.",
    tags: ["tender", "comfort", "minimal"],
  },
  {
    id: "love-thank-you-being",
    name: "Thank You For Being You",
    description: "Grateful love note celebrating who they are",
    category: "love",
    style: "Elegant",
    emoji: "🌷",
    gradient: "from-rose-50 to-pink-100",
    textColor: "#881337",
    accentColor: "#f43f5e",
    preview: "Thank you for being exactly who you are — it's perfect.",
    tags: ["grateful", "elegant", "sincere"],
  },
  {
    id: "love-just-because",
    name: "Just Because I Love You",
    description: "Spontaneous love message with no special occasion needed",
    category: "love",
    style: "Cute",
    emoji: "🎁",
    gradient: "from-fuchsia-50 via-pink-50 to-rose-100",
    textColor: "#831843",
    accentColor: "#a855f7",
    preview: "No occasion. No reason. Just... because I love you.",
    tags: ["spontaneous", "cute", "surprise"],
  },
  {
    id: "love-reminder",
    name: "A Little Reminder",
    description: "Small, powerful daily love reminder",
    category: "love",
    style: "Minimal",
    emoji: "💡",
    gradient: "from-white to-rose-50",
    textColor: "#1e293b",
    accentColor: "#f43f5e",
    preview: "Reminder: Someone loves you deeply. That someone is me.",
    tags: ["reminder", "minimal", "daily"],
  },
  {
    id: "love-home",
    name: "You Are My Home",
    description: "Deeply personal message about belonging",
    category: "love",
    style: "Dark Romance",
    emoji: "🕯️",
    featured: true,
    gradient: "from-gray-950 via-rose-950 to-gray-950",
    textColor: "#fce7f3",
    accentColor: "#f43f5e",
    preview: "Home isn't a place. Home is the sound of your voice.",
    tags: ["dark", "intense", "emotional"],
  },

  // APOLOGY
  {
    id: "apology-sorry",
    name: "I'm Sorry, My Love",
    description: "Sincere apology with an envelope reveal animation",
    category: "apology",
    style: "Elegant",
    emoji: "🙏",
    featured: true,
    gradient: "from-slate-900 via-stone-900 to-gray-900",
    textColor: "#f1f5f9",
    accentColor: "#fda4af",
    preview: "I'm sorry. Not because I have to be — because I want to be better for you.",
    tags: ["sincere", "envelope", "elegant"],
  },
  {
    id: "apology-start-again",
    name: "Can We Start Again?",
    description: "Hopeful apology asking for a fresh start",
    category: "apology",
    style: "Minimal",
    emoji: "🔄",
    gradient: "from-gray-50 to-slate-100",
    textColor: "#1e293b",
    accentColor: "#3b82f6",
    preview: "Let's erase the bad parts and keep writing our story.",
    tags: ["hopeful", "fresh start", "minimal"],
  },
  {
    id: "apology-didnt-mean",
    name: "I Didn't Mean To Hurt You",
    description: "Raw, honest apology about unintentional hurt",
    category: "apology",
    style: "Vintage",
    emoji: "💧",
    gradient: "from-stone-100 via-amber-50 to-stone-100",
    textColor: "#292524",
    accentColor: "#78716c",
    preview: "I would never want to be the reason for your tears.",
    tags: ["honest", "raw", "vintage"],
  },
  {
    id: "apology-make-right",
    name: "Let's Make Things Right",
    description: "Solution-focused apology with optimistic tone",
    category: "apology",
    style: "Cute",
    emoji: "🤝",
    gradient: "from-emerald-50 via-teal-50 to-green-50",
    textColor: "#064e3b",
    accentColor: "#10b981",
    preview: "I don't want to be right. I just want us to be okay.",
    tags: ["optimistic", "solution", "cute"],
  },
  {
    id: "apology-miss-smile",
    name: "I Miss Your Smile",
    description: "Tender apology focused on missing their happiness",
    category: "apology",
    style: "Romantic",
    emoji: "🥺",
    gradient: "from-rose-100 to-pink-100",
    textColor: "#881337",
    accentColor: "#f43f5e",
    preview: "I'm sorry because I miss your smile. Please bring it back.",
    tags: ["tender", "emotional", "romantic"],
  },
  {
    id: "apology-from-heart",
    name: "From My Heart, I'm Sorry",
    description: "Deep heartfelt apology from the soul",
    category: "apology",
    style: "Dark Romance",
    emoji: "💔",
    gradient: "from-gray-900 via-rose-950 to-gray-900",
    textColor: "#fce7f3",
    accentColor: "#f43f5e",
    preview: "These words come from the deepest part of me.",
    tags: ["deep", "dark", "sincere"],
  },
  {
    id: "apology-one-chance",
    name: "One More Chance",
    description: "Heartfelt plea for another chance in love",
    category: "apology",
    style: "Elegant",
    emoji: "🕊️",
    gradient: "from-neutral-900 to-stone-900",
    textColor: "#f5f5f5",
    accentColor: "#d4af37",
    preview: "Give me one more chance, and I'll spend it making it up to you.",
    tags: ["plea", "elegant", "sincere"],
  },

  // THANK YOU
  {
    id: "thanks-loving-me",
    name: "Thank You For Loving Me",
    description: "Grateful celebration of being loved unconditionally",
    category: "thankyou",
    style: "Romantic",
    emoji: "🙌",
    featured: true,
    gradient: "from-rose-900 via-pink-900 to-rose-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "Thank you for loving me — even on the days I made it hard.",
    tags: ["grateful", "unconditional", "romantic"],
  },
  {
    id: "thanks-always-there",
    name: "Thank You For Always Being There",
    description: "Recognition of consistent love and support",
    category: "thankyou",
    style: "Minimal",
    emoji: "🤗",
    gradient: "from-amber-50 to-yellow-100",
    textColor: "#451a03",
    accentColor: "#d97706",
    preview: "No matter the hour, you've always been there.",
    tags: ["support", "reliable", "grateful"],
  },
  {
    id: "thanks-lucky",
    name: "I'm Lucky To Have You",
    description: "Warm appreciation for your person",
    category: "thankyou",
    style: "Cute",
    emoji: "🍀",
    gradient: "from-green-50 via-emerald-50 to-teal-50",
    textColor: "#064e3b",
    accentColor: "#10b981",
    preview: "Of all the people in all the world — I got you. Lucky me.",
    tags: ["lucky", "cute", "warm"],
  },
  {
    id: "thanks-better-life",
    name: "You Make My Life Better",
    description: "Celebrating how they've elevated your world",
    category: "thankyou",
    style: "Elegant",
    emoji: "⭐",
    gradient: "from-neutral-900 via-amber-950 to-stone-900",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Before you, life was fine. With you, it's extraordinary.",
    tags: ["elegant", "elevated", "gold"],
  },
  {
    id: "thanks-choosing-me",
    name: "Thank You For Choosing Me",
    description: "Recognition of the choice they make daily",
    category: "thankyou",
    style: "Luxury",
    emoji: "💛",
    gradient: "from-yellow-950 via-amber-900 to-stone-950",
    textColor: "#fef3c7",
    accentColor: "#fbbf24",
    preview: "You choose me every single day. That means everything.",
    tags: ["choice", "luxury", "meaningful"],
  },
  {
    id: "thanks-everything-you-do",
    name: "For Everything You Do",
    description: "Gratitude for all the big and small gestures",
    category: "thankyou",
    style: "Vintage",
    emoji: "📜",
    gradient: "from-stone-50 via-amber-50 to-yellow-50",
    textColor: "#292524",
    accentColor: "#a16207",
    preview: "For the big things. The small things. The invisible things. Thank you.",
    tags: ["vintage", "gestures", "sincere"],
  },
  {
    id: "thanks-little",
    name: "A Little Thank You",
    description: "Simple, sweet gratitude card",
    category: "thankyou",
    style: "Cute",
    emoji: "🎀",
    gradient: "from-pink-50 via-rose-50 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "Just a little thank you. From my whole heart.",
    tags: ["simple", "sweet", "cute"],
  },

  // MILESTONES
  {
    id: "milestone-first-date",
    name: "Our First Date",
    description: "Celebrating the day it all began",
    category: "milestones",
    style: "Cinematic",
    emoji: "🍽️",
    featured: true,
    gradient: "from-rose-950 via-red-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "That first date — I didn't know my whole life was changing.",
    tags: ["cinematic", "first", "nostalgic"],
  },
  {
    id: "milestone-first-love",
    name: "First 'I Love You'",
    description: "The moment those three words changed everything",
    category: "milestones",
    style: "Elegant",
    emoji: "💬",
    gradient: "from-neutral-900 via-rose-950 to-stone-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "When you said it first, I felt it everywhere.",
    tags: ["first", "elegant", "emotional"],
  },
  {
    id: "milestone-first-kiss",
    name: "First Kiss",
    description: "Marking the first kiss anniversary",
    category: "milestones",
    style: "Romantic",
    emoji: "💋",
    gradient: "from-rose-100 via-pink-100 to-red-100",
    textColor: "#881337",
    accentColor: "#f43f5e",
    preview: "I still remember exactly how that felt.",
    tags: ["kiss", "romantic", "nostalgic"],
  },
  {
    id: "milestone-100days",
    name: "100 Days Together",
    description: "Celebrating 100 days of being together",
    category: "milestones",
    style: "Cute",
    emoji: "💯",
    gradient: "from-pink-50 via-rose-100 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "100 days of you. And I'd choose all 100 again.",
    tags: ["100days", "cute", "celebration"],
  },
  {
    id: "milestone-6months",
    name: "6 Months Together",
    description: "Half a year milestone celebration",
    category: "milestones",
    style: "Elegant",
    emoji: "🌙",
    gradient: "from-purple-950 via-violet-900 to-indigo-950",
    textColor: "#f3e8ff",
    accentColor: "#a78bfa",
    preview: "6 months. 180 days. One extraordinary us.",
    tags: ["6months", "elegant", "purple"],
  },
  {
    id: "milestone-1year",
    name: "1 Year Together",
    description: "Epic one year anniversary celebration template",
    category: "milestones",
    style: "Luxury",
    emoji: "🏆",
    featured: true,
    gradient: "from-yellow-950 via-amber-900 to-stone-950",
    textColor: "#fef3c7",
    accentColor: "#d4af37",
    preview: "365 days. A thousand smiles. One perfect year with you.",
    tags: ["1year", "luxury", "gold"],
  },
  {
    id: "milestone-2years",
    name: "2 Years Together",
    description: "Two year milestone with relationship stats",
    category: "milestones",
    style: "Cinematic",
    emoji: "✨",
    gradient: "from-rose-950 via-pink-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "2 years. 730 mornings I chose you.",
    tags: ["2years", "stats", "cinematic"],
  },
  {
    id: "milestone-first-trip",
    name: "Our First Trip",
    description: "Travel memory milestone with destination aesthetic",
    category: "milestones",
    style: "Scrapbook",
    emoji: "✈️",
    gradient: "from-sky-100 via-blue-50 to-cyan-100",
    textColor: "#0c4a6e",
    accentColor: "#0ea5e9",
    preview: "Our first trip together. Every city feels more beautiful with you.",
    tags: ["travel", "scrapbook", "adventure"],
  },
  {
    id: "milestone-we-met",
    name: "We Met On This Day",
    description: "Celebrating the anniversary of meeting",
    category: "milestones",
    style: "Vintage",
    emoji: "📅",
    gradient: "from-amber-50 via-stone-50 to-yellow-50",
    textColor: "#292524",
    accentColor: "#b45309",
    preview: "On this exact day, everything changed. You happened.",
    tags: ["vintage", "anniversary", "meeting"],
  },
  {
    id: "milestone-became-us",
    name: "The Day We Became Us",
    description: "Marking the official start of being together",
    category: "milestones",
    style: "Dark Romance",
    emoji: "🌹",
    gradient: "from-gray-950 via-rose-950 to-gray-950",
    textColor: "#fce7f3",
    accentColor: "#f43f5e",
    preview: "The day before — I didn't know what I was missing.",
    tags: ["dark", "intense", "beginning"],
  },

  // LONG DISTANCE
  {
    id: "ld-miles-apart",
    name: "Miles Apart, Hearts Together",
    description: "Long distance love with glowing map connection",
    category: "longdistance",
    style: "Cinematic",
    emoji: "🌍",
    featured: true,
    gradient: "from-slate-950 via-blue-950 to-slate-950",
    textColor: "#e2e8f0",
    accentColor: "#60a5fa",
    preview: "{distance} km between us. Zero distance between our hearts.",
    tags: ["map", "distance", "cinematic"],
  },
  {
    id: "ld-until-see",
    name: "Until I See You Again",
    description: "Countdown to reunion with hopeful message",
    category: "longdistance",
    style: "Minimal",
    emoji: "⏳",
    gradient: "from-gray-50 to-slate-100",
    textColor: "#1e293b",
    accentColor: "#f43f5e",
    preview: "Every single day is one day closer to you.",
    tags: ["countdown", "hopeful", "minimal"],
  },
  {
    id: "ld-distance-story",
    name: "Our Distance Story",
    description: "Timeline of your long-distance journey",
    category: "longdistance",
    style: "Elegant",
    emoji: "📖",
    gradient: "from-neutral-900 to-stone-900",
    textColor: "#fafafa",
    accentColor: "#fda4af",
    preview: "We never chose the distance. We chose each other instead.",
    tags: ["story", "elegant", "timeline"],
  },
  {
    id: "ld-counting-down",
    name: "Counting Down To You",
    description: "Days/hours/minutes until the next visit",
    category: "longdistance",
    style: "Cute",
    emoji: "📆",
    gradient: "from-rose-50 via-pink-100 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "{days} days, {hours} hours until I hold you again.",
    tags: ["countdown", "cute", "timer"],
  },
  {
    id: "ld-across-miles",
    name: "Across The Miles",
    description: "Poetic long distance love across time zones",
    category: "longdistance",
    style: "Dark Romance",
    emoji: "🌃",
    gradient: "from-gray-950 via-indigo-950 to-gray-950",
    textColor: "#e0e7ff",
    accentColor: "#a78bfa",
    preview: "We live in different time zones but love in the same heartbeat.",
    tags: ["dark", "poetic", "timezones"],
  },
  {
    id: "ld-no-distance",
    name: "No Distance Can Change Us",
    description: "Strong declaration that distance won't break them",
    category: "longdistance",
    style: "Luxury",
    emoji: "💎",
    gradient: "from-yellow-950 via-stone-950 to-amber-950",
    textColor: "#fef3c7",
    accentColor: "#d4af37",
    preview: "The distance is temporary. The love is permanent.",
    tags: ["strong", "luxury", "permanent"],
  },
  {
    id: "ld-next-visit",
    name: "Next Visit Countdown",
    description: "Exciting countdown with visit details",
    category: "longdistance",
    style: "Cinematic",
    emoji: "🛫",
    gradient: "from-sky-950 via-blue-900 to-cyan-950",
    textColor: "#e0f2fe",
    accentColor: "#38bdf8",
    preview: "{days} more days. Then I never want to let go.",
    tags: ["visit", "cinematic", "exciting"],
  },

  // PROPOSAL
  {
    id: "proposal-will-you",
    name: "Will You Marry Me?",
    description: "The ultimate proposal card with ring animation",
    category: "proposal",
    style: "Luxury",
    emoji: "💍",
    featured: true,
    premium: true,
    gradient: "from-yellow-950 via-amber-900 to-stone-950",
    textColor: "#fef3c7",
    accentColor: "#d4af37",
    preview: "With every heartbeat — will you marry me?",
    tags: ["proposal", "ring", "luxury"],
  },
  {
    id: "proposal-forever-starts",
    name: "Our Forever Starts Here",
    description: "Romantic beginning of forever proposal",
    category: "proposal",
    style: "Cinematic",
    emoji: "✨",
    gradient: "from-rose-950 via-pink-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "This is it. The beginning of our forever.",
    tags: ["forever", "cinematic", "beginning"],
  },
  {
    id: "proposal-future-wife",
    name: "To My Future Wife",
    description: "Pre-proposal love letter to the future bride",
    category: "proposal",
    style: "Elegant",
    emoji: "👰",
    gradient: "from-neutral-900 via-rose-950 to-stone-900",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "I can't wait to call you my wife. Will you let me?",
    tags: ["bride", "elegant", "emotional"],
  },
  {
    id: "proposal-future-husband",
    name: "To My Future Husband",
    description: "Pre-proposal love letter to the future groom",
    category: "proposal",
    style: "Elegant",
    emoji: "🤵",
    gradient: "from-slate-900 via-gray-900 to-neutral-900",
    textColor: "#f1f5f9",
    accentColor: "#d4af37",
    preview: "I want to spend every day of my life loving you. Say yes?",
    tags: ["groom", "elegant", "emotional"],
  },
  {
    id: "proposal-beginning",
    name: "The Beginning of Forever",
    description: "Poetic proposal with animated stars",
    category: "proposal",
    style: "Dark Romance",
    emoji: "🌌",
    gradient: "from-indigo-950 via-purple-950 to-blue-950",
    textColor: "#e0e7ff",
    accentColor: "#a78bfa",
    preview: "Every love story has a beginning. Let this be ours.",
    tags: ["dark", "stars", "poetic"],
  },
  {
    id: "proposal-next-chapter",
    name: "Our Next Chapter",
    description: "Book-themed proposal for the next stage of life",
    category: "proposal",
    style: "Vintage",
    emoji: "📚",
    gradient: "from-amber-100 via-stone-100 to-yellow-50",
    textColor: "#292524",
    accentColor: "#b45309",
    preview: "Our story is the best I've ever read. Can we write the next chapter together?",
    tags: ["book", "vintage", "chapter"],
  },
  {
    id: "proposal-she-said-yes",
    name: "She Said Yes! 🎉",
    description: "Post-proposal celebration announcement",
    category: "proposal",
    style: "Cute",
    emoji: "🎊",
    gradient: "from-rose-100 via-pink-100 to-fuchsia-100",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "SHE SAID YES! 🎉 We're getting married!",
    tags: ["celebration", "announcement", "cute"],
  },
  {
    id: "proposal-he-said-yes",
    name: "He Said Yes! 🎉",
    description: "Post-proposal celebration for him saying yes",
    category: "proposal",
    style: "Elegant",
    emoji: "💍",
    gradient: "from-blue-950 via-indigo-900 to-slate-950",
    textColor: "#e0e7ff",
    accentColor: "#60a5fa",
    preview: "HE SAID YES! 💍 We're officially engaged!",
    tags: ["celebration", "engagement", "elegant"],
  },

  // WEDDING
  {
    id: "wedding-our-day",
    name: "Our Wedding Day",
    description: "Cinematic wedding day card with premium aesthetic",
    category: "wedding",
    style: "Luxury",
    emoji: "👰",
    featured: true,
    premium: true,
    gradient: "from-yellow-50 via-amber-50 to-white",
    textColor: "#451a03",
    accentColor: "#d4af37",
    preview: "Today, I marry my best friend.",
    tags: ["wedding", "luxury", "gold"],
  },
  {
    id: "wedding-we-said-i-do",
    name: "We Said I Do",
    description: "Announcement of the wedding vows exchanged",
    category: "wedding",
    style: "Elegant",
    emoji: "💒",
    gradient: "from-stone-50 via-rose-50 to-amber-50",
    textColor: "#292524",
    accentColor: "#f43f5e",
    preview: "We said I do — and we meant every word.",
    tags: ["vows", "elegant", "announcement"],
  },
  {
    id: "wedding-forever-begins",
    name: "Forever Begins Today",
    description: "Romantic declaration of the wedding day",
    category: "wedding",
    style: "Romantic",
    emoji: "🕊️",
    gradient: "from-rose-100 via-pink-100 to-white",
    textColor: "#881337",
    accentColor: "#f43f5e",
    preview: "Today, forever begins. And I've never been more ready.",
    tags: ["romantic", "forever", "wedding"],
  },
  {
    id: "wedding-two-hearts",
    name: "Two Hearts, One Journey",
    description: "Wedding card celebrating the union of two souls",
    category: "wedding",
    style: "Cinematic",
    emoji: "💑",
    gradient: "from-rose-950 via-red-900 to-rose-950",
    textColor: "#fff",
    accentColor: "#fda4af",
    preview: "Two hearts. One soul. One beautiful journey.",
    tags: ["cinematic", "union", "journey"],
  },
  {
    id: "wedding-special-day",
    name: "Our Special Day",
    description: "Personalized wedding day card with photo",
    category: "wedding",
    style: "Scrapbook",
    emoji: "📸",
    gradient: "from-amber-50 via-rose-50 to-pink-50",
    textColor: "#292524",
    accentColor: "#f43f5e",
    preview: "Our special day, captured forever.",
    tags: ["photo", "scrapbook", "personal"],
  },
  {
    id: "wedding-mr-mrs",
    name: "Mr. & Mrs.",
    description: "Classic and elegant Mr. & Mrs. announcement",
    category: "wedding",
    style: "Luxury",
    emoji: "💍",
    gradient: "from-neutral-950 via-amber-950 to-stone-950",
    textColor: "#fff",
    accentColor: "#d4af37",
    preview: "Mr. & Mrs. — the most beautiful title we'll ever hold.",
    tags: ["luxury", "title", "gold"],
  },
  {
    id: "wedding-new-chapter",
    name: "A New Chapter",
    description: "Wedding as the beginning of a beautiful new story",
    category: "wedding",
    style: "Vintage",
    emoji: "📖",
    gradient: "from-stone-100 via-amber-50 to-yellow-50",
    textColor: "#1c1917",
    accentColor: "#b45309",
    preview: "A new chapter. The best one yet.",
    tags: ["vintage", "chapter", "story"],
  },

  // FESTIVAL
  {
    id: "festival-eid",
    name: "Eid Mubarak, My Love",
    description: "Romantic Eid greeting for your partner",
    category: "festival",
    style: "Luxury",
    emoji: "🌙",
    featured: true,
    gradient: "from-emerald-950 via-teal-900 to-green-950",
    textColor: "#d1fae5",
    accentColor: "#34d399",
    preview: "Eid Mubarak, my love. May this Eid bring us closer.",
    tags: ["eid", "luxury", "religious"],
  },
  {
    id: "festival-eid-gift",
    name: "Eid Gift For You",
    description: "A special Eid surprise card",
    category: "festival",
    style: "Cute",
    emoji: "🎁",
    gradient: "from-emerald-50 via-teal-50 to-green-50",
    textColor: "#064e3b",
    accentColor: "#10b981",
    preview: "Eid Mubarak! I have a little something for you...",
    tags: ["eid", "gift", "cute"],
  },
  {
    id: "festival-ramadan",
    name: "Ramadan With You",
    description: "Ramadan card for your love during the holy month",
    category: "festival",
    style: "Elegant",
    emoji: "☪️",
    gradient: "from-green-950 via-emerald-900 to-teal-950",
    textColor: "#ecfdf5",
    accentColor: "#6ee7b7",
    preview: "This Ramadan is blessed — because I'm spending it with you.",
    tags: ["ramadan", "elegant", "religious"],
  },
  {
    id: "festival-christmas",
    name: "Christmas With My Love",
    description: "Warm Christmas card for your partner",
    category: "festival",
    style: "Cute",
    emoji: "🎄",
    gradient: "from-red-900 via-green-900 to-red-900",
    textColor: "#fff",
    accentColor: "#fbbf24",
    preview: "This Christmas, my gift is you. Again.",
    tags: ["christmas", "cute", "holiday"],
  },
  {
    id: "festival-new-year",
    name: "New Year Together",
    description: "New Year card looking forward to another year with you",
    category: "festival",
    style: "Cinematic",
    emoji: "🎆",
    gradient: "from-indigo-950 via-purple-900 to-blue-950",
    textColor: "#e0e7ff",
    accentColor: "#818cf8",
    preview: "New year. Same love. Infinite possibilities.",
    tags: ["new year", "cinematic", "fireworks"],
  },
  {
    id: "festival-womens-day",
    name: "Women's Day",
    description: "Celebrating her on International Women's Day",
    category: "festival",
    style: "Elegant",
    emoji: "🌸",
    gradient: "from-purple-900 via-pink-900 to-rose-900",
    textColor: "#fdf4ff",
    accentColor: "#f0abfc",
    preview: "Today the world celebrates women. I celebrate you every day.",
    tags: ["womens-day", "elegant", "celebration"],
  },
  {
    id: "festival-mens-day",
    name: "Men's Day",
    description: "Celebrating him on International Men's Day",
    category: "festival",
    style: "Minimal",
    emoji: "💙",
    gradient: "from-blue-950 via-indigo-900 to-slate-950",
    textColor: "#dbeafe",
    accentColor: "#60a5fa",
    preview: "Happy Men's Day to the man who makes every day better.",
    tags: ["mens-day", "minimal", "blue"],
  },
  {
    id: "festival-mothers-day",
    name: "Mother's Day",
    description: "Celebrating her as a mother on Mother's Day",
    category: "festival",
    style: "Romantic",
    emoji: "🌷",
    gradient: "from-rose-100 via-pink-100 to-fuchsia-100",
    textColor: "#831843",
    accentColor: "#f43f5e",
    preview: "You're not just my love — you're the most beautiful mother.",
    tags: ["mothers-day", "romantic", "flowers"],
  },
  {
    id: "festival-fathers-day",
    name: "Father's Day",
    description: "Celebrating him as a father on Father's Day",
    category: "festival",
    style: "Elegant",
    emoji: "👨‍👧",
    gradient: "from-amber-950 via-stone-900 to-amber-950",
    textColor: "#fef3c7",
    accentColor: "#d97706",
    preview: "Happy Father's Day to the man who holds our world together.",
    tags: ["fathers-day", "elegant", "warm"],
  },
  {
    id: "festival-birthday-general",
    name: "Birthday (General)",
    description: "A universal birthday card for any occasion",
    category: "festival",
    style: "Cute",
    emoji: "🎈",
    gradient: "from-pink-100 via-purple-100 to-blue-100",
    textColor: "#4a044e",
    accentColor: "#a855f7",
    preview: "Happy Birthday! May this year bring you everything you deserve.",
    tags: ["birthday", "cute", "general"],
  },

  // FUN
  {
    id: "fun-more-in-love",
    name: "Who's More In Love? 😄",
    description: "Fun interactive quiz — who loves who more?",
    category: "fun",
    style: "Cute",
    emoji: "🤔",
    featured: true,
    gradient: "from-pink-50 via-rose-100 to-fuchsia-50",
    textColor: "#831843",
    accentColor: "#ec4899",
    preview: "Science says: You are 100% more in love. Sorry! 😂",
    tags: ["quiz", "fun", "interactive"],
  },
  {
    id: "fun-quiz",
    name: "How Well Do You Know Me?",
    description: "A personalized quiz about your relationship",
    category: "fun",
    style: "Cute",
    emoji: "🧠",
    gradient: "from-violet-50 via-purple-100 to-fuchsia-50",
    textColor: "#4c1d95",
    accentColor: "#a855f7",
    preview: "Question 1: What is my biggest pet peeve?",
    tags: ["quiz", "interactive", "fun"],
  },
  {
    id: "fun-10-things",
    name: "10 Things About Us",
    description: "10 unique facts about your relationship",
    category: "fun",
    style: "Scrapbook",
    emoji: "📋",
    gradient: "from-yellow-50 via-amber-50 to-orange-50",
    textColor: "#451a03",
    accentColor: "#f59e0b",
    preview: "1. We always argue about the temperature. 2. We always make up.",
    tags: ["scrapbook", "facts", "fun"],
  },
  {
    id: "fun-bingo",
    name: "Couple Bingo",
    description: "Bingo card of couple things you've done together",
    category: "fun",
    style: "Cute",
    emoji: "🎯",
    gradient: "from-green-50 via-emerald-100 to-teal-50",
    textColor: "#064e3b",
    accentColor: "#10b981",
    preview: "Stayed up all night talking? BINGO!",
    tags: ["bingo", "game", "fun"],
  },
  {
    id: "fun-this-or-that",
    name: "This Or That",
    description: "Fun couple's this or that game",
    category: "fun",
    style: "Cute",
    emoji: "🆚",
    gradient: "from-orange-50 via-amber-100 to-yellow-50",
    textColor: "#451a03",
    accentColor: "#f97316",
    preview: "Beach 🏖️ OR Mountains ⛰️?",
    tags: ["game", "choice", "fun"],
  },
  {
    id: "fun-inside-jokes",
    name: "Our Inside Jokes",
    description: "A collection of your couple's inside jokes",
    category: "fun",
    style: "Scrapbook",
    emoji: "😂",
    gradient: "from-amber-100 via-yellow-50 to-lime-50",
    textColor: "#1a2e05",
    accentColor: "#65a30d",
    preview: "Remember when you said... 😂😂😂",
    tags: ["jokes", "funny", "scrapbook"],
  },
  {
    id: "fun-who-said-first",
    name: "Who Said It First?",
    description: "Tracking who said relationship milestones first",
    category: "fun",
    style: "Cute",
    emoji: "🗣️",
    gradient: "from-pink-50 via-rose-50 to-red-50",
    textColor: "#7f1d1d",
    accentColor: "#dc2626",
    preview: "Who said 'I love you' first? (It was you — but I thought it first!)",
    tags: ["trivia", "fun", "couple"],
  },
  {
    id: "fun-couple-stats",
    name: "Our Couple Stats",
    description: "Fun relationship statistics with animated counters",
    category: "fun",
    style: "Minimal",
    emoji: "📊",
    gradient: "from-slate-50 to-gray-100",
    textColor: "#0f172a",
    accentColor: "#f43f5e",
    preview: "Dates: 47 | Late nights: 203 | I love yous: ∞",
    tags: ["stats", "counter", "minimal"],
  },
  {
    id: "fun-relationship-wrapped",
    name: "Relationship Wrapped",
    description: "Spotify-style year-in-review of your relationship",
    category: "fun",
    style: "Cinematic",
    emoji: "🎵",
    featured: true,
    premium: true,
    gradient: "from-gray-950 via-green-950 to-gray-950",
    textColor: "#fff",
    accentColor: "#22c55e",
    preview: "OUR LOVE — 2026 | 12 dates | 365 reasons to love you",
    tags: ["wrapped", "stats", "spotify"],
  },
  {
    id: "fun-love-wrapped",
    name: "Our Love Wrapped",
    description: "Personalized yearly recap of your love story",
    category: "fun",
    style: "Dark Romance",
    emoji: "🎁",
    featured: true,
    gradient: "from-neutral-950 via-rose-950 to-neutral-950",
    textColor: "#fce7f3",
    accentColor: "#f43f5e",
    preview: "And one person I would choose again. And again. And again.",
    tags: ["wrapped", "recap", "dark"],
  },
];

/* ─────────────────────────────────────────────
   STYLE OPTIONS
───────────────────────────────────────────── */
const STYLES = [
  { id: "all", label: "All Styles", color: "#f43f5e" },
  { id: "Elegant", label: "Elegant", color: "#d4af37" },
  { id: "Romantic", label: "Romantic", color: "#f43f5e" },
  { id: "Minimal", label: "Minimal", color: "#64748b" },
  { id: "Cute", label: "Cute", color: "#ec4899" },
  { id: "Luxury", label: "Luxury", color: "#b45309" },
  { id: "Vintage", label: "Vintage", color: "#92400e" },
  { id: "Scrapbook", label: "Scrapbook", color: "#65a30d" },
  { id: "Cinematic", label: "Cinematic", color: "#6366f1" },
  { id: "Dark Romance", label: "Dark Romance", color: "#9f1239" },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function WishesMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Creator form state
  const [formData, setFormData] = useState({
    partnerName: "",
    yourName: "",
    message: "",
    memory: "",
    distance: "",
    days: "",
    musicMood: "romantic",
    theme: "",
  });

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Filtered templates
  const filteredTemplates = TEMPLATES.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesStyle = selectedStyle === "all" || t.style === selectedStyle;
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesStyle && matchesSearch;
  });

  const featuredTemplates = TEMPLATES.filter((t) => t.featured);

  const handleCreateWish = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setFormData((prev) => ({ ...prev, theme: template.style }));
    setCreatorOpen(true);
    setGeneratedUrl(null);
  }, []);

  const handlePreview = useCallback((template: Template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }, []);

  const handleGenerateWish = useCallback(async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setGenerationError(null);
    const payload = {
      slug: selectedTemplate.id,
      to: formData.partnerName || "My Love",
      from: formData.yourName || "Your Love",
      msg: formData.message || selectedTemplate.preview,
      memory: formData.memory,
      distance: formData.distance,
      days: formData.days,
    };
    try {
      const response = await fetch("/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your wish could not be saved.");
      setGeneratedUrl(data.url);
    } catch (error) { setGenerationError(error instanceof Error ? error.message : "Please try again."); }
    finally { setGenerating(false); }
  }, [selectedTemplate, formData]);

  const handleCopyUrl = useCallback(() => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [generatedUrl]);

  return (
    <div className="min-h-screen bg-[#fff6f8]">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-24 pb-16 px-4">
        {/* Ambient background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="absolute top-10 right-[5%] w-96 h-96 rounded-full bg-pink-300/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 rounded-full bg-fuchsia-200/15 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>100+ Beautiful Templates</span>
            <Sparkles className="w-3.5 h-3.5" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-[#280816] leading-tight mb-4"
          >
            Send{" "}
            <span className="font-script text-5xl sm:text-6xl md:text-7xl text-gradient-script">
              Love
            </span>{" "}
            That Stays
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#6e2b46] text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Choose a template. Personalize it with your names, photos & memories.
            Share a beautiful link your partner will never forget.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative max-w-lg mx-auto"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wishes... birthday, anniversary, miss you..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/90 border border-rose-200 shadow-lg text-sm text-[#280816] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition-all"
            />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURED ── */}
      {searchQuery === "" && selectedCategory === "all" && selectedStyle === "all" && (
        <section className="px-4 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="font-serif text-xl font-bold text-[#280816]">Featured Templates</h2>
              <span className="text-xs text-rose-400 font-medium ml-1">Most loved ✨</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {featuredTemplates.slice(0, 8).map((template, i) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={i}
                  onPreview={handlePreview}
                  onCreate={handleCreateWish}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CATEGORY TABS ── */}
      <section className="sticky top-16 z-20 bg-[#fff6f8]/95 backdrop-blur-xl border-b border-rose-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex gap-3">
          {/* Category scroll */}
          <div
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "text-white shadow-md scale-105"
                    : "bg-white/70 text-[#6e2b46] border border-rose-200/60 hover:bg-rose-50 hover:scale-102"
                }`}
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}50` }
                    : {}
                }
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style filter */}
        <div className="max-w-6xl mx-auto mt-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                selectedStyle === style.id
                  ? "text-white"
                  : "bg-white/50 text-[#9c4c6a] border border-rose-100 hover:bg-rose-50"
              }`}
              style={selectedStyle === style.id ? { backgroundColor: style.color } : {}}
            >
              {style.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── TEMPLATE GRID ── */}
      <section className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[#9c4c6a]">
              <span className="font-bold text-[#280816]">{filteredTemplates.length}</span> templates
              {selectedCategory !== "all" && (
                <> in <span className="font-bold text-rose-600">{CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span></>
              )}
            </p>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">💔</div>
              <p className="text-[#9c4c6a] font-medium">No templates found.</p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setSelectedStyle("all"); }}
                className="mt-3 text-rose-600 text-sm font-bold hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <AnimatePresence>
                {filteredTemplates.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={i}
                    onPreview={handlePreview}
                    onCreate={handleCreateWish}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── PREVIEW MODAL ── */}
      <AnimatePresence>
        {previewOpen && previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview card */}
              <div className={`bg-gradient-to-br ${previewTemplate.gradient} p-8 min-h-[400px] flex flex-col justify-between`}>
                <div className="flex justify-between items-start">
                  <span className="text-3xl">{previewTemplate.emoji}</span>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-3 bg-white/20 backdrop-blur-sm"
                    style={{ color: previewTemplate.textColor }}
                  >
                    {previewTemplate.style}
                  </span>
                  <h3
                    className="font-serif text-2xl font-bold mb-2 leading-snug"
                    style={{ color: previewTemplate.textColor }}
                  >
                    {previewTemplate.name}
                  </h3>
                  <p
                    className="text-sm italic leading-relaxed opacity-90 mb-6"
                    style={{ color: previewTemplate.textColor }}
                  >
                    &ldquo;{previewTemplate.preview}&rdquo;
                  </p>
                  <div className="flex flex-wrap gap-1 mb-6">
                    {previewTemplate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15"
                        style={{ color: previewTemplate.textColor }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPreviewOpen(false);
                    handleCreateWish(previewTemplate);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                  style={{ backgroundColor: previewTemplate.accentColor, color: "#fff" }}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Create This Wish</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATOR MODAL ── */}
      <AnimatePresence>
        {creatorOpen && selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
            onClick={() => { setCreatorOpen(false); setGeneratedUrl(null); }}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Creator header */}
              <div className={`bg-gradient-to-r ${selectedTemplate.gradient} p-6 pb-8`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedTemplate.emoji}</span>
                    <div>
                      <p className="text-white/70 text-xs font-medium">{selectedTemplate.style}</p>
                      <h3 className="text-white font-serif font-bold text-lg leading-tight">
                        {selectedTemplate.name}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCreatorOpen(false); setGeneratedUrl(null); }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white/80 text-sm italic">
                  &ldquo;{selectedTemplate.preview}&rdquo;
                </p>
              </div>

              {/* Tabs body */}
              <div className="p-6 space-y-5">
                {!generatedUrl ? (
                  <>
                    <p className="text-sm font-bold text-[#280816] flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-rose-500" />
                      Personalize Your Wish
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                          Partner&apos;s Name *
                        </label>
                        <input
                          type="text"
                          value={formData.partnerName}
                          onChange={(e) => setFormData((p) => ({ ...p, partnerName: e.target.value }))}
                          placeholder="Sarah"
                          className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#280816] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={formData.yourName}
                          onChange={(e) => setFormData((p) => ({ ...p, yourName: e.target.value }))}
                          placeholder="Your name"
                          className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#280816] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                        Your Personal Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                        placeholder="Write something from the heart..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#280816] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                        A Memory (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.memory}
                        onChange={(e) => setFormData((p) => ({ ...p, memory: e.target.value }))}
                        placeholder="Our first trip to Islamabad..."
                        className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-[#280816] placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                      />
                    </div>

                    {/* Conditional fields */}
                    {(selectedTemplate.category === "missyou" || selectedTemplate.category === "longdistance") && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                            <MapPin className="w-3 h-3 inline mr-1" />Distance (km)
                          </label>
                          <input
                            type="text"
                            value={formData.distance}
                            onChange={(e) => setFormData((p) => ({ ...p, distance: e.target.value }))}
                            placeholder="1,842"
                            className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#9c4c6a] mb-1">
                            <Clock className="w-3 h-3 inline mr-1" />Days Until Visit
                          </label>
                          <input
                            type="text"
                            value={formData.days}
                            onChange={(e) => setFormData((p) => ({ ...p, days: e.target.value }))}
                            placeholder="17"
                            className="w-full px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                          />
                        </div>
                      </div>
                    )}

                    {/* Music mood */}
                    <div>
                      <label className="block text-xs font-bold text-[#9c4c6a] mb-2">
                        <Music className="w-3 h-3 inline mr-1" />Music Mood
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["romantic", "cozy", "dramatic", "cheerful", "melancholic", "none"].map((mood) => (
                          <button
                            key={mood}
                            onClick={() => setFormData((p) => ({ ...p, musicMood: mood }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer capitalize ${
                              formData.musicMood === mood
                                ? "bg-rose-500 text-white shadow-md"
                                : "bg-rose-50 text-[#9c4c6a] border border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateWish}
                      disabled={generating}
                      className="w-full py-4 rounded-2xl btn-love-primary font-bold text-white flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{generating ? "Saving your wish..." : "Generate My Wish"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {generationError && <p role="alert" className="text-sm text-rose-700">{generationError}</p>}
                  </>
                ) : (
                  /* ── Generated URL Screen ── */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-3">✨</div>
                      <h3 className="font-serif text-xl font-bold text-[#280816] mb-1">
                        Your Wish Is Ready!
                      </h3>
                      <p className="text-sm text-[#9c4c6a]">
                        Share this link with{" "}
                        <strong>{formData.partnerName || "your partner"}</strong> for a
                        cinematic experience they&apos;ll never forget.
                      </p>
                    </div>

                    {/* URL box */}
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 break-all">
                      <p className="text-[11px] text-rose-500 font-bold mb-1">SHAREABLE LINK</p>
                      <p className="text-xs text-[#280816] font-mono leading-relaxed">
                        {generatedUrl}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCopyUrl}
                        className="flex-1 py-3 rounded-xl border-2 border-rose-300 text-rose-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                      <a
                        href={generatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 rounded-xl btn-love-primary text-white font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </a>
                    </div>

                    {/* Share options */}
                    <div className="border-t border-rose-100 pt-4">
                      <p className="text-xs text-center text-[#9c4c6a] mb-3 font-medium">
                        Share via
                      </p>
                      <div className="flex justify-center gap-3">
                        {[
                          {
                            label: "WhatsApp",
                            emoji: "💬",
                            url: `https://wa.me/?text=${encodeURIComponent(`I made something for you 💕 ${generatedUrl}`)}`,
                          },
                          {
                            label: "Copy",
                            emoji: "📋",
                            action: handleCopyUrl,
                          },
                          {
                            label: "More",
                            emoji: "↗️",
                            action: () => {
                              if (navigator.share) {
                                navigator.share({ title: `A wish from ${formData.yourName}`, url: generatedUrl! });
                              }
                            },
                          },
                        ].map((opt) => (
                          opt.url ? (
                            <a
                              key={opt.label}
                              href={opt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-1 cursor-pointer group"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-xl group-hover:bg-rose-100 transition-colors">
                                {opt.emoji}
                              </div>
                              <span className="text-[10px] text-[#9c4c6a] font-medium">{opt.label}</span>
                            </a>
                          ) : (
                            <button
                              key={opt.label}
                              onClick={opt.action}
                              className="flex flex-col items-center gap-1 cursor-pointer group"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-xl group-hover:bg-rose-100 transition-colors">
                                {opt.emoji}
                              </div>
                              <span className="text-[10px] text-[#9c4c6a] font-medium">{opt.label}</span>
                            </button>
                          )
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => { setGeneratedUrl(null); }}
                      className="w-full py-2 text-xs text-[#9c4c6a] hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      ← Edit wish details
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE CARD SUB-COMPONENT
───────────────────────────────────────────── */
function TemplateCard({
  template,
  index,
  onPreview,
  onCreate,
}: {
  template: Template;
  index: number;
  onPreview: (t: Template) => void;
  onCreate: (t: Template) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      layout
      className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      {/* Card gradient background */}
      <div className={`bg-gradient-to-br ${template.gradient} p-4 pb-3 min-h-[160px] flex flex-col justify-between relative overflow-hidden`}>
        {/* Decorative shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />

        <div className="flex justify-between items-start">
          <span className="text-2xl">{template.emoji}</span>
          <div className="flex flex-col items-end gap-1">
            {template.featured && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/90 text-amber-900 text-[9px] font-bold flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-900" /> Featured
              </span>
            )}
            {template.premium && (
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-300/90 text-yellow-900 text-[9px] font-bold">
                ✦ Premium
              </span>
            )}
          </div>
        </div>

        <div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 inline-block"
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: template.textColor,
            }}
          >
            {template.style}
          </span>
          <h3
            className="font-serif font-bold text-sm leading-tight mb-1"
            style={{ color: template.textColor }}
          >
            {template.name}
          </h3>
          <p
            className="text-[10px] opacity-75 leading-snug line-clamp-2"
            style={{ color: template.textColor }}
          >
            {template.description}
          </p>
        </div>
      </div>

      {/* Card actions */}
      <div className="bg-white p-2.5 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(template); }}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-[#9c4c6a] border border-rose-200 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          Preview
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCreate(template); }}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
        >
          <Wand2 className="w-3 h-3" />
          Create
        </button>
      </div>
    </motion.div>
  );
}
