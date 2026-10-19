"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Upload,
  X,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Video,
  Clock,
  Sparkles,
  ArrowLeft,
  Music,
  Search,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  MessageSquare,
  Mic,
  Camera,
  ShieldCheck,
  Inbox,
  Calendar,
  MapPin,
  Lock,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  ListFilter,
  Users,
  UserCheck,
  HelpCircle,
  Gift,
  Ticket,
  Mail,
  MailOpen,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Compass,
} from "lucide-react";
import type { MusicTrack } from "@/lib/supabase/coupleTemplates";
import type { FreeTouseTrack } from "@/lib/freetouse";

/* ─────────────────────────────────────────────
   SCENE CONFIG
───────────────────────────────────────────── */
const SCENES = [
  {
    label: "Starry Night",
    description: "Midnight magic under the stars",
    emoji: "🌟",
    bg: "/anime theme/images/romantic-love-3840x2160-24698.jpg",
    palette: { accent: "#a78bfa", glow: "#7c3aed", text: "#f3e8ff", dark: "#0f0c29", card: "rgba(139,92,246,0.15)" },
  },
  {
    label: "Sunset Balcony",
    description: "Golden hour cherry blossoms",
    emoji: "🌸",
    bg: "/anime theme/images/cozy-happiness-bx-1920x1080.jpg",
    palette: { accent: "#fbbf24", glow: "#d97706", text: "#fff7ed", dark: "#1c0a00", card: "rgba(251,191,36,0.12)" },
  },
  {
    label: "Beneath the Clouds",
    description: "Peaceful sky, just us two",
    emoji: "☁️",
    bg: "/anime theme/images/together-beneath-the-clouds-ry-1920x1080.jpg",
    palette: { accent: "#38bdf8", glow: "#0284c7", text: "#e0f2fe", dark: "#082f49", card: "rgba(56,189,248,0.12)" },
  },
  {
    label: "Golden Sunset",
    description: "Warm evening, heart full",
    emoji: "🌅",
    bg: "/anime theme/images/the-beauty-of-sunset-and-you-iy-1920x1080.jpg",
    palette: { accent: "#fb923c", glow: "#ea580c", text: "#fff7ed", dark: "#1c0a00", card: "rgba(251,146,60,0.12)" },
  },
];

const EXPIRY_OPTIONS = [
  { label: "1 Day", hours: 24, icon: "⚡" },
  { label: "3 Days", hours: 72, icon: "🌸" },
  { label: "7 Days", hours: 168, icon: "🌟" },
  { label: "30 Days", hours: 720, icon: "💎" },
];

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  uploadedUrl?: string;
  uploadedPublicId?: string;
  uploading?: boolean;
  error?: string;
}

/* ─────────────────────────────────────────────
   SAKURA PETAL (builder version)
───────────────────────────────────────────── */
function SakuraPetal({ index }: { index: number }) {
  const left = ((index * 9.1 + 5) % 100).toFixed(1);
  const delay = ((index * 0.5) % 6).toFixed(2);
  const duration = (6 + ((index * 1.1) % 5)).toFixed(1);
  return (
    <motion.div
      className="absolute pointer-events-none text-pink-300"
      style={{ left: `${left}%`, top: "-30px", fontSize: 12 + (index % 8), opacity: 0.4 }}
      animate={{ y: "110vh", x: [0, Math.sin(index) * 80], rotate: [0, 360 * (index % 2 === 0 ? 1 : -1)] }}
      transition={{ duration: Number(duration), delay: Number(delay), repeat: Infinity, ease: "linear" }}
    >
      🌸
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
function StepIndicator({ current, total, palette }: { current: number; total: number; palette: (typeof SCENES)[0]["palette"] }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 28 : 8,
            opacity: i <= current ? 1 : 0.3,
          }}
          transition={{ duration: 0.3 }}
          className="h-2 rounded-full"
          style={{ backgroundColor: i <= current ? palette.accent : "rgba(255,255,255,0.2)" }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CURATED MUSIC CATEGORIES
───────────────────────────────────────────── */
const MUSIC_CATEGORIES = [
  { id: "trending", label: "🔥 Trending", query: "love" },
  { id: "romantic", label: "💕 Romantic", query: "romantic" },
  { id: "anime", label: "🌸 Anime Lofi", query: "lofi" },
  { id: "piano", label: "🎹 Sweet Piano", query: "piano" },
  { id: "acoustic", label: "🎸 Acoustic Love", query: "acoustic" },
  { id: "cinematic", label: "✨ Cinematic", query: "cinematic" },
];

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function AnimeTemplatePage() {
  const [step, setStep] = useState(0); // 0=scene, 1=names, 2=music, 3=media, 4=expiry, 5=done
  const [selectedScene, setSelectedScene] = useState(0);
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [senderGender, setSenderGender] = useState<"male" | "female">("male");

  // ── Music state ──
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState<FreeTouseTrack[]>([]);
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [recommendedTracks, setRecommendedTracks] = useState<FreeTouseTrack[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [trackStartAt, setTrackStartAt] = useState(0); // seconds
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── YouTube music input states ──
  const [musicTab, setMusicTab] = useState<"catalog" | "youtube">("catalog");
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isYtPreviewTesting, setIsYtPreviewTesting] = useState(false);

  const [message, setMessage] = useState("");
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const mediaFilesRef = useRef<MediaFile[]>([]);
  const committedMediaRef = useRef(new Set<string>());
  const removedMediaRef = useRef(new Set<string>());
  const [expiryHours, setExpiryHours] = useState(24);
  const [previewCreatedAt] = useState(() => Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generatedManageUrl, setGeneratedManageUrl] = useState("");
  const [generatedExpiry, setGeneratedExpiry] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tools configuration state ──
  const [replyToolEnabled, setReplyToolEnabled] = useState(true);
  const [replyPrompt, setReplyPrompt] = useState("Leave a love note or message for me...");
  const [replyFormatText, setReplyFormatText] = useState(true);
  const [replyFormatPhoto, setReplyFormatPhoto] = useState(true);
  const [replyFormatVoice, setReplyFormatVoice] = useState(true);
  const [replyStayOpen, setReplyStayOpen] = useState(true);

  // ── T02 / T03 Date & RSVP state ──
  const [invitationToolEnabled, setInvitationToolEnabled] = useState(false);
  const [inviteActivity, setInviteActivity] = useState("Candlelight Dinner & Rooftop Stargazing");
  const [inviteMessage, setInviteMessage] = useState("Will you go on a date with me?");
  const [inviteFormat, setInviteFormat] = useState<"in_person" | "online">("in_person");
  const [inviteLocation, setInviteLocation] = useState("");
  const [inviteMeetingUrl, setInviteMeetingUrl] = useState("");
  const [inviteReservationUrl, setInviteReservationUrl] = useState("");
  const [inviteDateMode, setInviteDateMode] = useState<"slots" | "fixed" | "date_only">("slots");
  const [inviteDurationMinutes, setInviteDurationMinutes] = useState(120);
  const [inviteSenderTimezone, setInviteSenderTimezone] = useState("UTC");
  const [inviteAllowCounterproposal, setInviteAllowCounterproposal] = useState(true);
  const [invitePrivateNotes, setInvitePrivateNotes] = useState("");
  const [inviteSlots, setInviteSlots] = useState<Array<{ id: string; date: string; time: string; label: string }>>(() => {
    const now = new Date();
    const friday = new Date(now);
    friday.setDate(now.getDate() + ((7 - now.getDay() + 5) % 7 || 7));
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return [
      { id: "slot_1", date: fmtDate(friday), time: "19:00", label: "Friday Evening" },
      { id: "slot_2", date: fmtDate(saturday), time: "19:30", label: "Saturday Sunset" },
    ];
  });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setInviteSenderTimezone(tz);
    } catch {
      // fallback to UTC
    }
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const sceneParam = params.get("scene");
        if (sceneParam !== null) {
          const parsed = parseInt(sceneParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < SCENES.length) {
            setSelectedScene(parsed);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // ── T04 Choice Cards & Polls state ──
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("What should we do for our special evening?");
  const [pollDescription, setPollDescription] = useState("Vote for your favourite idea!");
  const [pollSelectionMode, setPollSelectionMode] = useState<"both_vote" | "partner_chooses">("both_vote");
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollAllowCustomSuggestion, setPollAllowCustomSuggestion] = useState(true);
  const [pollOptions, setPollOptions] = useState<Array<{ id: string; text: string; imageUrl?: string }>>([
    { id: "opt_1", text: "Romantic Dinner & Rooftop Cocktails" },
    { id: "opt_2", text: "Cozy Blanket Fort & Movie Night" },
    { id: "opt_3", text: "Late Night Drive & Stargazing" },
  ]);

  // ── T05 Question Card state ──
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionToolTitle, setQuestionToolTitle] = useState("A few questions for you");
  const [questionToolDescription, setQuestionToolDescription] = useState("Take your time and answer whenever you feel like it!");
  const [questionsList, setQuestionsList] = useState<Array<{
    id: string;
    prompt: string;
    type: "short" | "long" | "choice";
    options?: string[];
    skippable: boolean;
    sender_answer?: string;
    reveal_mode: "always" | "after_partner_answers" | "hidden";
  }>>([
    {
      id: "q_1",
      prompt: "What is your favourite memory of us together?",
      type: "long",
      skippable: true,
      reveal_mode: "after_partner_answers",
    },
    {
      id: "q_2",
      prompt: "If we could travel anywhere tomorrow, where would we go?",
      type: "short",
      skippable: true,
      reveal_mode: "after_partner_answers",
    },
  ]);

  // ── T06 Private Reveal state ──
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealToolPrompt, setRevealToolPrompt] = useState("What was the exact moment you knew you had fallen for me?");
  const [revealToolDescription, setRevealToolDescription] = useState("Answer privately, lock your words, and discover our answers together!");
  const [revealCountdownSeconds, setRevealCountdownSeconds] = useState(3);

  // ── T07 Scratch Reveal state ──
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchCoverTitle, setScratchCoverTitle] = useState("A secret surprise for you");
  const [scratchCoverInstruction, setScratchCoverInstruction] = useState("Scratch with your finger or mouse to reveal");
  const [scratchContentType, setScratchContentType] = useState<"message" | "photo" | "invitation">("message");
  const [scratchHiddenMessage, setScratchHiddenMessage] = useState("You mean everything to me. Happy special day! ❤️");
  const [scratchHiddenPhotoUrl, setScratchHiddenPhotoUrl] = useState("");

  // ── T08 Love Coupon state ──
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState("Full Body Massage & Pampering");
  const [couponDescription, setCouponDescription] = useState("Valid anytime you want total relaxation, soothing music, and back rubs.");
  const [couponHasExpiry, setCouponHasExpiry] = useState(false);
  const [couponExpiryDays, setCouponExpiryDays] = useState(30);
  const [couponEnableScheduling, setCouponEnableScheduling] = useState(false);

  // ── T09 Open When Letters state ──
  const [openWhenToolEnabled, setOpenWhenToolEnabled] = useState(false);
  const [openWhenTitle, setOpenWhenTitle] = useState("Open When Letters");
  const [openWhenDescription, setOpenWhenDescription] = useState("These envelopes open whenever you choose — for comfort, love, and sweet memories.");
  const [openWhenAttachReply, setOpenWhenAttachReply] = useState(true);
  const [openWhenEnvelopes, setOpenWhenEnvelopes] = useState<Array<{
    id: string;
    occasion: string;
    message: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
  }>>([
    {
      id: "env_1",
      occasion: "you miss me",
      message: "Whenever you miss me, close your eyes and remember how much I adore you. I am always with you in heart. ❤️",
    },
    {
      id: "env_2",
      occasion: "you've had a tough day",
      message: "Take a deep breath. You are stronger than whatever went wrong today, and you have my whole heart cheering you on. I'm so proud of you.",
    },
  ]);

  // ── T10 Our Story Memories state ──
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [ourStoryTitle, setOurStoryTitle] = useState("Our Story Memories");
  const [ourStoryDescription, setOurStoryDescription] = useState("A journey through our favorite moments together.");
  const [ourStoryCards, setOurStoryCards] = useState<Array<{
    id: string;
    photo_url: string;
    caption: string;
    date: string;
    order: number;
  }>>([
    {
      id: "card_1",
      photo_url: "",
      caption: "The day we met — where everything truly began.",
      date: "The Beginning",
      order: 0,
    },
    {
      id: "card_2",
      photo_url: "",
      caption: "Our first trip together and the smiles I will never forget.",
      date: "Our First Trip",
      order: 1,
    },
    {
      id: "card_3",
      photo_url: "",
      caption: "One of my absolute favorite laughs we have ever shared.",
      date: "Pure Joy",
      order: 2,
    },
  ]);

  // ── T11 Mini Couple Bucket List state ──
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketListTitle, setBucketListTitle] = useState("Mini Couple Bucket List");
  const [bucketListDescription, setBucketListDescription] = useState("Adventures and dreams we want to experience together.");
  const [bucketListItems, setBucketListItems] = useState<Array<{
    id: string;
    title: string;
    note: string;
    status: "wished" | "planning" | "completed";
    created_by: "creator" | "partner";
  }>>([
    {
      id: "item_1",
      title: "Late night stargazing with warm cocoa",
      note: "Drive out past the city lights with a big blanket.",
      status: "wished",
      created_by: "creator",
    },
    {
      id: "item_2",
      title: "Cook a new Italian recipe from scratch together",
      note: "Homemade pasta and our favorite wine playlist.",
      status: "wished",
      created_by: "creator",
    },
    {
      id: "item_3",
      title: "Spontaneous weekend road trip",
      note: "Pick a direction and drive without a rigid schedule.",
      status: "wished",
      created_by: "creator",
    },
  ]);

  const palette = SCENES[selectedScene].palette;
  const scene = SCENES[selectedScene];

  /* ── Load recommended tracks by category ── */
  const loadCategory = useCallback(async (catId: string) => {
    setSelectedCategory(catId);
    const cat = MUSIC_CATEGORIES.find((c) => c.id === catId) ?? MUSIC_CATEGORIES[0];
    setLoadingCategory(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(cat.query)}&limit=8`);
      const data = await res.json();
      setRecommendedTracks(data.tracks || []);
    } catch {
      // silent
    } finally {
      setLoadingCategory(false);
    }
  }, []);

  function goToStep(next: typeof step) {
    previewAudioRef.current?.pause();
    setPreviewPlayingId(null); setIsYtPreviewTesting(false); setStep(next);
    if (next === 2 && recommendedTracks.length === 0) void loadCategory("trending");
  }

  /* ── Debounced music search ── */
  useEffect(() => {
    if (!musicQuery.trim()) return;
    const timer = setTimeout(async () => {
      setSearchingMusic(true);
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(musicQuery.trim())}&limit=8`);
        const data = await res.json();
        setMusicResults(data.tracks || []);
      } catch {
        // silent
      } finally {
        setSearchingMusic(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [musicQuery]);

  /* ── Load YouTube track metadata ── */
  const handleLoadYoutubeTrack = async () => {
    if (!youtubeUrlInput.trim()) return;
    setLoadingYoutube(true);
    setYoutubeError(null);
    try {
      const res = await fetch(`/api/music/youtube?url=${encodeURIComponent(youtubeUrlInput.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error || !data.track) {
        throw new Error(data.error || "Could not recognize video from YouTube link");
      }
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setPreviewPlayingId(null);
      setIsYtPreviewTesting(false);

      setSelectedTrack(data.track);
      setTrackStartAt(data.track.startAt || 0);
      setPreviewCurrentTime(data.track.startAt || 0);
      setYoutubeUrlInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : "Please try again.") : "Please try again.") : "Failed to load YouTube track";
      setYoutubeError(msg);
    } finally {
      setLoadingYoutube(false);
    }
  };

  /* ── Preview toggle for catalog search results ── */
  const togglePreview = (track: FreeTouseTrack) => {
    if (previewPlayingId === track.id) {
      previewAudioRef.current?.pause();
      setPreviewPlayingId(null);
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setIsYtPreviewTesting(false);
      const audio = new Audio(track.files.mp3);
      audio.currentTime = 0;
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewPlayingId(null);
      setPreviewPlayingId(track.id);
    }
  };

  const isSelectedTrackPlaying = Boolean(
    selectedTrack &&
      (selectedTrack.type === "youtube"
        ? isYtPreviewTesting
        : previewPlayingId === `selected-${selectedTrack.id}`)
  );

  /* ── Preview toggle for selected track starting from chosen start point ── */
  const toggleSelectedTrackPreview = () => {
    if (!selectedTrack) return;
    if (selectedTrack.type === "youtube") {
      setIsYtPreviewTesting((prev) => !prev);
      return;
    }
    const playId = `selected-${selectedTrack.id}`;
    if (previewPlayingId === playId) {
      previewAudioRef.current?.pause();
      setPreviewPlayingId(null);
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setIsYtPreviewTesting(false);
      const audio = new Audio(selectedTrack.mp3Url);
      previewAudioRef.current = audio;
      audio.currentTime = trackStartAt;
      setPreviewCurrentTime(trackStartAt);

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setPreviewPlayingId(null);
        setPreviewCurrentTime(trackStartAt);
      };
      audio.onpause = () => {
        setPreviewPlayingId((prev) => (prev === playId ? null : prev));
      };
      audio
        .play()
        .then(() => {
          setPreviewPlayingId(playId);
        })
        .catch((err) => {
          console.error("Audio preview failed:", err);
        });
    }
  };

  /* ── Handle changing starting point (slider or waveform click) ── */
  const handleStartAtChange = (newStart: number) => {
    const maxDur = selectedTrack?.duration && selectedTrack.duration > 0 ? selectedTrack.duration : 600;
    const clamped = Math.max(0, Math.min(newStart, maxDur - 2));
    setTrackStartAt(clamped);
    if (selectedTrack?.type === "youtube") {
      if (isYtPreviewTesting) {
        setIsYtPreviewTesting(false);
        setTimeout(() => setIsYtPreviewTesting(true), 60);
      }
    } else if (isSelectedTrackPlaying && previewAudioRef.current) {
      previewAudioRef.current.currentTime = clamped;
      setPreviewCurrentTime(clamped);
    } else {
      setPreviewCurrentTime(clamped);
    }
  };

  /* ── Replay preview from starting point ── */
  const restartSelectedTrackPreview = () => {
    if (!selectedTrack) return;
    if (selectedTrack.type === "youtube") {
      setIsYtPreviewTesting(false);
      setTimeout(() => setIsYtPreviewTesting(true), 60);
      return;
    }
    const playId = `selected-${selectedTrack.id}`;
    if (previewAudioRef.current && previewPlayingId === playId) {
      previewAudioRef.current.currentTime = trackStartAt;
      setPreviewCurrentTime(trackStartAt);
      if (previewAudioRef.current.paused) {
        previewAudioRef.current.play().catch(() => {});
      }
    } else {
      toggleSelectedTrackPreview();
    }
  };

  /* ── Select a track from search results ── */
  const selectTrack = (t: FreeTouseTrack) => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setPreviewPlayingId(null);
    setIsYtPreviewTesting(false);
    const artist = t.artists?.[0]?.[1]?.name ?? "Unknown";
    setSelectedTrack({
      id: t.id,
      title: t.title,
      artist,
      thumbnailUrl: t.thumbnails?.md ?? t.thumbnails?.sm ?? "",
      mp3Url: t.files.mp3,
      duration: t.duration,
      startAt: 0,
      waveform: t.waveform ?? [],
      type: "freetouse",
    });
    setTrackStartAt(0);
    setPreviewCurrentTime(0);
    setMusicQuery("");
    setMusicResults([]);
  };

  /* ── Format seconds as mm:ss ── */
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;


  /* ── Upload single file to Cloudinary ── */
  const uploadFile = useCallback(async (mediaFile: MediaFile) => {
    setMediaFiles((prev) =>
      prev.map(f => (f.id === mediaFile.id ? { ...f, uploading: true, error: undefined } : f))
    );

    const form = new FormData();
    form.append("file", mediaFile.file);
    form.append("folder", "bonded/couple_templates");
    form.append("resource_type", mediaFile.type === "video" ? "video" : "image");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Upload failed");
      if (removedMediaRef.current.has(mediaFile.id)) {
        await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [data.secure_url] }) });
        return;
      }

      setMediaFiles((prev) =>
        prev.map(f =>
          f.id === mediaFile.id
            ? { ...f, uploading: false, uploadedUrl: data.secure_url, uploadedPublicId: data.public_id }
            : f
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : "Please try again.") : "Please try again.") : "Upload failed";
      setMediaFiles((prev) =>
        prev.map(f => (f.id === mediaFile.id ? { ...f, uploading: false, error: msg } : f))
      );
    }
  }, [setMediaFiles]);

  /* ── Handle file selection ── */
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const existing = mediaFiles.length;
      const allowed = Math.min(files.length, 11 - existing);

      const newFiles: MediaFile[] = [];
      for (let i = 0; i < allowed; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) continue;

        const preview = URL.createObjectURL(file);
        newFiles.push({ id: crypto.randomUUID(), file, preview, type: isVideo ? "video" : "image", uploading: true });
      }

      setMediaFiles(prev => [...prev, ...newFiles]);
      newFiles.forEach(file => { void uploadFile(file); });
    },
    [mediaFiles.length, uploadFile, setMediaFiles]
  );

  const removeMedia = (index: number) => {
    const file = mediaFiles[index];
    if (!file) return;
    removedMediaRef.current.add(file.id);
    if (file.uploadedUrl) void fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [file.uploadedUrl] }) });
    setMediaFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  /* ── Generate template ── */
  const handleGenerate = async () => {
    if (!partnerName.trim() || !yourName.trim() || !message.trim()) return;

    setIsGenerating(true);

    const mediaItems = (hasMedia ? mediaFiles : [])
      .filter((f) => f.uploadedUrl && f.uploadedPublicId)
      .map((f) => ({ url: f.uploadedUrl!, public_id: f.uploadedPublicId!, type: f.type }));

    try {
      const toolsPayload = [];
      if (replyToolEnabled) {
        toolsPayload.push({
          id: "reply_t01",
          type: "reply",
          enabled: true,
          prompt: replyPrompt.trim() || "Leave a love note or message for me...",
          enabledFormats: {
            text: replyFormatText,
            photo: replyFormatPhoto,
            voice: replyFormatVoice,
          },
          maxChars: 2000,
          maxPhotos: 3,
          maxVoiceSeconds: 60,
          allowMultiple: replyStayOpen,
          quickReactions: ["❤️", "🥰", "🥺", "✨", "💋"],
        });
      }

      if (invitationToolEnabled) {
        const slotsFormatted = inviteSlots.map((s, idx) => {
          let startTime = "";
          if (inviteDateMode === "date_only") {
            startTime = s.date;
          } else {
            try {
              startTime = new Date(`${s.date}T${s.time || "19:00"}:00`).toISOString();
            } catch {
              startTime = new Date().toISOString();
            }
          }
          return {
            id: s.id || `slot_${idx + 1}`,
            start_time: startTime,
            label: s.label.trim() || undefined,
          };
        });

        toolsPayload.push({
          id: "invitation_t02",
          type: "invitation",
          enabled: true,
          activity: inviteActivity.trim() || "Romantic Date Night",
          invitationMessage: inviteMessage.trim() || "Will you be my date?",
          format: inviteFormat,
          location: inviteFormat === "in_person" && inviteLocation.trim() ? inviteLocation.trim() : undefined,
          meetingUrl: inviteFormat === "online" && inviteMeetingUrl.trim() ? inviteMeetingUrl.trim() : undefined,
          reservationUrl: inviteReservationUrl.trim() || undefined,
          senderPrivateNotes: invitePrivateNotes.trim() || undefined,
          dateMode: inviteDateMode,
          durationMinutes: Number(inviteDurationMinutes) || 120,
          senderTimezone: inviteSenderTimezone || "UTC",
          proposedSlots: slotsFormatted,
          allowCounterproposal: inviteAllowCounterproposal,
        });
      }

      if (pollToolEnabled) {
        toolsPayload.push({
          id: "poll_t04",
          type: "poll",
          enabled: true,
          question: pollQuestion.trim() || "What should we do?",
          description: pollDescription.trim(),
          selectionMode: pollSelectionMode,
          allowMultiple: pollAllowMultiple,
          allowCustomSuggestion: pollAllowCustomSuggestion,
          options: pollOptions.map((o) => ({
            id: o.id,
            text: o.text.trim(),
            image_url: o.imageUrl?.trim() || undefined,
          })),
        });
      }

      if (questionToolEnabled) {
        toolsPayload.push({
          id: "question_t05",
          type: "question",
          enabled: true,
          title: questionToolTitle.trim() || "A few questions for you",
          description: questionToolDescription.trim(),
          questions: questionsList.map((q) => ({
            id: q.id,
            prompt: q.prompt.trim(),
            type: q.type,
            options: q.type === "choice" && q.options ? q.options.filter(Boolean) : undefined,
            skippable: q.skippable,
            sender_answer: q.sender_answer?.trim() || undefined,
            reveal_mode: q.reveal_mode,
          })),
        });
      }

      if (revealToolEnabled) {
        toolsPayload.push({
          id: "reveal_t06",
          type: "private_reveal",
          enabled: true,
          prompt: revealToolPrompt.trim() || "What was the exact moment you knew you had fallen for me?",
          description: revealToolDescription.trim(),
          countdownSeconds: Number(revealCountdownSeconds) || 3,
        });
      }

      if (scratchToolEnabled) {
        if (scratchContentType === "message" && !scratchHiddenMessage.trim()) {
          alert("Please enter a hidden love note for your Scratch Reveal card.");
          return;
        }
        if (scratchContentType === "photo" && !scratchHiddenPhotoUrl.trim()) {
          alert("Please provide an image URL for your Scratch Reveal card.");
          return;
        }

        toolsPayload.push({
          id: "scratch_t07",
          type: "scratch_reveal",
          enabled: true,
          coverTitle: scratchCoverTitle.trim() || "A secret surprise for you",
          coverInstruction: scratchCoverInstruction.trim() || "Scratch with your finger or mouse to reveal",
          contentType: scratchContentType,
          hiddenMessage: scratchContentType === "message" ? scratchHiddenMessage.trim() : undefined,
          hiddenPhotoUrl: scratchContentType === "photo" ? scratchHiddenPhotoUrl.trim() : undefined,
          invitationRefId: scratchContentType === "invitation" ? "invitation_t02" : undefined,
        });
      }

      if (couponToolEnabled) {
        if (!couponTitle.trim()) {
          alert("Please enter a title for your Love Coupon.");
          return;
        }

        const expiresAt = couponHasExpiry
          ? new Date(Date.now() + Number(couponExpiryDays) * 86400000).toISOString()
          : null;

        toolsPayload.push({
          id: "coupon_t08",
          type: "coupon",
          enabled: true,
          title: couponTitle.trim(),
          description: couponDescription.trim(),
          expiresAt,
          enableScheduling: couponEnableScheduling,
        });
      }

      if (openWhenToolEnabled) {
        if (openWhenEnvelopes.length === 0) {
          alert("Please add at least one Open When envelope.");
          return;
        }
        for (let i = 0; i < openWhenEnvelopes.length; i++) {
          const env = openWhenEnvelopes[i];
          if (!env.occasion.trim()) {
            alert(`Please provide an occasion for Envelope #${i + 1} (e.g. "you miss me").`);
            return;
          }
          if (!env.message.trim()) {
            alert(`Please write a letter message for Envelope #${i + 1}.`);
            return;
          }
        }

        toolsPayload.push({
          id: "open_when_t09",
          type: "open_when",
          enabled: true,
          title: openWhenTitle.trim() || "Open When Letters",
          description: openWhenDescription.trim(),
          attachReply: openWhenAttachReply,
          envelopes: openWhenEnvelopes.map((e) => ({
            id: e.id,
            occasion: e.occasion.trim(),
            message: e.message.trim(),
            mediaUrl: e.mediaUrl?.trim() || undefined,
            mediaType: e.mediaType || undefined,
          })),
        });
      }

      if (ourStoryEnabled) {
        if (ourStoryCards.length < 3 || ourStoryCards.length > 5) {
          alert("Our Story Memories requires between 3 and 5 photo cards.");
          return;
        }
        for (let i = 0; i < ourStoryCards.length; i++) {
          const card = ourStoryCards[i];
          if (!card.photo_url || !card.photo_url.trim()) {
            alert(`Please select or upload a photo for Story Card #${i + 1}.`);
            return;
          }
          if (!card.caption || !card.caption.trim()) {
            alert(`Please write a caption for Story Card #${i + 1}.`);
            return;
          }
        }

        toolsPayload.push({
          id: "our_story_t10",
          type: "our_story",
          enabled: true,
          title: ourStoryTitle.trim() || "Our Story Memories",
          description: ourStoryDescription.trim(),
          cards: ourStoryCards.map((c, idx) => ({
            id: c.id,
            photo_url: c.photo_url.trim(),
            caption: c.caption.trim(),
            date: c.date?.trim() || null,
            order: idx,
          })),
        });
      }

      if (bucketListEnabled) {
        if (bucketListItems.length === 0 || bucketListItems.length > 5) {
          alert("Mini Couple Bucket List allows up to 5 initial ideas.");
          return;
        }
        for (let i = 0; i < bucketListItems.length; i++) {
          const it = bucketListItems[i];
          if (!it.title || !it.title.trim()) {
            alert(`Please enter a title for Bucket List idea #${i + 1}.`);
            return;
          }
        }

        toolsPayload.push({
          id: "bucket_list_t11",
          type: "bucket_list",
          enabled: true,
          title: bucketListTitle.trim() || "Mini Couple Bucket List",
          description: bucketListDescription.trim(),
          items: bucketListItems.map((it) => ({
            id: it.id,
            title: it.title.trim(),
            note: it.note?.trim() || null,
            status: "wished",
            created_by: "creator",
          })),
        });
      }

      const res = await fetch("/api/templates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_index: selectedScene,
          partner_name: partnerName.trim(),
          partner_from: yourName.trim(),
          sender_gender: senderGender,
          music_track: selectedTrack ? { ...selectedTrack, startAt: trackStartAt } : null,
          message: message.trim(),
          has_media: hasMedia && mediaItems.length > 0,
          media_items: mediaItems,
          expiry_hours: expiryHours,
          tools: toolsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to create template");
      committedMediaRef.current = new Set((hasMedia ? mediaFiles : []).filter(file => file.uploadedUrl).map(file => file.id));

      setGeneratedCode(data.short_code);
      setGeneratedUrl(data.url || `${window.location.origin}/t/${data.short_code}`);
      setGeneratedManageUrl(data.manage_url || `${window.location.origin}/t/${data.short_code}?manage=${data.manage_token}`);
      setGeneratedExpiry(data.expires_at);

      // Save to localStorage for Creator Center backup
      try {
        const raw = localStorage.getItem("bonded_creator_templates");
        const existing = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(existing) ? existing.filter((item: Record<string, unknown>) => item.code !== data.short_code) : [];
        filtered.unshift({
          code: data.short_code,
          manage_token: data.manage_token,
          partner_name: partnerName.trim(),
          partner_from: yourName.trim(),
          expires_at: data.expires_at,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("bonded_creator_templates", JSON.stringify(filtered.slice(0, 50)));
      } catch {
        // localStorage safe fallback
      }

      goToStep(6);
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : "Please try again.") : "Please try again.") : "Failed to create";
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const url = generatedUrl || `${window.location.origin}/t/${generatedCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyManage = () => {
    if (!generatedManageUrl) return;
    navigator.clipboard.writeText(generatedManageUrl).then(() => {
      setCopiedManage(true);
      setTimeout(() => setCopiedManage(false), 2500);
    });
  };

  /* ── Cleanup previews and audio on unmount ── */
  useEffect(() => { mediaFilesRef.current = mediaFiles; }, [mediaFiles]);
  useEffect(() => {
    return () => {
      const files = mediaFilesRef.current;
      files.forEach(f => { URL.revokeObjectURL(f.preview); removedMediaRef.current.add(f.id); });
      const urls = files.filter(file => !committedMediaRef.current.has(file.id)).map(f => f.uploadedUrl).filter(Boolean);
      if (urls.length) void fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }), keepalive: true });
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canAdvanceStep1 = partnerName.trim().length > 0 && yourName.trim().length > 0 && message.trim().length > 0;
  const uploadingCount = mediaFiles.filter((f) => f.uploading).length;

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: palette.dark }}
    >
      {/* ── Background scene ── */}
      <AnimatePresence>
        <motion.div
          key={selectedScene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${scene.bg}')`,
            filter: "brightness(0.25) saturate(1.2)",
          }}
        />
      </AnimatePresence>

      {/* ── Dark overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${palette.dark}80, transparent 30%, ${palette.dark}90 80%, ${palette.dark} 100%)`,
        }}
      />

      {/* ── Sakura petals ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <SakuraPetal key={i} index={i} />
        ))}
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold transition-opacity hover:opacity-70"
          style={{ color: palette.text, opacity: 0.6 }}
        >
          <ArrowLeft className="w-4 h-4" />
          QubitSells
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="w-3 h-3 fill-current" style={{ color: palette.accent }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: palette.accent }}>
            Anime Template
          </span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">

          {/* Step indicator */}
          {step < 6 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <StepIndicator current={step} total={6} palette={palette} />
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Scene Selection ── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 1 of 5
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Choose Your Scene
                  </h1>
                  <p className="text-sm opacity-60" style={{ color: palette.text }}>
                    This will be the background of your anime message
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {SCENES.map((s, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedScene(i)}
                      className="relative rounded-2xl overflow-hidden aspect-video cursor-pointer group"
                      style={{
                        border: `2px solid ${selectedScene === i ? s.palette.accent : "rgba(255,255,255,0.1)"}`,
                        boxShadow: selectedScene === i ? `0 0 24px ${s.palette.glow}60` : "none",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.bg}
                        alt={s.label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-end p-3"
                        style={{
                          background: `linear-gradient(to top, ${s.palette.dark}e0, transparent)`,
                        }}
                      >
                        <span className="text-lg mb-0.5">{s.emoji}</span>
                        <p className="text-xs font-bold text-white text-center leading-tight">{s.label}</p>
                        <p className="text-[10px] text-white/60 text-center leading-tight">{s.description}</p>
                      </div>
                      {selectedScene === i && (
                        <div
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: s.palette.accent }}
                        >
                          ✓
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => goToStep(1)}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                    boxShadow: `0 8px 32px ${palette.glow}40`,
                  }}
                >
                  Next: Write Your Message
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}

            {/* ── STEP 1: Names & Message ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 2 of 5
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Write Your Message
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Partner's name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wide uppercase opacity-70" style={{ color: palette.text }}>
                      💕 Their Name (who receives this)
                    </label>
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value.slice(0, 50))}
                      placeholder="e.g. Aiko, My Love, Sweetheart..."
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all"
                      style={{
                        background: palette.card,
                        border: `1.5px solid ${partnerName ? palette.accent : "rgba(255,255,255,0.1)"}`,
                        color: palette.text,
                      }}
                    />
                    <p className="text-right text-xs opacity-30" style={{ color: palette.text }}>
                      {partnerName.length}/50
                    </p>
                  </div>

                  {/* Your name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wide uppercase opacity-70" style={{ color: palette.text }}>
                      ✍️ Your Name (the sender)
                    </label>
                    <input
                      type="text"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value.slice(0, 50))}
                      placeholder="e.g. Hiro, Your Love..."
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all"
                      style={{
                        background: palette.card,
                        border: `1.5px solid ${yourName ? palette.accent : "rgba(255,255,255,0.1)"}`,
                        color: palette.text,
                      }}
                    />
                  </div>

                  {/* Sender Gender Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wide uppercase opacity-70" style={{ color: palette.text }}>
                      🎬 Who is sending this?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSenderGender("male")}
                        className="p-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer text-left"
                        style={{
                          borderColor: senderGender === "male" ? palette.accent : "rgba(255,255,255,0.12)",
                          background: senderGender === "male" ? `${palette.accent}25` : palette.card,
                          boxShadow: senderGender === "male" ? `0 0 20px ${palette.glow}40` : "none",
                          color: palette.text,
                        }}
                      >
                        <span className="text-2xl">👦</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold">Boy / Male</div>
                          <div className="text-[10px] opacity-60">Boy intro video</div>
                        </div>
                        {senderGender === "male" && (
                          <span className="text-xs font-bold" style={{ color: palette.accent }}>✓</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSenderGender("female")}
                        className="p-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer text-left"
                        style={{
                          borderColor: senderGender === "female" ? palette.accent : "rgba(255,255,255,0.12)",
                          background: senderGender === "female" ? `${palette.accent}25` : palette.card,
                          boxShadow: senderGender === "female" ? `0 0 20px ${palette.glow}40` : "none",
                          color: palette.text,
                        }}
                      >
                        <span className="text-2xl">👧</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold">Girl / Female</div>
                          <div className="text-[10px] opacity-60">Girl intro video</div>
                        </div>
                        {senderGender === "female" && (
                          <span className="text-xs font-bold" style={{ color: palette.accent }}>✓</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wide uppercase opacity-70" style={{ color: palette.text }}>
                      💌 Your Love Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                      placeholder="Write from the heart... every word matters 🌸"
                      rows={5}
                      className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all resize-none"
                      style={{
                        background: palette.card,
                        border: `1.5px solid ${message ? palette.accent : "rgba(255,255,255,0.1)"}`,
                        color: palette.text,
                      }}
                    />
                    <p className="text-right text-xs opacity-30" style={{ color: palette.text }}>
                      {message.length}/1000
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(0)}
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.08)", color: palette.text }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileHover={{ scale: canAdvanceStep1 ? 1.02 : 1 }}
                    whileTap={{ scale: canAdvanceStep1 ? 0.98 : 1 }}
                    onClick={() => canAdvanceStep1 && goToStep(2)}
                    disabled={!canAdvanceStep1}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      background: canAdvanceStep1
                        ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                        : "rgba(255,255,255,0.08)",
                      opacity: canAdvanceStep1 ? 1 : 0.5,
                      boxShadow: canAdvanceStep1 ? `0 6px 24px ${palette.glow}40` : "none",
                    }}
                  >
                    Next: Background Music
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Background Soundtrack ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 3 of 5
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Background Soundtrack
                  </h2>
                  <p className="text-sm opacity-60" style={{ color: palette.text }}>
                    Pick a trending romantic song or search for your special tune
                  </p>
                </div>

                {/* If track is selected, show the rich chosen player card */}
                {selectedTrack ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 sm:p-5 rounded-2xl border space-y-4"
                    style={{
                      background: `linear-gradient(135deg, ${palette.card}, ${palette.glow}15)`,
                      borderColor: isSelectedTrackPlaying ? `${palette.accent}90` : `${palette.accent}50`,
                      boxShadow: isSelectedTrackPlaying ? `0 0 30px ${palette.glow}35` : "0 4px 20px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {selectedTrack.type === "youtube" ? (
                        <span
                          className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                          style={{
                            background: "rgba(239,68,68,0.2)",
                            borderColor: "rgba(239,68,68,0.4)",
                            color: "#f87171",
                          }}
                        >
                          <span>🔴</span>
                          <span>YouTube Soundtrack</span>
                        </span>
                      ) : (
                        <span
                          className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border"
                          style={{
                            background: `${palette.accent}20`,
                            borderColor: `${palette.accent}40`,
                            color: palette.accent,
                          }}
                        >
                          Selected Soundtrack
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (previewAudioRef.current) previewAudioRef.current.pause();
                          setPreviewPlayingId(null);
                          setIsYtPreviewTesting(false);
                          setSelectedTrack(null);
                          setTrackStartAt(0);
                          setPreviewCurrentTime(0);
                        }}
                        className="text-xs font-semibold hover:opacity-100 opacity-60 transition-opacity flex items-center gap-1 cursor-pointer"
                        style={{ color: palette.text }}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Change Song</span>
                      </button>
                    </div>

                    {/* Track info with play/pause cover */}
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={toggleSelectedTrackPreview}
                        className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border group cursor-pointer shadow-lg"
                        style={{ borderColor: `${palette.accent}60` }}
                        title={isSelectedTrackPlaying ? "Pause music" : `Play from ${fmt(trackStartAt)}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedTrack.thumbnailUrl || "/anime theme/svg/love (1).svg"}
                          alt={selectedTrack.title}
                          className="w-full h-full object-cover"
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center transition-all"
                          style={{
                            background: isSelectedTrackPlaying ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.35)",
                          }}
                        >
                          {isSelectedTrackPlaying ? (
                            <Pause className="w-6 h-6 fill-current text-white drop-shadow" />
                          ) : (
                            <Play className="w-6 h-6 fill-current text-white ml-0.5 drop-shadow" />
                          )}
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold truncate" style={{ color: palette.text }}>
                          {selectedTrack.title}
                        </p>
                        <p className="text-xs opacity-60 truncate" style={{ color: palette.text }}>
                          {selectedTrack.artist} • {fmt(selectedTrack.duration)}
                        </p>
                        {isSelectedTrackPlaying ? (
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold mt-1" style={{ color: palette.accent }}>
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                            <span>Playing from {fmt(previewCurrentTime)}</span>
                          </div>
                        ) : (
                          <p className="text-[11px] opacity-50 mt-1" style={{ color: palette.text }}>
                            Starts automatically at {fmt(trackStartAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* YouTube live preview frame (when testing) */}
                    {selectedTrack.type === "youtube" && isYtPreviewTesting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl overflow-hidden aspect-video bg-black/90 border border-white/15 relative shadow-xl"
                      >
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${selectedTrack.youtubeId}?autoplay=1&start=${trackStartAt}&enablejsapi=1`}
                          className="w-full h-full"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          title="YouTube soundtrack preview"
                        />
                      </motion.div>
                    )}

                    {/* Waveform + Start Point Scrubber */}
                    {selectedTrack.waveform.length > 0 && (
                      <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold flex items-center gap-1.5" style={{ color: palette.text }}>
                            <span>🎵 Start time:</span>
                            <span className="font-mono px-2 py-0.5 rounded-md font-bold text-white shadow-sm" style={{ background: palette.accent }}>
                              {fmt(trackStartAt)}
                            </span>
                          </span>
                          <span className="text-[11px] opacity-50" style={{ color: palette.text }}>
                            Total: {fmt(selectedTrack.duration)}
                          </span>
                        </div>

                        {/* Waveform scrubber */}
                        <div
                          className="relative h-14 rounded-xl overflow-hidden cursor-pointer border"
                          style={{
                            background: "rgba(0,0,0,0.35)",
                            borderColor: "rgba(255,255,255,0.08)",
                          }}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = (e.clientX - rect.left) / rect.width;
                            const newStart = Math.round(ratio * selectedTrack.duration);
                            handleStartAtChange(newStart);
                          }}
                        >
                          {/* Waveform bars */}
                          <div className="absolute inset-0 flex items-end gap-px px-1.5 py-1.5">
                            {selectedTrack.waveform.map((v, i) => {
                              const ratio = i / selectedTrack.waveform.length;
                              const barSec = ratio * selectedTrack.duration;
                              const isBeforeStart = barSec < trackStartAt;
                              const isBetweenStartAndPlayhead =
                                isSelectedTrackPlaying &&
                                barSec >= trackStartAt &&
                                barSec <= previewCurrentTime;

                              let barBg = `${palette.accent}30`;
                              if (isBetweenStartAndPlayhead) {
                                barBg = "#fff";
                              } else if (!isBeforeStart) {
                                barBg = palette.accent;
                              }

                              return (
                                <div
                                  key={i}
                                  className="flex-1 rounded-sm"
                                  style={{
                                    height: `${Math.max(12, v)}%`,
                                    background: barBg,
                                    transition: "background 0.05s",
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Chosen Start Point Marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 rounded-full pointer-events-none"
                            style={{
                              left: `${(trackStartAt / Math.max(1, selectedTrack.duration)) * 100}%`,
                              background: palette.accent,
                              boxShadow: `0 0 10px ${palette.accent}`,
                            }}
                          >
                            <div
                              className="absolute -top-1 -left-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-md"
                              style={{ background: palette.accent }}
                            >
                              📍
                            </div>
                          </div>

                          {/* Active playback head if playing */}
                          {isSelectedTrackPlaying && selectedTrack.type !== "youtube" && (
                            <div
                              className="absolute top-0 bottom-0 w-1 rounded-full pointer-events-none transition-all duration-75"
                              style={{
                                left: `${(previewCurrentTime / Math.max(1, selectedTrack.duration)) * 100}%`,
                                background: "#ffffff",
                                boxShadow: `0 0 12px #ffffff`,
                              }}
                            />
                          )}
                        </div>

                        {/* Range slider */}
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, Math.floor(selectedTrack.duration) - 2)}
                          value={trackStartAt}
                          onChange={(e) => handleStartAtChange(Number(e.target.value))}
                          className="w-full accent-current h-1.5 rounded cursor-pointer"
                          style={{ accentColor: palette.accent }}
                        />

                        {/* Precise minute & second numeric input */}
                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                          <span className="opacity-60" style={{ color: palette.text }}>
                            Enter exact start timestamp:
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={Math.floor(trackStartAt / 60)}
                              onChange={(e) => {
                                const m = Math.max(0, parseInt(e.target.value) || 0);
                                const s = trackStartAt % 60;
                                handleStartAtChange(m * 60 + s);
                              }}
                              className="w-12 px-2 py-1 text-center rounded-lg border outline-none font-bold text-white"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                borderColor: "rgba(255,255,255,0.2)",
                              }}
                              placeholder="00"
                            />
                            <span className="opacity-60" style={{ color: palette.text }}>:</span>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={trackStartAt % 60}
                              onChange={(e) => {
                                const s = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                const m = Math.floor(trackStartAt / 60);
                                handleStartAtChange(m * 60 + s);
                              }}
                              className="w-12 px-2 py-1 text-center rounded-lg border outline-none font-bold text-white"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                borderColor: "rgba(255,255,255,0.2)",
                              }}
                              placeholder="00"
                            />
                            <span className="opacity-50 text-[10px] ml-1" style={{ color: palette.text }}>(mm:ss)</span>
                          </div>
                        </div>

                        {/* Test audio controls */}
                        <div className="flex items-center gap-2 pt-1">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={toggleSelectedTrackPreview}
                            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                            style={{
                              background: isSelectedTrackPlaying
                                ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                                : `rgba(255,255,255,0.08)`,
                              border: `1.5px solid ${isSelectedTrackPlaying ? palette.accent : `${palette.accent}50`}`,
                              color: isSelectedTrackPlaying ? "#fff" : palette.text,
                              boxShadow: isSelectedTrackPlaying ? `0 0 20px ${palette.glow}50` : "none",
                            }}
                          >
                            {isSelectedTrackPlaying ? (
                              <>
                                <Pause className="w-4 h-4 fill-current" />
                                <span>Stop Test Preview</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                <span>▶ Test &amp; Listen from {fmt(trackStartAt)}</span>
                              </>
                            )}
                          </motion.button>

                          {isSelectedTrackPlaying && (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={restartSelectedTrackPreview}
                              title="Replay from starting point"
                              className="p-3 rounded-xl border flex items-center justify-center cursor-pointer transition-colors"
                              style={{
                                background: "rgba(255,255,255,0.08)",
                                borderColor: `${palette.accent}40`,
                                color: palette.text,
                              }}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>

                        <p className="text-[11px] opacity-50 text-center" style={{ color: palette.text }}>
                          Drag slider, tap waveform, or type mm:ss to pick start point, then click &ldquo;Test &amp; Listen&rdquo; to audition!
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Music Search & YouTube input module */
                  <div
                    className="rounded-2xl p-4 sm:p-5 space-y-4"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    {/* Mode Toggle: Catalog vs YouTube Link */}
                    <div className="flex rounded-xl p-1 bg-white/5 border border-white/10 gap-1">
                      <button
                        type="button"
                        onClick={() => setMusicTab("catalog")}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{
                          background: musicTab === "catalog" ? palette.accent : "transparent",
                          color: musicTab === "catalog" ? "#fff" : palette.text,
                          boxShadow: musicTab === "catalog" ? `0 2px 10px ${palette.glow}40` : "none",
                        }}
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Browse &amp; Trending</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMusicTab("youtube")}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{
                          background: musicTab === "youtube" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "transparent",
                          color: musicTab === "youtube" ? "#fff" : palette.text,
                          boxShadow: musicTab === "youtube" ? "0 2px 10px rgba(239,68,68,0.4)" : "none",
                        }}
                      >
                        <span className="text-red-400 font-extrabold text-sm">▶</span>
                        <span>Paste YouTube Link</span>
                      </button>
                    </div>

                    {/* YOUTUBE INPUT MODE */}
                    {musicTab === "youtube" ? (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: palette.text }}>
                            <span>YouTube Song Link</span>
                            <span className="text-[10px] opacity-50 font-normal">(Any romantic song, anime OST, or cover)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={youtubeUrlInput}
                              onChange={(e) => setYoutubeUrlInput(e.target.value)}
                              placeholder="Paste YouTube link (e.g. https://youtu.be/... or youtube.com/watch?v=...)"
                              className="w-full pl-3.5 pr-28 py-3 rounded-xl text-xs font-medium outline-none transition-all"
                              style={{
                                background: "rgba(255,255,255,0.07)",
                                border: `1.5px solid ${youtubeError ? "#ef4444" : youtubeUrlInput ? palette.accent : "rgba(255,255,255,0.12)"}`,
                                color: palette.text,
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleLoadYoutubeTrack();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleLoadYoutubeTrack}
                              disabled={loadingYoutube || !youtubeUrlInput.trim()}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40"
                              style={{
                                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              }}
                            >
                              {loadingYoutube ? "Loading..." : "Load Song"}
                            </button>
                          </div>
                          {youtubeError && (
                            <p className="text-[11px] text-red-400 font-medium">
                              ⚠️ {youtubeError}
                            </p>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl border space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                          <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: palette.accent }}>
                            💡 Setting Music Starting Time
                          </p>
                          <p className="text-[11px] opacity-65 leading-relaxed" style={{ color: palette.text }}>
                            Once loaded, you can slide or type the exact minute &amp; second (e.g. 01:25) to start right at the chorus. You can click <strong>&ldquo;Test &amp; Listen&rdquo;</strong> to hear the exact clip before generating your link!
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* CATALOG & TRENDING MODE */
                      <>
                        {/* Search bar */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" style={{ color: palette.text }} />
                          <input
                            type="text"
                            value={musicQuery}
                            onChange={(e) => { setMusicQuery(e.target.value); if (!e.target.value.trim()) { setMusicResults([]); setSearchingMusic(false); } }}
                            placeholder="Search romantic songs (e.g. Lover, Golden Hour, Perfect)..."
                            className="w-full pl-10 pr-10 py-3 rounded-xl text-xs font-medium outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              border: `1.5px solid ${musicQuery ? palette.accent : "rgba(255,255,255,0.12)"}`,
                              color: palette.text,
                            }}
                          />
                          {searchingMusic && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: palette.accent }} />
                            </div>
                          )}
                          {musicQuery && !searchingMusic && (
                            <button
                              type="button"
                              onClick={() => { setMusicQuery(""); setMusicResults([]); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100 cursor-pointer"
                              style={{ color: palette.text }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Curated / Trending Niche Category Chips (when not actively searching) */}
                        {!musicQuery.trim() && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold opacity-75" style={{ color: palette.text }}>
                                Trending for Anime &amp; Romance
                              </span>
                              <span className="text-[10px] opacity-40" style={{ color: palette.text }}>
                                Select category
                              </span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                              {MUSIC_CATEGORIES.map((cat) => {
                                const isActive = selectedCategory === cat.id;
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => loadCategory(cat.id)}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
                                    style={{
                                      background: isActive
                                        ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                                        : "rgba(255,255,255,0.06)",
                                      border: `1px solid ${isActive ? palette.accent : "rgba(255,255,255,0.12)"}`,
                                      color: isActive ? "#fff" : palette.text,
                                      boxShadow: isActive ? `0 2px 12px ${palette.glow}40` : "none",
                                    }}
                                  >
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Track list: shows either search results or curated recommendations */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] opacity-50 px-1" style={{ color: palette.text }}>
                            <span>{musicQuery.trim() ? "Search Results" : "Recommended Tracks"}</span>
                            <span>Click to preview &amp; select</span>
                          </div>

                          {/* Loading state */}
                          {(searchingMusic || (!musicQuery.trim() && loadingCategory)) ? (
                            <div className="py-8 text-center space-y-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <div className="w-6 h-6 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: palette.accent }} />
                              <p className="text-xs opacity-50" style={{ color: palette.text }}>
                                {musicQuery.trim() ? "Searching soundtracks..." : "Loading recommended tracks..."}
                              </p>
                            </div>
                          ) : (
                            <div
                              className="rounded-xl border max-h-64 overflow-y-auto divide-y"
                              style={{
                                background: "rgba(10,8,30,0.96)",
                                borderColor: "rgba(255,255,255,0.10)",
                              }}
                            >
                              {(musicQuery.trim() ? musicResults : recommendedTracks).length === 0 ? (
                                <div className="p-6 text-center text-xs opacity-50" style={{ color: palette.text }}>
                                  {musicQuery.trim() ? "No songs found for that search. Try a different artist or keyword!" : "No recommendations available right now."}
                                </div>
                              ) : (
                                (musicQuery.trim() ? musicResults : recommendedTracks).map((t) => {
                                  const artist = t.artists?.[0]?.[1]?.name ?? "";
                                  const thumb = t.thumbnails?.sm ?? t.thumbnails?.md ?? "";
                                  const isPreviewing = previewPlayingId === t.id;
                                  return (
                                    <div
                                      key={t.id}
                                      className="p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={thumb || "/anime theme/svg/love (1).svg"}
                                        alt={t.title}
                                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{t.title}</p>
                                        <p className="text-[10px] text-white/50 truncate">{artist} • {fmt(t.duration)}</p>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => togglePreview(t)}
                                          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                                          title={isPreviewing ? "Pause" : "Preview"}
                                          style={{
                                            background: isPreviewing ? `${palette.accent}30` : "transparent",
                                            color: isPreviewing ? palette.accent : undefined,
                                          }}
                                        >
                                          {isPreviewing ? (
                                            <Pause className="w-3.5 h-3.5 fill-current" />
                                          ) : (
                                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => selectTrack(t)}
                                          className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white cursor-pointer active:scale-95 transition-all shadow-md"
                                          style={{ background: palette.accent }}
                                        >
                                          Select
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(1)}
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.08)", color: palette.text }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(3)}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                      boxShadow: `0 6px 24px ${palette.glow}40`,
                    }}
                  >
                    Next: Photos &amp; Memories
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Photos & Memories ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 4 of 5
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Photos &amp; Memories
                  </h2>
                  <p className="text-sm opacity-60" style={{ color: palette.text }}>
                    Choose whether to include photo &amp; video memories or send just the message
                  </p>
                </div>

                {/* Media toggle cards (Just the message vs Add Memories) */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setHasMedia(false); setMediaFiles([]); }}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: !hasMedia ? `linear-gradient(135deg, ${palette.accent}30, ${palette.glow}20)` : "rgba(255,255,255,0.06)",
                      border: `1.5px solid ${!hasMedia ? palette.accent : "rgba(255,255,255,0.1)"}`,
                      color: palette.text,
                      boxShadow: !hasMedia ? `0 4px 20px ${palette.glow}25` : "none",
                    }}
                  >
                    <span>📝 Just the Message</span>
                  </button>
                  <button
                    onClick={() => setHasMedia(true)}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: hasMedia ? `linear-gradient(135deg, ${palette.accent}30, ${palette.glow}20)` : "rgba(255,255,255,0.06)",
                      border: `1.5px solid ${hasMedia ? palette.accent : "rgba(255,255,255,0.1)"}`,
                      color: palette.text,
                      boxShadow: hasMedia ? `0 4px 20px ${palette.glow}25` : "none",
                    }}
                  >
                    <span>📸 Add Memories</span>
                  </button>
                </div>

                {/* Upload zone */}
                {hasMedia && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Drop zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          handleFiles(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                        style={{
                          borderColor: dragOver ? palette.accent : "rgba(255,255,255,0.15)",
                          background: dragOver ? `${palette.accent}10` : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFiles(e.target.files)}
                        />
                        <Upload className="w-8 h-8 mx-auto mb-3 opacity-50" style={{ color: palette.accent }} />
                        <p className="font-bold text-sm" style={{ color: palette.text }}>
                          Drop photos &amp; videos here
                        </p>
                        <p className="text-xs opacity-40 mt-1" style={{ color: palette.text }}>
                          Up to 10 images + 1 video • Click to browse
                        </p>
                      </div>

                      {/* Media grid */}
                      {mediaFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {mediaFiles.map((f, i) => (
                            <div
                              key={i}
                              className="relative aspect-square rounded-xl overflow-hidden"
                              style={{ border: `1px solid ${palette.accent}20` }}
                            >
                              {f.type === "video" ? (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ background: `${palette.glow}20` }}
                                >
                                  <Video className="w-6 h-6" style={{ color: palette.accent }} />
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                              )}

                              {/* Upload status */}
                              {f.uploading && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
                                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
                                </div>
                              )}
                              {f.uploadedUrl && !f.uploading && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                                  ✓
                                </div>
                              )}
                              {f.error && (
                                <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs p-1 text-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                                  ⚠ Failed
                                </div>
                              )}

                              {/* Remove */}
                              <button
                                onClick={() => removeMedia(i)}
                                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {/* Add more */}
                          {mediaFiles.length < 11 && (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 cursor-pointer"
                              style={{
                                border: `1.5px dashed ${palette.accent}40`,
                                background: "rgba(255,255,255,0.03)",
                                color: palette.accent,
                              }}
                            >
                              <ImageIcon className="w-5 h-5 opacity-60" />
                              <span className="text-[10px] opacity-60">Add</span>
                            </button>
                          )}
                        </div>
                      )}

                      {uploadingCount > 0 && (
                        <p className="text-xs text-center opacity-50" style={{ color: palette.text }}>
                          Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}...
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(2)}
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.08)", color: palette.text }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(4)}
                    disabled={hasMedia && uploadingCount > 0}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                      opacity: hasMedia && uploadingCount > 0 ? 0.5 : 1,
                      boxShadow: `0 6px 24px ${palette.glow}40`,
                    }}
                  >
                    {hasMedia && uploadingCount > 0 ? "Uploading..." : "Next: Choose Tools"}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Choose Tools & Mini-Games ── */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 5 of 6 • Interactive Tools
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Make It a Conversation
                  </h2>
                  <p className="text-sm opacity-60 max-w-sm mx-auto" style={{ color: palette.text }}>
                    Add interactive tools so your partner can respond, react, and connect with you directly inside the template.
                  </p>
                </div>

                {/* Tool Card: T01 Reply Tool */}
                <div
                  className="rounded-3xl p-6 border transition-all"
                  style={{
                    background: replyToolEnabled ? `${palette.accent}12` : "rgba(255,255,255,0.04)",
                    borderColor: replyToolEnabled ? palette.accent : "rgba(255,255,255,0.12)",
                    boxShadow: replyToolEnabled ? `0 8px 32px ${palette.glow}25` : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                        style={{
                          background: replyToolEnabled
                            ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base" style={{ color: palette.text }}>
                            Reply with Message, Photo, or Voice Note
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: `${palette.accent}25`,
                              color: palette.accent,
                            }}
                          >
                            T01
                          </span>
                        </div>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: palette.text }}>
                          Turns your one-way gift into a private two-way conversation.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setReplyToolEnabled(!replyToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        replyToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          replyToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {replyToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Custom Prompt */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Prompt for {partnerName || "Your Partner"}
                        </label>
                        <input
                          type="text"
                          value={replyPrompt}
                          onChange={(e) => setReplyPrompt(e.target.value)}
                          maxLength={150}
                          placeholder="Leave a love note or message for me..."
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Enabled Formats */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-2" style={{ color: palette.text }}>
                          Allowed Response Formats
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/10 cursor-pointer text-white">
                            <input
                              type="checkbox"
                              checked={replyFormatText}
                              onChange={(e) => setReplyFormatText(e.target.checked)}
                              className="rounded text-pink-500 focus:ring-0"
                            />
                            <span>📝 Text</span>
                          </label>
                          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/10 cursor-pointer text-white">
                            <input
                              type="checkbox"
                              checked={replyFormatPhoto}
                              onChange={(e) => setReplyFormatPhoto(e.target.checked)}
                              className="rounded text-pink-500 focus:ring-0"
                            />
                            <span>📸 Photos</span>
                          </label>
                          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/10 cursor-pointer text-white">
                            <input
                              type="checkbox"
                              checked={replyFormatVoice}
                              onChange={(e) => setReplyFormatVoice(e.target.checked)}
                              className="rounded text-pink-500 focus:ring-0"
                            />
                            <span>🎙️ Voice</span>
                          </label>
                        </div>
                      </div>

                      {/* Stay Open Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                        <div>
                          <p className="text-xs font-medium text-white">Keep Replies Open</p>
                          <p className="text-[11px] text-white/50">Allow multiple updates & replies</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={replyStayOpen}
                          onChange={(e) => setReplyStayOpen(e.target.checked)}
                          className="rounded text-pink-500 focus:ring-0 h-4 w-4"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Replies are private to you. View them in real time from your Secret Manage Link.</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool Card: T02/T03 Romantic Date Invitation & Time Picker */}
                <div
                  className="rounded-3xl p-6 border transition-all"
                  style={{
                    background: invitationToolEnabled ? `${palette.accent}12` : "rgba(255,255,255,0.04)",
                    borderColor: invitationToolEnabled ? palette.accent : "rgba(255,255,255,0.12)",
                    boxShadow: invitationToolEnabled ? `0 8px 32px ${palette.glow}25` : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                        style={{
                          background: invitationToolEnabled
                            ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base" style={{ color: palette.text }}>
                            Date Invitation &amp; RSVP
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: `${palette.accent}25`,
                              color: palette.accent,
                            }}
                          >
                            T02 &amp; T03
                          </span>
                        </div>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: palette.text }}>
                          Propose a romantic date and let your partner accept or pick a time.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setInvitationToolEnabled(!invitationToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        invitationToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          invitationToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {invitationToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Activity Title */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Activity / Date Title
                        </label>
                        <input
                          type="text"
                          value={inviteActivity}
                          onChange={(e) => setInviteActivity(e.target.value)}
                          maxLength={120}
                          placeholder="e.g. Candlelight Dinner & Rooftop Stargazing"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Invitation Message */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Invitation Message
                        </label>
                        <input
                          type="text"
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          maxLength={250}
                          placeholder="Will you go on a date with me?"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Format (In Person vs Online) */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Date Format
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setInviteFormat("in_person")}
                            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              inviteFormat === "in_person"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            <MapPin className="w-4 h-4 text-rose-400" />
                            <span>In-Person Date</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteFormat("online")}
                            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              inviteFormat === "online"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            <Video className="w-4 h-4 text-sky-400" />
                            <span>Virtual Date</span>
                          </button>
                        </div>
                      </div>

                      {/* Location / Meeting link */}
                      {inviteFormat === "in_person" ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                              Location / Venue
                            </label>
                            <input
                              type="text"
                              value={inviteLocation}
                              onChange={(e) => setInviteLocation(e.target.value)}
                              placeholder="e.g. Sunset Bistro & Botanical Gardens"
                              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                              Venue / Reservation Link (Optional)
                            </label>
                            <input
                              type="url"
                              value={inviteReservationUrl}
                              onChange={(e) => setInviteReservationUrl(e.target.value)}
                              placeholder="https://restaurant-reservation-or-menu-link.com"
                              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400"
                            />
                            <p className="mt-1 text-[10px] text-white/40 italic">
                              * Clearly labelled to recipient as a venue link, not a completed booking.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                            Meeting URL (Google Meet / Zoom / FaceTime)
                          </label>
                          <input
                            type="url"
                            value={inviteMeetingUrl}
                            onChange={(e) => setInviteMeetingUrl(e.target.value)}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400"
                          />
                        </div>
                      )}

                      {/* Date Mode Selection */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Availability Options (T03)
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setInviteDateMode("slots");
                              if (inviteSlots.length < 2) {
                                const now = new Date();
                                const d1 = new Date(now.getTime() + 86400000 * 2);
                                const d2 = new Date(now.getTime() + 86400000 * 3);
                                const pad = (n: number) => String(n).padStart(2, "0");
                                const f1 = `${d1.getFullYear()}-${pad(d1.getMonth() + 1)}-${pad(d1.getDate())}`;
                                const f2 = `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`;
                                setInviteSlots([
                                  { id: "slot_1", date: f1, time: "19:00", label: "Option 1" },
                                  { id: "slot_2", date: f2, time: "19:30", label: "Option 2" },
                                ]);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              inviteDateMode === "slots"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            2–6 Slots
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInviteDateMode("fixed");
                              setInviteSlots((prev) => prev.slice(0, 1));
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              inviteDateMode === "fixed"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            Single Fixed
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteDateMode("date_only")}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              inviteDateMode === "date_only"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            Date Only
                          </button>
                        </div>
                      </div>

                      {/* Duration & Timezone */}
                      <div className="grid grid-cols-2 gap-3">
                        {inviteDateMode !== "date_only" && (
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1" style={{ color: palette.text }}>
                              Duration
                            </label>
                            <select
                              value={inviteDurationMinutes}
                              onChange={(e) => setInviteDurationMinutes(Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-pink-400"
                            >
                              <option value={60} className="bg-neutral-900">1 hour</option>
                              <option value={90} className="bg-neutral-900">1.5 hours</option>
                              <option value={120} className="bg-neutral-900">2 hours (Standard)</option>
                              <option value={180} className="bg-neutral-900">3 hours</option>
                              <option value={240} className="bg-neutral-900">4 hours</option>
                            </select>
                          </div>
                        )}

                        <div className={inviteDateMode === "date_only" ? "col-span-2" : ""}>
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1" style={{ color: palette.text }}>
                            Your Timezone
                          </label>
                          <input
                            type="text"
                            value={inviteSenderTimezone}
                            onChange={(e) => setInviteSenderTimezone(e.target.value)}
                            placeholder="e.g. America/New_York or UTC"
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-pink-400"
                          />
                        </div>
                      </div>

                      {/* Proposed Slots Editor */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60" style={{ color: palette.text }}>
                            Proposed Slots ({inviteSlots.length}/6)
                          </label>
                          {inviteDateMode === "slots" && inviteSlots.length < 6 && (
                            <button
                              type="button"
                              onClick={() => {
                                const lastSlot = inviteSlots[inviteSlots.length - 1];
                                const nextDate = lastSlot ? new Date(lastSlot.date) : new Date();
                                nextDate.setDate(nextDate.getDate() + 1);
                                const pad = (n: number) => String(n).padStart(2, "0");
                                const f = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`;
                                setInviteSlots([
                                  ...inviteSlots,
                                  {
                                    id: `slot_${Date.now()}`,
                                    date: f,
                                    time: lastSlot?.time || "19:00",
                                    label: `Option ${inviteSlots.length + 1}`,
                                  },
                                ]);
                              }}
                              className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Slot
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {inviteSlots.map((slot, idx) => (
                            <div
                              key={slot.id}
                              className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-wrap items-center gap-2 text-xs"
                            >
                              <input
                                type="date"
                                value={slot.date}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInviteSlots((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, date: val } : s))
                                  );
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white focus:outline-none"
                              />

                              {inviteDateMode !== "date_only" && (
                                <input
                                  type="time"
                                  value={slot.time}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInviteSlots((prev) =>
                                      prev.map((s, i) => (i === idx ? { ...s, time: val } : s))
                                    );
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white focus:outline-none"
                                />
                              )}

                              <input
                                type="text"
                                value={slot.label}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInviteSlots((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, label: val } : s))
                                  );
                                }}
                                placeholder="Label (e.g. Sunset, Friday)"
                                className="flex-1 min-w-[110px] px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-white/30 focus:outline-none"
                              />

                              {inviteSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInviteSlots((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1.5 text-rose-400 hover:text-rose-300"
                                  title="Remove slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Allow Counterproposal */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                        <div>
                          <p className="text-xs font-medium text-white">Allow Alternative Proposals</p>
                          <p className="text-[11px] text-white/50">Partner can suggest a different time if needed</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={inviteAllowCounterproposal}
                          onChange={(e) => setInviteAllowCounterproposal(e.target.checked)}
                          className="rounded text-pink-500 focus:ring-0 h-4 w-4"
                        />
                      </div>

                      {/* Secret Surprise Notes (Private to sender) */}
                      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                        <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-purple-400" />
                          Private Surprise Notes (Secret)
                        </label>
                        <textarea
                          rows={2}
                          value={invitePrivateNotes}
                          onChange={(e) => setInvitePrivateNotes(e.target.value)}
                          placeholder="e.g. Flowers hidden in car trunk, reservation #482 under Marsad. Never visible to partner!"
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-purple-400"
                        />
                        <p className="text-[10px] text-purple-200/60 leading-relaxed">
                          Kept strictly confidential on server; stripped from partner views.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool Card: T04 Choice Cards & Polls */}
                <div
                  className="rounded-3xl p-6 border transition-all"
                  style={{
                    background: pollToolEnabled ? `${palette.accent}12` : "rgba(255,255,255,0.04)",
                    borderColor: pollToolEnabled ? palette.accent : "rgba(255,255,255,0.12)",
                    boxShadow: pollToolEnabled ? `0 8px 32px ${palette.glow}25` : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                        style={{
                          background: pollToolEnabled
                            ? `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <ListFilter className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base" style={{ color: palette.text }}>
                            Choice Cards &amp; Polls
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: `${palette.accent}25`,
                              color: palette.accent,
                            }}
                          >
                            T04
                          </span>
                        </div>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: palette.text }}>
                          Make choosing dinner, a film, or an activity easy and playful.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setPollToolEnabled(!pollToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        pollToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pollToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {pollToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Poll Question */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Question / Decision Prompt
                        </label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          maxLength={150}
                          placeholder="e.g. What should we do for our special evening?"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Subtitle / Description */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Subtitle / Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={pollDescription}
                          onChange={(e) => setPollDescription(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. Pick your favourite, or suggest something else!"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Selection Mode */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Selection Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setPollSelectionMode("both_vote")}
                            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              pollSelectionMode === "both_vote"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            <Users className="w-4 h-4 text-purple-400" />
                            <span>Both Vote (Mutual)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPollSelectionMode("partner_chooses")}
                            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              pollSelectionMode === "partner_chooses"
                                ? "border-pink-500 bg-pink-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60"
                            }`}
                          >
                            <UserCheck className="w-4 h-4 text-pink-400" />
                            <span>Partner Chooses</span>
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-white/40">
                          {pollSelectionMode === "both_vote"
                            ? "* In Both Vote mode, agreement requires matching votes. Ties remain unresolved until manual agreement."
                            : "* Partner Chooses gives your partner the decisive pick."}
                        </p>
                      </div>

                      {/* Options Editor (2–6 options) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60" style={{ color: palette.text }}>
                            Options ({pollOptions.length}/6)
                          </label>
                          {pollOptions.length < 6 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPollOptions([
                                  ...pollOptions,
                                  {
                                    id: `opt_${Date.now()}`,
                                    text: `Option ${pollOptions.length + 1}`,
                                  },
                                ]);
                              }}
                              className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Option
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {pollOptions.map((opt, idx) => (
                            <div
                              key={opt.id}
                              className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPollOptions((prev) =>
                                      prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                                    );
                                  }}
                                  placeholder={`Option ${idx + 1}`}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-white/30 focus:outline-none"
                                />

                                {pollOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPollOptions((prev) => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="p-1.5 text-rose-400 hover:text-rose-300"
                                    title="Remove option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <input
                                type="url"
                                value={opt.imageUrl || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPollOptions((prev) =>
                                    prev.map((o, i) => (i === idx ? { ...o, imageUrl: val } : o))
                                  );
                                }}
                                placeholder="Optional image URL (e.g. movie poster or restaurant photo)"
                                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white/80 placeholder-white/20 text-[11px] focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Toggles: Allow custom suggestion & Multiple choice */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                          <div>
                            <p className="text-xs font-medium text-white">Allow Custom Suggestions</p>
                            <p className="text-[11px] text-white/50">Partner can suggest their own alternative option</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={pollAllowCustomSuggestion}
                            onChange={(e) => setPollAllowCustomSuggestion(e.target.checked)}
                            className="rounded text-pink-500 focus:ring-0 h-4 w-4"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10">
                          <div>
                            <p className="text-xs font-medium text-white">Multiple Choices Allowed</p>
                            <p className="text-[11px] text-white/50">Allow voting for more than one option</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={pollAllowMultiple}
                            onChange={(e) => setPollAllowMultiple(e.target.checked)}
                            className="rounded text-pink-500 focus:ring-0 h-4 w-4"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 4: T05 Question Card */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: questionToolEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Question Cards (T05)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                            Personal
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Personalize your message with 1–5 questions. Partners answer at their own pace and can skip without penalty.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setQuestionToolEnabled(!questionToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        questionToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          questionToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {questionToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Title */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Card Title
                        </label>
                        <input
                          type="text"
                          value={questionToolTitle}
                          onChange={(e) => setQuestionToolTitle(e.target.value)}
                          maxLength={100}
                          placeholder="e.g. A few questions for you"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Subtitle */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Instructions / Subtitle (Optional)
                        </label>
                        <input
                          type="text"
                          value={questionToolDescription}
                          onChange={(e) => setQuestionToolDescription(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. Take your time and answer when you feel like it!"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Questions List (1–5) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60" style={{ color: palette.text }}>
                            Questions ({questionsList.length}/5)
                          </label>
                          {questionsList.length < 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuestionsList([
                                  ...questionsList,
                                  {
                                    id: `q_${Date.now()}`,
                                    prompt: `Question ${questionsList.length + 1}`,
                                    type: "short",
                                    skippable: true,
                                    reveal_mode: "after_partner_answers",
                                  },
                                ]);
                              }}
                              className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Question
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          {questionsList.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-white/80">Question {qIdx + 1}</span>
                                {questionsList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setQuestionsList(questionsList.filter((_, i) => i !== qIdx))}
                                    className="p-1 text-rose-400 hover:text-rose-300"
                                    title="Remove question"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Prompt */}
                              <input
                                type="text"
                                value={q.prompt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestionsList((prev) =>
                                    prev.map((item, i) => (i === qIdx ? { ...item, prompt: val } : item))
                                  );
                                }}
                                maxLength={200}
                                placeholder="Type your question..."
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none"
                              />

                              {/* Type Selector */}
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase font-bold text-white/50">Type:</label>
                                {(["short", "long", "choice"] as const).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      setQuestionsList((prev) =>
                                        prev.map((item, i) =>
                                          i === qIdx
                                            ? {
                                                ...item,
                                                type: t,
                                                options: t === "choice" ? (item.options || ["Option 1", "Option 2"]) : undefined,
                                              }
                                            : item
                                        )
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                                      q.type === t
                                        ? "bg-pink-500/30 text-pink-200 border-pink-500/50"
                                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                    }`}
                                  >
                                    {t === "short" ? "Short Text" : t === "long" ? "Long Text" : "Multiple Choice"}
                                  </button>
                                ))}
                              </div>

                              {/* Choice Options if type === "choice" */}
                              {q.type === "choice" && (
                                <div className="space-y-1.5 pl-2 border-l-2 border-pink-500/30">
                                  <span className="text-[10px] text-white/50 uppercase font-semibold">Choices (2–6)</span>
                                  {(q.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuestionsList((prev) =>
                                            prev.map((item, i) => {
                                              if (i !== qIdx) return item;
                                              const newOpts = [...(item.options || [])];
                                              newOpts[optIdx] = val;
                                              return { ...item, options: newOpts };
                                            })
                                          );
                                        }}
                                        placeholder={`Choice ${optIdx + 1}`}
                                        className="flex-1 px-2.5 py-1 rounded bg-black/40 border border-white/10 text-white text-[11px]"
                                      />
                                      {(q.options || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQuestionsList((prev) =>
                                              prev.map((item, i) => {
                                                if (i !== qIdx) return item;
                                                return {
                                                  ...item,
                                                  options: (item.options || []).filter((_, oi) => oi !== optIdx),
                                                };
                                              })
                                            );
                                          }}
                                          className="text-rose-400 hover:text-rose-300 p-1"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {(q.options || []).length < 6 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setQuestionsList((prev) =>
                                          prev.map((item, i) => {
                                            if (i !== qIdx) return item;
                                            return {
                                              ...item,
                                              options: [...(item.options || []), `Choice ${(item.options || []).length + 1}`],
                                            };
                                          })
                                        );
                                      }}
                                      className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 mt-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add choice
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Sender Answer */}
                              <div>
                                <label className="text-[10px] text-white/50 uppercase font-semibold block mb-1">
                                  Your own answer / note (revealed after partner answers):
                                </label>
                                <input
                                  type="text"
                                  value={q.sender_answer || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setQuestionsList((prev) =>
                                      prev.map((item, i) => (i === qIdx ? { ...item, sender_answer: val } : item))
                                    );
                                  }}
                                  placeholder="e.g. Ours was when we walked on the pier at dusk..."
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white/80 placeholder-white/20 text-[11px]"
                                />
                              </div>

                              {/* Skippable Checkbox */}
                              <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                  type="checkbox"
                                  checked={q.skippable}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setQuestionsList((prev) =>
                                      prev.map((item, i) => (i === qIdx ? { ...item, skippable: checked } : item))
                                    );
                                  }}
                                  className="rounded text-pink-500 focus:ring-0 h-3.5 w-3.5"
                                />
                                <span className="text-[11px] text-white/70">Skippable without penalty</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 5: T06 Private Reveal */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: revealToolEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Private Reveal (T06)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            Shared Discovery
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Answer privately, lock independently, then reveal together once both are ready. Zero leaks before eligibility!
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setRevealToolEnabled(!revealToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        revealToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          revealToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {revealToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Question / Prompt */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Reveal Prompt for Both of You
                        </label>
                        <textarea
                          rows={2}
                          value={revealToolPrompt}
                          onChange={(e) => setRevealToolPrompt(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. What was the exact moment you knew you had fallen for me?"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors resize-none"
                        />
                      </div>

                      {/* Instructions */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Instructions / Subtitle (Optional)
                        </label>
                        <input
                          type="text"
                          value={revealToolDescription}
                          onChange={(e) => setRevealToolDescription(e.target.value)}
                          maxLength={200}
                          placeholder="e.g. Answer privately, lock your words, and discover our answers together!"
                          className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Shared Countdown Seconds */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Reveal Countdown
                        </label>
                        <div className="flex gap-2">
                          {[3, 5, 10].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setRevealCountdownSeconds(s)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                                revealCountdownSeconds === s
                                  ? "bg-purple-500/30 text-purple-200 border-purple-500/50"
                                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                              }`}
                            >
                              {s} Seconds
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Security Explanation */}
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200">
                        🔒 <strong>Privacy Rule:</strong> Neither answer is sent over the network or made visible until both partners have locked their answers. Once revealed, answers cannot be undone.
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 6: T07 Scratch Reveal */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: scratchToolEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Scratch Reveal (T07)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            Playful Surprise
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Conceal a secret love note, photo, or date coupon beneath an interactive shimmer scratch-off card.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setScratchToolEnabled(!scratchToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        scratchToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          scratchToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {scratchToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Cover Title */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Cover Title (Visible Before Scratching)
                        </label>
                        <input
                          type="text"
                          value={scratchCoverTitle}
                          onChange={(e) => setScratchCoverTitle(e.target.value)}
                          maxLength={100}
                          placeholder="e.g. A secret surprise for you"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Cover Instruction */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Cover Subtitle / Instruction
                        </label>
                        <input
                          type="text"
                          value={scratchCoverInstruction}
                          onChange={(e) => setScratchCoverInstruction(e.target.value)}
                          maxLength={150}
                          placeholder="e.g. Scratch with your finger or mouse to reveal"
                          className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Content Type Selector */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-2" style={{ color: palette.text }}>
                          What is Hidden Underneath?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setScratchContentType("message")}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                              scratchContentType === "message"
                                ? "border-amber-400 bg-amber-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 text-amber-300" />
                            <span>Love Note</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setScratchContentType("photo")}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                              scratchContentType === "photo"
                                ? "border-amber-400 bg-amber-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                            }`}
                          >
                            <ImageIcon className="w-4 h-4 text-amber-300" />
                            <span>Secret Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setScratchContentType("invitation")}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                              scratchContentType === "invitation"
                                ? "border-amber-400 bg-amber-500/20 text-white font-bold"
                                : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
                            }`}
                          >
                            <Ticket className="w-4 h-4 text-amber-300" />
                            <span>Date Coupon</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Specific Inputs */}
                      {scratchContentType === "message" && (
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                            Hidden Love Note / Secret Message
                          </label>
                          <textarea
                            rows={3}
                            value={scratchHiddenMessage}
                            onChange={(e) => setScratchHiddenMessage(e.target.value)}
                            maxLength={1000}
                            placeholder="Type a heartfelt message that appears when your partner scratches off the foil..."
                            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-400 transition-colors resize-none"
                          />
                        </div>
                      )}

                      {scratchContentType === "photo" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                              Hidden Photo URL
                            </label>
                            <input
                              type="url"
                              value={scratchHiddenPhotoUrl}
                              onChange={(e) => setScratchHiddenPhotoUrl(e.target.value)}
                              placeholder="https://images.unsplash.com/... or paste image URL"
                              className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-400 transition-colors"
                            />
                          </div>

                          {/* Quick pick from memories if available */}
                          {mediaFiles.filter(f => f.uploadedUrl).length > 0 && (
                            <div>
                              <p className="text-[10px] text-white/50 mb-1.5 font-medium">Or choose from your uploaded memories:</p>
                              <div className="flex gap-2 overflow-x-auto py-1">
                                {mediaFiles.filter(f => f.uploadedUrl).map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setScratchHiddenPhotoUrl(f.uploadedUrl || "")}
                                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-transform hover:scale-105 ${
                                      scratchHiddenPhotoUrl === f.uploadedUrl ? "border-amber-400 ring-2 ring-amber-400/50" : "border-white/20"
                                    }`}
                                  >
                                    <img src={f.preview} alt="Memory choice" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {scratchHiddenPhotoUrl && (
                            <div className="w-full max-w-xs h-36 rounded-xl overflow-hidden border border-white/20 bg-black/30 relative">
                              <img src={scratchHiddenPhotoUrl} alt="Scratch preview" className="w-full h-full object-cover" />
                              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-amber-200">
                                Reveal Preview
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {scratchContentType === "invitation" && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs text-amber-100">
                          <div className="flex items-center gap-2 font-bold text-amber-300">
                            <Ticket className="w-4 h-4" />
                            <span>VIP Invitation & Golden Date Coupon</span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed">
                            Revealing this card unveils a special coupon that scrolls directly to your Date Invitation & RSVP tool, encouraging your partner to accept the date!
                          </p>
                          {!invitationToolEnabled && (
                            <div className="mt-2 p-2 rounded-lg bg-black/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between">
                              <span>Make sure to also enable <strong>Invitation & RSVP (T02)</strong> above!</span>
                              <button
                                type="button"
                                onClick={() => setInvitationToolEnabled(true)}
                                className="px-2.5 py-1 rounded-md bg-amber-400 text-black font-semibold text-[10px] hover:bg-amber-300 cursor-pointer"
                              >
                                Enable T02
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Accessibility & Features Tip */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 space-y-1">
                        <div className="font-semibold text-white/80 flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Interactive & Accessible</span>
                        </div>
                        <p>
                          Works seamlessly on mobile touchscreens and desktop mouse. Includes keyboard support (Enter/Space), a visible &ldquo;Reveal now&rdquo; button, and persists the revealed state on return.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 7: T08 Love Coupon */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: couponToolEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Love Coupon (T08)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                            Single-Use Voucher
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Grant a redeemable romantic voucher (massage, dinner, getaway) with request &amp; acceptance flow and optional scheduling.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setCouponToolEnabled(!couponToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        couponToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          couponToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {couponToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Coupon Title */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Coupon Title
                        </label>
                        <input
                          type="text"
                          value={couponTitle}
                          onChange={(e) => setCouponTitle(e.target.value)}
                          maxLength={100}
                          placeholder="e.g. Full Body Massage & Pampering, Romantic Dinner, Breakfast in Bed"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Coupon Description */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Terms &amp; Romantic Description
                        </label>
                        <textarea
                          rows={2}
                          value={couponDescription}
                          onChange={(e) => setCouponDescription(e.target.value)}
                          maxLength={400}
                          placeholder="e.g. Valid anytime you want total relaxation, soothing music, and back rubs."
                          className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400 transition-colors resize-none"
                        />
                      </div>

                      {/* Expiration Settings */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60" style={{ color: palette.text }}>
                            Optional Expiration Date
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-white/70">
                            <input
                              type="checkbox"
                              checked={couponHasExpiry}
                              onChange={(e) => setCouponHasExpiry(e.target.checked)}
                              className="rounded border-white/20 bg-black/40 text-pink-500 focus:ring-0"
                            />
                            <span>Set Expiry</span>
                          </label>
                        </div>

                        {couponHasExpiry && (
                          <div className="flex gap-2 mt-2">
                            {[7, 14, 30, 60, 90].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setCouponExpiryDays(days)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                                  couponExpiryDays === days
                                    ? "bg-rose-500/30 text-rose-200 border-rose-500/50"
                                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                }`}
                              >
                                {days} Days
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scheduling Integration */}
                      <div>
                        <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              Enable Date Scheduling
                            </span>
                            <span className="text-[11px] text-white/50 block mt-0.5">
                              Allows your partner to propose a date/time when requesting the coupon and coordinate via the Date Invitation flow.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={couponEnableScheduling}
                            onChange={(e) => setCouponEnableScheduling(e.target.checked)}
                            className="rounded border-white/20 bg-black/40 text-pink-500 focus:ring-0 mt-0.5 cursor-pointer"
                          />
                        </div>

                        {couponEnableScheduling && !invitationToolEnabled && (
                          <div className="mt-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 flex items-center justify-between">
                            <span>Pair with <strong>Invitation &amp; RSVP (T02)</strong> for date coordination:</span>
                            <button
                              type="button"
                              onClick={() => setInvitationToolEnabled(true)}
                              className="px-2.5 py-1 rounded-md bg-purple-500 text-white font-semibold text-[10px] hover:bg-purple-400 cursor-pointer"
                            >
                              Enable T02
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Rule Reminder */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 space-y-1">
                        <div className="font-semibold text-white/80 flex items-center gap-1.5">
                          <span>🔒</span>
                          <span>Server Enforced Single-Use</span>
                        </div>
                        <p>
                          Your partner sends a request to use the coupon. You review and accept the request. Double redemption and duplicate requests are securely blocked on the server.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 8: T09 Open When Letters */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: openWhenToolEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Open When Letters (T09)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                            Up to 3 Envelopes
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Prepare personal letters for special moments (when you miss me, had a tough day, need a laugh) opened by choice.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setOpenWhenToolEnabled(!openWhenToolEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        openWhenToolEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          openWhenToolEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {openWhenToolEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-5 pt-5 border-t border-white/10 space-y-4 text-left"
                    >
                      {/* Tool Title */}
                      <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block mb-1.5" style={{ color: palette.text }}>
                          Collection Title
                        </label>
                        <input
                          type="text"
                          value={openWhenTitle}
                          onChange={(e) => setOpenWhenTitle(e.target.value)}
                          maxLength={100}
                          placeholder="e.g. Open When Letters"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 transition-colors"
                        />
                      </div>

                      {/* Explicit Choice Reminder */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 space-y-1">
                        <div className="font-semibold text-white/90 flex items-center gap-1.5">
                          <span>🕊️</span>
                          <span>Open by Choice</span>
                        </div>
                        <p>
                          These envelopes open whenever your partner chooses — whenever they need comfort, a smile, or a warm reminder of your love. No scheduled delivery or timers.
                        </p>
                      </div>

                      {/* Envelopes list (1 to 3) */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wider opacity-60" style={{ color: palette.text }}>
                            Envelopes ({openWhenEnvelopes.length}/3)
                          </label>
                          {openWhenEnvelopes.length < 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenWhenEnvelopes([
                                  ...openWhenEnvelopes,
                                  {
                                    id: `env_${Date.now()}`,
                                    occasion: "you need a smile",
                                    message: "Remember that goofy face I make? I'm sending you the biggest hug right now!",
                                  },
                                ]);
                              }}
                              className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Envelope
                            </button>
                          )}
                        </div>

                        {openWhenEnvelopes.map((env, eIdx) => (
                          <div
                            key={env.id}
                            className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white/80">Envelope #{eIdx + 1}</span>
                              {openWhenEnvelopes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenWhenEnvelopes(openWhenEnvelopes.filter((_, i) => i !== eIdx))
                                  }
                                  className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                  title="Remove envelope"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Occasion input */}
                            <div>
                              <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                Occasion: &ldquo;Open when...&rdquo;
                              </label>
                              <div className="flex items-center rounded-lg bg-black/50 border border-white/15 overflow-hidden">
                                <span className="px-3 py-1.5 text-xs text-pink-300 font-semibold bg-white/5 border-r border-white/10 select-none">
                                  Open when
                                </span>
                                <input
                                  type="text"
                                  value={env.occasion.replace(/^open when\s*/i, "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOpenWhenEnvelopes((prev) =>
                                      prev.map((item, i) => (i === eIdx ? { ...item, occasion: val } : item))
                                    );
                                  }}
                                  maxLength={80}
                                  placeholder="you miss me, you need courage, you can't sleep..."
                                  className="flex-1 px-3 py-1.5 bg-transparent text-white placeholder-white/30 text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Personal message */}
                            <div>
                              <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                Personal Letter Message
                              </label>
                              <textarea
                                rows={3}
                                value={env.message}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOpenWhenEnvelopes((prev) =>
                                    prev.map((item, i) => (i === eIdx ? { ...item, message: val } : item))
                                  );
                                }}
                                maxLength={2000}
                                placeholder="Write from your heart..."
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none resize-none"
                              />
                            </div>

                            {/* Optional media attachment */}
                            <div>
                              <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                Optional Media Attachment (Photo or Video)
                              </label>
                              <input
                                type="url"
                                value={env.mediaUrl || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOpenWhenEnvelopes((prev) =>
                                    prev.map((item, i) =>
                                      i === eIdx
                                        ? { ...item, mediaUrl: val, mediaType: val.match(/\.(mp4|webm|mov)$/i) ? "video" : "image" }
                                        : item
                                    )
                                  );
                                }}
                                placeholder="Paste photo/video URL or select from memories below"
                                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none"
                              />

                              {/* Pick from memory files if available */}
                              {mediaFiles.filter((f) => f.uploadedUrl).length > 0 && (
                                <div className="mt-1.5">
                                  <p className="text-[10px] text-white/40 mb-1">Or choose from uploaded memories:</p>
                                  <div className="flex gap-1.5 overflow-x-auto py-0.5">
                                    {mediaFiles
                                      .filter((f) => f.uploadedUrl)
                                      .map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => {
                                            setOpenWhenEnvelopes((prev) =>
                                              prev.map((item, i) =>
                                                i === eIdx
                                                  ? { ...item, mediaUrl: f.uploadedUrl, mediaType: f.type }
                                                  : item
                                              )
                                            );
                                          }}
                                          className={`relative w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                                            env.mediaUrl === f.uploadedUrl
                                              ? "border-pink-400 ring-2 ring-pink-400/50"
                                              : "border-white/20"
                                          }`}
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={f.preview} alt="Memory" className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Attach Reply Option */}
                      <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            Attach Reply Action
                          </span>
                          <span className="text-[11px] text-white/50 block mt-0.5">
                            Allows your partner to reply with a message, photo, or voice note after reading each letter.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={openWhenAttachReply}
                          onChange={(e) => setOpenWhenAttachReply(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-pink-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 9: T10 Our Story Memories */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: ourStoryEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Our Story Memories (T10)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                            3 to 5 Ordered Cards
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Curate chronological photo cards with personal captions. At the ending, your partner can contribute one photo and caption with &ldquo;Add your side&rdquo;.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setOurStoryEnabled(!ourStoryEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        ourStoryEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          ourStoryEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {ourStoryEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10 space-y-4"
                    >
                      {/* Title & Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-white/80 block mb-1">
                            Story Title
                          </label>
                          <input
                            type="text"
                            value={ourStoryTitle}
                            onChange={(e) => setOurStoryTitle(e.target.value)}
                            maxLength={100}
                            placeholder="Our Story Memories"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/80 block mb-1">
                            Description (optional)
                          </label>
                          <input
                            type="text"
                            value={ourStoryDescription}
                            onChange={(e) => setOurStoryDescription(e.target.value)}
                            maxLength={500}
                            placeholder="A journey through our favorite moments together."
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                          />
                        </div>
                      </div>

                      {/* Cards Header & Add Card */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-white/80">
                          Photo Cards ({ourStoryCards.length} of 5)
                        </span>

                        {ourStoryCards.length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (ourStoryCards.length < 5) {
                                setOurStoryCards((prev) => [
                                  ...prev,
                                  {
                                    id: `card_${Date.now()}`,
                                    photo_url: "",
                                    caption: "",
                                    date: "",
                                    order: prev.length,
                                  },
                                ]);
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Card</span>
                          </button>
                        )}
                      </div>

                      {/* Cards List */}
                      <div className="space-y-3">
                        {ourStoryCards.map((card, cIdx) => (
                          <div
                            key={card.id}
                            className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[10px] font-bold flex items-center justify-center">
                                  {cIdx + 1}
                                </span>
                                <span className="text-xs font-semibold text-white/90">
                                  Card #{cIdx + 1}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={cIdx === 0}
                                  onClick={() => {
                                    if (cIdx > 0) {
                                      const nextCards = [...ourStoryCards];
                                      const temp = nextCards[cIdx - 1];
                                      nextCards[cIdx - 1] = nextCards[cIdx];
                                      nextCards[cIdx] = temp;
                                      setOurStoryCards(nextCards);
                                    }
                                  }}
                                  className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={cIdx === ourStoryCards.length - 1}
                                  onClick={() => {
                                    if (cIdx < ourStoryCards.length - 1) {
                                      const nextCards = [...ourStoryCards];
                                      const temp = nextCards[cIdx + 1];
                                      nextCards[cIdx + 1] = nextCards[cIdx];
                                      nextCards[cIdx] = temp;
                                      setOurStoryCards(nextCards);
                                    }
                                  }}
                                  className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 transition-colors"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                {ourStoryCards.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOurStoryCards((prev) => prev.filter((_, i) => i !== cIdx));
                                    }}
                                    className="p-1 rounded text-rose-400 hover:text-rose-300 transition-colors ml-1"
                                    title="Delete Card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Photo Picker */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-white/70 block">
                                Photo (Select from template memories or enter image URL)
                              </label>

                              {/* Quick Picker from Uploaded Media */}
                              {mediaFiles.filter((f) => f.uploadedUrl).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-white/40 block">
                                    Click an uploaded memory to attach:
                                  </span>
                                  <div className="flex gap-1.5 overflow-x-auto py-0.5">
                                    {mediaFiles
                                      .filter((f) => f.uploadedUrl)
                                      .map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => {
                                            setOurStoryCards((prev) =>
                                              prev.map((item, i) =>
                                                i === cIdx
                                                  ? { ...item, photo_url: f.uploadedUrl || "" }
                                                  : item
                                              )
                                            );
                                          }}
                                          className={`relative w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                                            card.photo_url === f.uploadedUrl
                                              ? "border-pink-400 ring-2 ring-pink-400/50"
                                              : "border-white/20"
                                          }`}
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={f.preview} alt="Memory" className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}

                              <input
                                type="text"
                                value={card.photo_url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOurStoryCards((prev) =>
                                    prev.map((item, i) =>
                                      i === cIdx ? { ...item, photo_url: val } : item
                                    )
                                  );
                                }}
                                placeholder="https://... or select memory above"
                                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                              />
                            </div>

                            {/* Caption and Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-medium text-white/70 block mb-1">
                                  Caption / Memory
                                </label>
                                <textarea
                                  value={card.caption}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOurStoryCards((prev) =>
                                      prev.map((item, i) =>
                                        i === cIdx ? { ...item, caption: val } : item
                                      )
                                    );
                                  }}
                                  rows={2}
                                  maxLength={500}
                                  placeholder="Write a personal caption for this moment..."
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30 resize-none"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-medium text-white/70 block mb-1">
                                  Date / Label (optional)
                                </label>
                                <input
                                  type="text"
                                  value={card.date}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOurStoryCards((prev) =>
                                      prev.map((item, i) =>
                                        i === cIdx ? { ...item, date: val } : item
                                      )
                                    );
                                  }}
                                  maxLength={50}
                                  placeholder="e.g. Summer 2023"
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Live Theme Preview Box */}
                      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: palette.accent }}>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Live Theme Preview (Styled in {SCENES[selectedScene].label})</span>
                        </div>
                        <div
                          className="p-3 rounded-lg border text-xs"
                          style={{
                            background: palette.card || "rgba(15, 23, 42, 0.6)",
                            borderColor: `${palette.accent}40`,
                            color: palette.text,
                          }}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span>Chapter 1: {ourStoryCards[0]?.date || "Moment"}</span>
                            <span style={{ color: palette.accent }}>Our Story Memories</span>
                          </div>
                          <p className="italic font-light opacity-90">
                            &ldquo;{ourStoryCards[0]?.caption || "The first day we met..."}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Privacy & Retention Notice */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 space-y-1">
                        <div className="font-semibold text-white/80 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Separately Authored &amp; Private</span>
                        </div>
                        <p>
                          Your partner can contribute one photo and caption with &ldquo;Add your side&rdquo; at the ending. Contributions are kept private between the two of you and follow template deletion and retention rules. Not a permanent album platform.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Tool 10: T11 Mini Couple Bucket List */}
                <div
                  className="p-5 rounded-2xl border transition-all text-left"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: bucketListEnabled ? `${palette.accent}60` : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${palette.accent}20`, color: palette.accent }}
                      >
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm" style={{ color: palette.text }}>
                            Mini Couple Bucket List (T11)
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                            Up to 5 Initial Ideas
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Share up to five initial adventure ideas. Your partner can add ideas, mark interest, plan dates, and record memories when completed.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setBucketListEnabled(!bucketListEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        bucketListEnabled ? "bg-emerald-500" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          bucketListEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Config Options if Enabled */}
                  {bucketListEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10 space-y-4"
                    >
                      {/* Title & Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-white/80 block mb-1">
                            Bucket List Title
                          </label>
                          <input
                            type="text"
                            value={bucketListTitle}
                            onChange={(e) => setBucketListTitle(e.target.value)}
                            maxLength={100}
                            placeholder="Mini Couple Bucket List"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/80 block mb-1">
                            Description (optional)
                          </label>
                          <input
                            type="text"
                            value={bucketListDescription}
                            onChange={(e) => setBucketListDescription(e.target.value)}
                            maxLength={500}
                            placeholder="Adventures and dreams we want to experience together."
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                          />
                        </div>
                      </div>

                      {/* Initial Ideas List Header & Add Button */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-white/80">
                          Initial Ideas ({bucketListItems.length} of 5)
                        </span>

                        {bucketListItems.length < 5 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (bucketListItems.length < 5) {
                                setBucketListItems((prev) => [
                                  ...prev,
                                  {
                                    id: `item_${Date.now()}`,
                                    title: "",
                                    note: "",
                                    status: "wished",
                                    created_by: "creator",
                                  },
                                ]);
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Idea</span>
                          </button>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        {bucketListItems.map((it, idx) => (
                          <div
                            key={it.id}
                            className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white/90">
                                Idea #{idx + 1}
                              </span>

                              {bucketListItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBucketListItems((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-rose-400 hover:text-rose-300 p-1 transition-colors"
                                  title="Delete Idea"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <input
                              type="text"
                              value={it.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBucketListItems((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                                );
                              }}
                              maxLength={120}
                              placeholder="e.g. Try pottery class, Watch northern lights..."
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                            />

                            <input
                              type="text"
                              value={it.note}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBucketListItems((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, note: val } : item))
                                );
                              }}
                              maxLength={500}
                              placeholder="Optional note: What makes this special..."
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation Box */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 space-y-1">
                        <div className="font-semibold text-white/80 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-pink-400" />
                          <span>Collaborative &amp; Unconfirmed Planning</span>
                        </div>
                        <p>
                          Once opened, your partner can add ideas, mark interest (&ldquo;I&apos;m in! ❤️&rdquo;), and click &ldquo;Let&apos;s plan this&rdquo; to start a date draft without auto-confirming. Completed adventures can capture memories.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(3)}
                    className="px-4 py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.08)", color: palette.text }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(5)}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                      boxShadow: `0 6px 24px ${palette.glow}40`,
                    }}
                  >
                    <span>Next: Set Expiry</span>
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: Expiry ── */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: palette.accent }}>
                    Step 6 of 6 • Expiry
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    How Long Will It Live?
                  </h2>
                  <p className="text-sm opacity-60" style={{ color: palette.text }}>
                    After expiry, the link, template, and replies are automatically deleted
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.hours}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setExpiryHours(opt.hours)}
                      className="py-5 rounded-2xl font-bold text-sm transition-all space-y-1 cursor-pointer"
                      style={{
                        background: expiryHours === opt.hours
                          ? `linear-gradient(135deg, ${palette.accent}30, ${palette.glow}20)`
                          : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${expiryHours === opt.hours ? palette.accent : "rgba(255,255,255,0.1)"}`,
                        color: palette.text,
                        boxShadow: expiryHours === opt.hours ? `0 4px 20px ${palette.glow}30` : "none",
                      }}
                    >
                      <div className="text-2xl">{opt.icon}</div>
                      <div className="font-bold">{opt.label}</div>
                    </motion.button>
                  ))}
                </div>

                {/* Expiry preview */}
                <div
                  className="px-5 py-4 rounded-2xl flex items-center gap-3"
                  style={{ background: `${palette.accent}12`, border: `1px solid ${palette.accent}25` }}
                >
                  <Clock className="w-4 h-4 shrink-0" style={{ color: palette.accent }} />
                  <p className="text-sm" style={{ color: palette.text }}>
                    <span className="font-bold" style={{ color: palette.accent }}>Expires: </span>
                    {new Date(previewCreatedAt + expiryHours * 60 * 60 * 1000).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(4)}
                    className="px-4 py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.08)", color: palette.text }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex-1 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                      boxShadow: `0 8px 32px ${palette.glow}50`,
                      opacity: isGenerating ? 0.7 : 1,
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate My Link
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 6: Done (Links & Secret Manage Link) ── */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 text-center"
              >
                {/* Success heart */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    background: `radial-gradient(circle, ${palette.accent}40, ${palette.glow}20)`,
                    boxShadow: `0 0 60px ${palette.glow}50`,
                  }}
                >
                  <Heart className="w-10 h-10 fill-current" style={{ color: palette.accent }} />
                </motion.div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: palette.text, fontFamily: "Georgia, serif" }}>
                    Your link is ready! 🌸
                  </h2>
                  <p className="text-xs sm:text-sm opacity-60" style={{ color: palette.text }}>
                    Share the public link with {partnerName} and keep your secret manage link safe.
                  </p>
                </div>

                {/* 1. Public Share Link for Partner */}
                <div
                  className="rounded-2xl p-4 sm:p-5 space-y-3 text-left"
                  style={{
                    background: palette.card,
                    border: `1.5px solid ${palette.accent}40`,
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      💌 Public Link for {partnerName}
                    </span>
                    <span className="text-white/40">Send via WhatsApp/iMessage</span>
                  </div>

                  <div
                    className="px-3.5 py-2.5 rounded-xl font-mono text-xs break-all text-left"
                    style={{ background: "rgba(0,0,0,0.3)", color: palette.accent }}
                  >
                    {generatedUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/t/${generatedCode}`}
                  </div>

                  <div className="flex gap-2.5">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopy}
                      className="flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                        color: "#fff",
                        boxShadow: `0 4px 16px ${palette.glow}40`,
                      }}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied Link!" : "Copy Partner Link"}
                    </motion.button>
                    <a
                      href={`/t/${generatedCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.1)", color: palette.text }}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Preview
                    </a>
                  </div>
                </div>

                {/* 2. Secret Creator Manage Link (Cross-device support) */}
                {generatedManageUrl && (
                  <div
                    className="rounded-2xl p-4 sm:p-5 space-y-3 text-left bg-black/40 border border-emerald-500/30"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Secret Manage Link (For You)
                      </span>
                      <span className="text-[11px] text-emerald-400/80">Cross-device inbox</span>
                    </div>

                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Save or copy this private link to check replies from your phone or another computer.
                    </p>

                    <div
                      className="px-3.5 py-2.5 rounded-xl font-mono text-[11px] break-all text-left bg-black/50 text-emerald-300 border border-emerald-500/20"
                    >
                      {generatedManageUrl}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyManage}
                      className="w-full py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                    >
                      {copiedManage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedManage ? "Copied Secret Link!" : "Copy Secret Manage Link"}
                    </button>
                  </div>
                )}

                {/* 3. Direct Link to Creator Center */}
                <Link
                  href="/creator-center"
                  className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${palette.accent}25, ${palette.glow}20)`,
                    borderColor: `${palette.accent}60`,
                    color: "#fff",
                  }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: palette.accent }} />
                  <span>Go to Creator Center (View All Partner Replies)</span>
                </Link>

                {/* Expiry info */}
                {generatedExpiry && (
                  <div
                    className="px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", color: palette.text }}
                  >
                    <Clock className="w-4 h-4 opacity-50" style={{ color: palette.accent }} />
                    <span className="opacity-60">
                      Auto-expires{" "}
                      {new Date(generatedExpiry).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {/* Make another */}
                <button onClick={async () => {
                  const response = await fetch(`/api/templates/${generatedCode}`, { method: "DELETE" });
                  if (!response.ok) { alert("The template could not be deleted. Please try again."); return; }
                  mediaFiles.forEach(file => URL.revokeObjectURL(file.preview));
                  setMediaFiles([]); setGeneratedCode(""); setGeneratedUrl(""); goToStep(0);
                }} className="text-sm underline opacity-70" style={{ color: palette.text }}>Delete this template</button>
                <button
                  onClick={() => {
                    mediaFiles.forEach(file => URL.revokeObjectURL(file.preview));
                    goToStep(0);
                    setPartnerName("");
                    setYourName("");
                    setMessage("");
                    setHasMedia(false);
                    setMediaFiles([]);
                    setSelectedTrack(null);
                    setTrackStartAt(0);
                    setPreviewCurrentTime(0);
                    setExpiryHours(24);
                    setGeneratedCode("");
                    setGeneratedUrl("");
                    setGeneratedExpiry("");
                  }}
                  className="text-sm underline underline-offset-4 opacity-50 hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ color: palette.text }}
                >
                  ＋ Create another template
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Branding */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pb-6">
        <Heart className="w-2.5 h-2.5 fill-current opacity-30" style={{ color: palette.accent }} />
        <span className="text-[10px] opacity-30 font-medium tracking-wide" style={{ color: palette.text }}>
          Made with QubitSells
        </span>
        <Heart className="w-2.5 h-2.5 fill-current opacity-30" style={{ color: palette.accent }} />
      </div>
    </div>
  );
}
