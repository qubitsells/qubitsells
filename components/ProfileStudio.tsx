"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  User,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Save,
  Shield,
  Bell,
  Flame,
  Gift,
  Clock,
  LogOut,
  ArrowLeft,
  Mail,
  KeyRound,
  Edit3,
  Loader2,
  Share2,
  CheckCircle2,
  AlertCircle,
  Stars,
  Compass,
  Music,
  Play,
  Pause,
  Disc,
  RotateCcw,
  Trash2,
  ExternalLink,
  Unlink,
  AlertTriangle,
  HeartHandshake,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import CouplePairingCard from "@/components/CouplePairingCard";

const LOVE_LANGUAGES = [
  { id: "words", label: "Words of Affirmation", icon: "💬", desc: "Expressing affection through spoken words, praise, or appreciation." },
  { id: "time", label: "Quality Time", icon: "⏳", desc: "Undivided attention and dedicated moments together." },
  { id: "gifts", label: "Receiving Gifts", icon: "🎁", desc: "Visual symbols of love, thoughtfulness, and effort." },
  { id: "acts", label: "Acts of Service", icon: "☕", desc: "Actions that ease the burden of responsibilities for your partner." },
  { id: "touch", label: "Physical Touch", icon: "🤝", desc: "Non-verbal hugs, holding hands, and physical closeness." },
];

export default function ProfileStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  const consumedInviteRef = useRef<string | null>(null);
  const { user, loading: authLoading, signOut, isConnected, couple, refreshCouple, pairWithCode, disconnect } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "preferences" | "security">("overview");

  // Disconnection modal states
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [coupleMotto, setCoupleMotto] = useState("");
  const [loveLanguage, setLoveLanguage] = useState("time");
  const [partnerLoveLanguage, setPartnerLoveLanguage] = useState("words");
  const [emailReminders, setEmailReminders] = useState(true);
  const [vibeReminders, setVibeReminders] = useState(true);
  const [coupleCode, setCoupleCode] = useState("");

  // Couple Anthem (YouTube Background Soundtrack) States
  const [anthemUrl, setAnthemUrl] = useState("");
  const [anthemYoutubeId, setAnthemYoutubeId] = useState("");
  const [anthemTitle, setAnthemTitle] = useState("");
  const [anthemArtist, setAnthemArtist] = useState("");
  const [anthemThumbnail, setAnthemThumbnail] = useState("");
  const [anthemDuration, setAnthemDuration] = useState<number>(240);
  const [anthemStart, setAnthemStart] = useState<number>(0);
  const [anthemAutoplay, setAnthemAutoplay] = useState(false);

  // Anthem Interaction & Playback States
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [fetchingAnthem, setFetchingAnthem] = useState(false);
  const [anthemFetchError, setAnthemFetchError] = useState<string | null>(null);
  const [isAnthemPlaying, setIsAnthemPlaying] = useState(false);
  const [anthemHasStarted, setAnthemHasStarted] = useState(false);
  const [isTestingAnthem, setIsTestingAnthem] = useState(false);

  // Send control command to embedded YouTube iframe in profile
  const postAnthemMessage = (func: string, args: unknown[] = []) => {
    try {
      ytIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    } catch {}
  };

  // Toggle Anthem playback without resetting track position
  const toggleAnthemPlay = () => {
    if (isAnthemPlaying) {
      setIsAnthemPlaying(false);
      setAnthemHasStarted(false);
    } else {
      setIsTestingAnthem(false);
      setAnthemHasStarted(true);
      setIsAnthemPlaying(true);
    }
  };

  // Restart Anthem from designated startAt seconds
  const restartAnthem = () => {
    setIsTestingAnthem(false);
    setAnthemHasStarted(true);
    setIsAnthemPlaying(true);
    postAnthemMessage("seekTo", [anthemStart, true]);
    postAnthemMessage("playVideo");
  };

  // UI States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!user || !couple || !inviteCode || consumedInviteRef.current === inviteCode) return;
    consumedInviteRef.current = inviteCode;
    pairWithCode(inviteCode).then(result => {
      setMessage({ type: result.success ? "success" : "error", text: result.message });
      router.replace("/profile");
    }).catch(() => setMessage({ type: "error", text: "The invitation could not be accepted. Please try the code again." }));
  }, [user, couple, inviteCode, pairWithCode, router]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Fetch YouTube Track Info via our backend API
  const handleFetchAnthem = async (urlOverride?: string) => {
    const targetUrl = (urlOverride || anthemUrl).trim();
    if (!targetUrl) {
      setAnthemFetchError("Please paste a valid YouTube song link (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setFetchingAnthem(true);
    setAnthemFetchError(null);
    setIsTestingAnthem(false);
    setIsAnthemPlaying(false);
    setAnthemHasStarted(false);

    try {
      const res = await fetch(`/api/music/youtube?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();

      if (!res.ok || !data.track) {
        throw new Error(data.error || "Could not retrieve video information. Please verify the URL.");
      }

      const { track } = data;
      setAnthemYoutubeId(track.youtubeId || "");
      setAnthemTitle(track.title || "YouTube Song");
      setAnthemArtist(track.artist || "YouTube Artist");
      setAnthemThumbnail(track.thumbnail || "");
      setAnthemDuration(track.duration || 240);
      if (typeof track.startAt === "number" && track.startAt > 0) {
        setAnthemStart(track.startAt);
      }
    } catch (err: unknown) {
      setAnthemFetchError((err instanceof Error ? err.message : "Please try again.") || "Failed to fetch YouTube song details.");
    } finally {
      setFetchingAnthem(false);
    }
  };

  // Load user & shared couple data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/profile");
      return;
    }

    if (user) {
      const meta = user.user_metadata || {};
      // This editable form is hydrated from asynchronously refreshed auth/couple data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(meta.full_name || meta.name || user.email?.split("@")[0] || "");
      setPartnerNickname(meta.partner_nickname || "My Soulmate");
      setLoveLanguage(meta.love_language || "time");
      setPartnerLoveLanguage(meta.partner_love_language || "words");
      setEmailReminders(meta.email_reminders !== false);
      setVibeReminders(meta.vibe_reminders !== false);

      // Shared couple fields: prioritize database couple data, then fallback to metadata
      setAnniversaryDate(couple?.anniversary_date || meta.anniversary_date || "");
      setCoupleMotto(couple?.couple_motto || meta.couple_motto || "Hand in hand, writing our forever story.");
      setCoupleCode(couple?.couple_code || "");

      // Hydrate Anthem
      const anthemObj = couple ? couple.couple_anthem || {} : meta.couple_anthem || {};
      const songUrl = anthemObj.url || "";
      const yId = anthemObj.youtubeId || "";
      const sTitle = anthemObj.title || "";
      const sArtist = anthemObj.artist || "";
      const sThumb = anthemObj.thumbnail || "";
      const sStart = typeof anthemObj.startAt === "number" ? anthemObj.startAt : 0;
      const sAuto = anthemObj.autoplay === true;

      setAnthemUrl(songUrl);
      setAnthemYoutubeId(yId);
      setAnthemTitle(sTitle);
      setAnthemArtist(sArtist);
      setAnthemThumbnail(sThumb);
      setAnthemStart(sStart);
      setAnthemAutoplay(sAuto);

      // When visiting profile, if autoplay is enabled, auto-start playback
      if (sAuto && yId) {
        setIsAnthemPlaying(true);
        setAnthemHasStarted(true);
      } else {
        setIsAnthemPlaying(false);
        setAnthemHasStarted(false);
      }
    }
  }, [user, authLoading, couple, router]);

  // Autoplay gesture unlock: ensures playback begins immediately if browser blocks initial unmuted iframe autoplay
  useEffect(() => {
    if (!anthemYoutubeId || !anthemAutoplay) return;

    const handleUnlockAudio = () => {
      postAnthemMessage("playVideo");
    };

    window.addEventListener("click", handleUnlockAudio, { once: true });
    window.addEventListener("touchstart", handleUnlockAudio, { once: true });
    window.addEventListener("keydown", handleUnlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", handleUnlockAudio);
      window.removeEventListener("touchstart", handleUnlockAudio);
      window.removeEventListener("keydown", handleUnlockAudio);
    };
  }, [anthemYoutubeId, anthemAutoplay]);

  // Calculate relationship duration in days
  const calculateDaysInLove = () => {
    if (!anniversaryDate) return 0;
    const start = new Date(anniversaryDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : diffDays;
  };

  // Calculate days until next anniversary
  const calculateNextAnniversaryDays = () => {
    if (!anniversaryDate) return 0;
    const [_, month, day] = anniversaryDate.split("-").map(Number);
    if (!month || !day) return 0;

    const now = new Date();
    let next = new Date(now.getFullYear(), month - 1, day);
    if (next.getTime() < now.getTime()) {
      next = new Date(now.getFullYear() + 1, month - 1, day);
    }
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 42 : diffDays;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(coupleCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/signup?code=${coupleCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setIsTestingAnthem(false);

    // If autoplay is enabled, arm playback; otherwise stop it
    if (anthemAutoplay && anthemYoutubeId) {
      setIsAnthemPlaying(true);
      setAnthemHasStarted(true);
    } else {
      setIsAnthemPlaying(false);
      setAnthemHasStarted(false);
    }

    try {
      const anthemPayload = anthemYoutubeId
        ? {
            url: anthemUrl,
            youtubeId: anthemYoutubeId,
            title: anthemTitle,
            artist: anthemArtist,
            thumbnail: anthemThumbnail,
            duration: anthemDuration,
            startAt: anthemStart,
            autoplay: anthemAutoplay,
          }
        : null;

      if (!user || !couple) throw new Error("Your shared space is not ready. Refresh and try again.");
      const { error: coupleError, data: savedCouple } = await supabase.from("couples")
        .update({ anniversary_date: anniversaryDate || null, couple_motto: coupleMotto, couple_anthem: anthemPayload, updated_at: new Date().toISOString() })
        .eq("id", couple.id).select("id").single();
      if (coupleError || !savedCouple) throw new Error("Your shared details could not be saved. Please try again.");
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id, couple_id: couple.id, full_name: fullName, partner_nickname: partnerNickname,
        love_language: loveLanguage, partner_love_language: partnerLoveLanguage,
        email_reminders: emailReminders, vibe_reminders: vibeReminders, couple_anthem: anthemPayload,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw new Error("Your profile could not be saved. Please try again.");

      // 3. Update Auth Metadata as guaranteed persistent storage
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          partner_nickname: partnerNickname,
          anniversary_date: anniversaryDate,
          couple_motto: coupleMotto,
          love_language: loveLanguage,
          partner_love_language: partnerLoveLanguage,
          email_reminders: emailReminders,
          vibe_reminders: vibeReminders,
          couple_code: coupleCode,
          couple_anthem: anthemPayload,
          couple_anthem_url: anthemPayload ? anthemUrl : "",
          couple_anthem_youtube_id: anthemPayload ? anthemYoutubeId : "",
          couple_anthem_title: anthemPayload ? anthemTitle : "",
          couple_anthem_artist: anthemPayload ? anthemArtist : "",
          couple_anthem_thumbnail: anthemPayload ? anthemThumbnail : "",
          couple_anthem_start: anthemPayload ? anthemStart : 0,
          couple_anthem_autoplay: anthemAutoplay,
        },
      });

      if (error) throw error;

      await refreshCouple();

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f43f5e", "#fda4af", "#be123c", "#fff"],
        });
      } catch {}

      setMessage({
        type: "success",
        text: "💕 Shared couple details synced in real-time for both of you!",
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err instanceof Error ? err.message : "Please try again.") || "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    setMessage(null);
    setIsAnthemPlaying(false);
    setAnthemHasStarted(false);

    try {
      const res = await disconnect();
      if (res.success) {
        setIsDisconnectModalOpen(false);
        setMessage({
          type: "success",
          text: res.message || "Disconnected successfully. Your couple space has been unlinked.",
        });
        setPartnerNickname("");
        setAnniversaryDate("");
        setAnthemUrl("");
        setAnthemYoutubeId("");
        setAnthemTitle("");
        setAnthemArtist("");
        setAnthemThumbnail("");
      } else {
        setMessage({
          type: "error",
          text: res.message || "Could not disconnect at this time. Please try again.",
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err instanceof Error ? err.message : "Disconnect failed. Please try again."),
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        <p className="text-sm font-medium text-rose-800">Opening your couple sanctuary...</p>
      </div>
    );
  }

  if (!user) return null;

  const daysInLove = calculateDaysInLove();
  const nextMilestoneDays = calculateNextAnniversaryDays();
  const userInitial = (fullName || user.email || "L").charAt(0).toUpperCase();
  const partnerInitial = (partnerNickname || "P").charAt(0).toUpperCase();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      
      {/* ─── 1. ROMANTIC HERO BANNER & COUPLE BRIDGE ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/95 via-rose-50/80 to-pink-50/70 backdrop-blur-2xl border border-rose-200/90 shadow-[0_15px_40px_-10px_rgba(244,63,94,0.14)] overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Linked Couple Avatars */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center">
              {/* User Avatar */}
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 p-0.5 shadow-lg shadow-rose-500/25">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xl sm:text-2xl font-extrabold text-rose-600">
                    {userInitial}
                  </div>
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs whitespace-nowrap">
                  You
                </span>
              </div>

              {/* Romantic Bridge Icon */}
              <div className="relative -mx-2 z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md border-2 border-white animate-pulse">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              </div>

              {/* Partner Avatar */}
              <div className="relative group">
                {isConnected ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-pink-400 via-rose-400 to-amber-300 p-0.5 shadow-lg shadow-pink-500/20">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xl sm:text-2xl font-extrabold text-pink-600">
                      {partnerInitial}
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-rose-300 bg-rose-50/60 flex flex-col items-center justify-center text-rose-400 p-1">
                    <Heart className="w-5 h-5 text-rose-300 animate-pulse" />
                    <span className="text-[9px] font-bold text-rose-500 mt-0.5">Invite</span>
                  </div>
                )}
                <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs whitespace-nowrap ${
                  isConnected ? "bg-pink-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {isConnected ? partnerNickname || "Partner" : "Unpaired"}
                </span>
              </div>
            </div>

            {/* Couple Heading Info */}
            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#2d0819]">
                  {fullName} {isConnected ? `& ${partnerNickname}` : "(Waiting for Partner)"}
                </h1>
                {isConnected ? (
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/90 shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span>Connected</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsDisconnectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                      title="Disconnect from partner"
                    >
                      <Unlink className="w-3.5 h-3.5 text-rose-500 transition-transform group-hover:-rotate-12" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200/90 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Not Connected</span>
                  </span>
                )}
              </div>
              <p className="font-serif italic text-xs sm:text-sm text-rose-800/80">
                &quot;{coupleMotto}&quot;
              </p>
              <p className="text-[11px] text-[#712844] font-medium">
                Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })} • {user.email}
              </p>
            </div>
          </div>

          {/* Quick Invite Code Badge */}
          <div className="p-4 rounded-2xl bg-white/95 border border-rose-200/90 shadow-xs flex flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-rose-500" />
              {isConnected ? "Shared Sanctuary Code" : "Private Love Code"}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm sm:text-base font-extrabold text-rose-900 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                {coupleCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors cursor-pointer"
                title="Copy Love Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {isConnected ? (
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Unlink className="w-3 h-3 text-rose-500" />
                <span>Disconnect Sanctuary</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>{copiedLink ? "Invite Link Copied! 💕" : "Copy Partner Invite Link"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Relationship Vital Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-rose-200/70">
          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-center">
            <span className="block text-xl sm:text-2xl font-extrabold text-gradient-rose">
              {isConnected && anniversaryDate ? daysInLove : "—"}
            </span>
            <span className="text-[11px] font-bold text-[#551d33]">
              {isConnected ? "Days in Love 🌹" : "Pair to Track 🌹"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-center">
            <span className="block text-xl sm:text-2xl font-extrabold text-gradient-rose">
              {isConnected && anniversaryDate ? `${nextMilestoneDays}d` : "—"}
            </span>
            <span className="text-[11px] font-bold text-[#551d33]">
              {isConnected ? "Next Anniversary 🥂" : "Set Anniversary 🥂"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-center">
            <span className="block text-xl sm:text-2xl font-extrabold text-gradient-rose">
              {isConnected ? "100%" : "Solo"}
            </span>
            <span className="text-[11px] font-bold text-[#551d33]">
              {isConnected ? "Vibe Resonance ✨" : "Private Sanctuary ✨"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-center">
            <span className="block text-xl sm:text-2xl font-extrabold text-gradient-rose">
              {isConnected ? "2-Person" : "Encrypted"}
            </span>
            <span className="text-[11px] font-bold text-[#551d33]">
              {isConnected ? "Shared Privacy 🔐" : "Solo Privacy 🔐"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. TABBED NAVIGATION ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "overview"
              ? "bg-white text-rose-900 shadow-sm border border-rose-300/80"
              : "text-[#62233b] hover:bg-rose-100/60"
          }`}
        >
          <Compass className="w-4 h-4 text-rose-500" />
          <span>Space Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "settings"
              ? "bg-white text-rose-900 shadow-sm border border-rose-300/80"
              : "text-[#62233b] hover:bg-rose-100/60"
          }`}
        >
          <Edit3 className="w-4 h-4 text-rose-500" />
          <span>Edit Profiles & Dates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "preferences"
              ? "bg-white text-rose-900 shadow-sm border border-rose-300/80"
              : "text-[#62233b] hover:bg-rose-100/60"
          }`}
        >
          <Heart className="w-4 h-4 text-rose-500" />
          <span>Love Languages & Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "security"
              ? "bg-white text-rose-900 shadow-sm border border-rose-300/80"
              : "text-[#62233b] hover:bg-rose-100/60"
          }`}
        >
          <Shield className="w-4 h-4 text-rose-500" />
          <span>Account & Security</span>
        </button>
      </div>

      {/* Alert Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-3 border shadow-xs ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 3. TAB CONTENTS ─── */}

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Live Real-time Couple Pairing Card */}
          <CouplePairingCard />

          {/* ─── COUPLE ANTHEM AMBIENT PLAYER BANNER ─── */}
          {isConnected && anthemYoutubeId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-xl shadow-rose-500/20 overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Spinning Vinyl Record */}
                  <div
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-stone-900 border-2 border-stone-700 flex items-center justify-center shadow-lg shrink-0 overflow-hidden"
                    style={{ animation: isAnthemPlaying ? "spin 6s linear infinite" : "none" }}
                  >
                    {anthemThumbnail ? (
                      <img src={anthemThumbnail} alt="Anthem Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Disc className="w-7 h-7 text-rose-300" />
                    )}
                    <div className="absolute w-3 h-3 rounded-full bg-stone-950 ring-2 ring-white/80" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                        <Music className="w-3 h-3 text-rose-200" />
                        Our Couple Anthem
                      </span>
                      {isAnthemPlaying && (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 h-full bg-white animate-pulse" />
                          <span className="w-0.5 h-2/3 bg-white animate-pulse delay-75" />
                          <span className="w-0.5 h-full bg-white animate-pulse delay-150" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white truncate drop-shadow-xs mt-0.5">
                      {anthemTitle || "Romantic Background Song"}
                    </h4>
                    <p className="text-xs text-rose-100/90 truncate">
                      {anthemArtist ? `${anthemArtist} • ` : ""}Plays from {formatTime(anthemStart)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={toggleAnthemPlay}
                    className="px-4 py-2 rounded-2xl bg-white text-rose-600 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    {isAnthemPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-rose-600" />
                        <span>Pause Song</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-rose-600" />
                        <span>Play Anthem</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={restartAnthem}
                    title="Replay from start timestamp"
                    className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Change Song</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-rose-50/90 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 shadow-2xs flex items-center justify-center shrink-0 border border-rose-200/60">
                  <Music className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2a091a]">Set Your Couple Anthem 🎵</h4>
                  <p className="text-xs text-[#6e2541] font-medium mt-0.5">
                    Add a YouTube song that plays softly in the background whenever you or your partner visit your shared space.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="btn-love-primary px-4 py-2 rounded-2xl text-xs font-bold text-white shrink-0 cursor-pointer shadow-xs"
              >
                + Add YouTube Song
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Tools Access Card */}
            <div className="md:col-span-2 rounded-3xl p-6 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#2b0818] flex items-center gap-2">
              <Stars className="w-4 h-4 text-rose-500" />
              Your Active Couple Tools
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/couple-space#vibe-check"
                className="p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-white shadow-2xs text-rose-500 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2e091b]">Vibe Check Generator</h4>
                  <p className="text-[11px] text-[#6d2440] font-medium mt-0.5">
                    Generate tonight&#39;s date based on current energy.
                  </p>
                </div>
              </Link>

              <Link
                href="/couple-space"
                className="p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-white shadow-2xs text-rose-500 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2e091b]">Shared Dates Calendar</h4>
                  <p className="text-[11px] text-[#6d2440] font-medium mt-0.5">
                    Distraction-free calendar for anniversaries & milestones.
                  </p>
                </div>
              </Link>

              <Link
                href="/couple-space"
                className="p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-white shadow-2xs text-rose-500 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2e091b]">Digital Time Capsule</h4>
                  <p className="text-[11px] text-[#6d2440] font-medium mt-0.5">
                    Sealed love notes to open on future anniversaries.
                  </p>
                </div>
              </Link>

              <Link
                href="/templates"
                className="p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 transition-all flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-white shadow-2xs text-rose-500 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2e091b]">Couple Templates</h4>
                  <p className="text-[11px] text-[#6d2440] font-medium mt-0.5">
                    Browse romantic themes & interactive love tools.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Partner Card */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-white/95 via-rose-50/60 to-pink-50/60 backdrop-blur-xl border border-rose-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#2b0818] flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Partner Connection
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-rose-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Primary Love Language
                </span>
                <p className="font-bold text-[#350d20] flex items-center gap-1.5">
                  <span>{LOVE_LANGUAGES.find((l) => l.id === loveLanguage)?.icon}</span>
                  <span>{LOVE_LANGUAGES.find((l) => l.id === loveLanguage)?.label}</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-rose-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Partner&#39;s Love Language
                </span>
                <p className="font-bold text-[#350d20] flex items-center gap-1.5">
                  <span>{LOVE_LANGUAGES.find((l) => l.id === partnerLoveLanguage)?.icon}</span>
                  <span>{LOVE_LANGUAGES.find((l) => l.id === partnerLoveLanguage)?.label}</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-rose-200/70 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Anniversary Date
                </span>
                <p className="font-bold text-[#350d20]">
                  {anniversaryDate
                    ? new Date(anniversaryDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not set yet"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )}

      {/* TAB: SETTINGS (EDIT PROFILE) */}
      {activeTab === "settings" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 sm:p-8 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-sm"
        >
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="border-b border-rose-100 pb-4">
              <h3 className="text-lg font-bold text-[#2d0819]">Personal & Couple Profile Details</h3>
              <p className="text-xs text-[#6e2743] font-medium mt-1">
                Update how your name and couple space are displayed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#451428] mb-1.5">
                  Your Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#451428] mb-1.5">
                  Partner&#39;s Pet Name 💕 {isConnected ? "" : "(Optional until paired)"}
                </label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type="text"
                    required={isConnected}
                    value={partnerNickname}
                    onChange={(e) => setPartnerNickname(e.target.value)}
                    placeholder={isConnected ? "e.g. My Soulmate" : "e.g. My Soulmate (Pair to activate)"}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#451428] mb-1.5">
                  Anniversary / Official Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type="date"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#451428] mb-1.5">
                  Shared Couple Motto
                </label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                  <input
                    type="text"
                    value={coupleMotto}
                    onChange={(e) => setCoupleMotto(e.target.value)}
                    placeholder="e.g. Hand in hand, writing our forever story."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>

            {/* ─── COUPLE ANTHEM (YOUTUBE BACKGROUND MUSIC) ─── */}
            <div className="pt-6 border-t border-rose-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-[#2d0819] flex items-center gap-2">
                    <Disc className="w-5 h-5 text-rose-500" />
                    <span>Our Couple Anthem (Background Music)</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-extrabold tracking-wide uppercase">
                      YouTube Audio
                    </span>
                  </h4>
                  <p className="text-xs text-[#6e2743] font-medium mt-1">
                    Play your special song in the background whenever you or your partner visit your couple profile.
                  </p>
                </div>
                {anthemYoutubeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnthemUrl("");
                      setAnthemYoutubeId("");
                      setAnthemTitle("");
                      setAnthemArtist("");
                      setAnthemThumbnail("");
                      setAnthemStart(0);
                      setIsAnthemPlaying(false);
                      setAnthemHasStarted(false);
                      setIsTestingAnthem(false);
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Song</span>
                  </button>
                )}
              </div>

              {/* YouTube URL Input & Fetch Button */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#451428]">
                  YouTube Song Link
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                    <input
                      type="url"
                      value={anthemUrl}
                      onChange={(e) => setAnthemUrl(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=2Vv-BfVoq4g or https://youtu.be/..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchAnthem()}
                    disabled={fetchingAnthem || !anthemUrl.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {fetchingAnthem ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Music className="w-4 h-4" />
                        <span>Load Song</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Romantic Quick Preset Links */}
              {!anthemYoutubeId && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[#712844] block">
                    Popular Romantic Inspirations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { title: "Ed Sheeran — Perfect", url: "https://www.youtube.com/watch?v=2Vv-BfVoq4g" },
                      { title: "Taylor Swift — Lover", url: "https://www.youtube.com/watch?v=-BjZmE2gtdo" },
                      { title: "Christina Perri — A Thousand Years", url: "https://www.youtube.com/watch?v=rtOvBOTyX00" },
                      { title: "Stephen Sanchez — Until I Found You", url: "https://www.youtube.com/watch?v=GxldQ9eX2wo" },
                    ].map((sample) => (
                      <button
                        key={sample.title}
                        type="button"
                        onClick={() => {
                          setAnthemUrl(sample.url);
                          handleFetchAnthem(sample.url);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 text-[11px] font-medium border border-rose-200/80 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Heart className="w-3 h-3 text-rose-400" />
                        <span>{sample.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error display */}
              {anthemFetchError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{anthemFetchError}</span>
                </div>
              )}

              {/* Track Card & Start Time Settings */}
              {anthemYoutubeId && (
                <div className="rounded-2xl p-4 sm:p-5 bg-rose-50/60 border border-rose-200/90 space-y-4">
                  {/* Selected Track Preview Header */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-rose-200 shadow-xs">
                      {anthemThumbnail ? (
                        <img src={anthemThumbnail} alt={anthemTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-rose-400">
                          <Music className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-sm bg-red-600 text-white text-[9px] font-black uppercase tracking-wider">
                          YouTube
                        </span>
                        <span className="text-[11px] font-bold text-rose-600">Active Anthem</span>
                      </div>
                      <h5 className="text-sm font-bold text-[#2d0819] truncate mt-0.5">
                        {anthemTitle}
                      </h5>
                      <p className="text-xs text-[#712844] truncate">{anthemArtist}</p>
                    </div>
                  </div>

                  {/* ─── START TIME SELECTOR ─── */}
                  <div className="pt-3 border-t border-rose-200/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#3d0f23] block">
                          Set Where the Song Starts
                        </span>
                        <span className="text-[11px] text-[#712844]">
                          Choose the exact chorus, intro, or special lyric to start from.
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-300 text-xs font-extrabold text-rose-600 shadow-2xs">
                        Starts at {formatTime(anthemStart)}
                      </span>
                    </div>

                    {/* Dual Minute & Second Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#691f3a]">
                          Minutes
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={Math.floor(anthemStart / 60)}
                          onChange={(e) => {
                            const m = Math.max(0, parseInt(e.target.value || "0"));
                            const s = anthemStart % 60;
                            setAnthemStart(m * 60 + s);
                          }}
                          className="w-full text-center px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-900 focus:outline-hidden focus:border-rose-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#691f3a]">
                          Seconds
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={anthemStart % 60}
                          onChange={(e) => {
                            const m = Math.floor(anthemStart / 60);
                            const s = Math.min(59, Math.max(0, parseInt(e.target.value || "0")));
                            setAnthemStart(m * 60 + s);
                          }}
                          className="w-full text-center px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-900 focus:outline-hidden focus:border-rose-500"
                        />
                      </div>

                      {/* Live Test / Audition Button */}
                      <div className="col-span-2 pt-4 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (isTestingAnthem) {
                              setIsTestingAnthem(false);
                              setIsAnthemPlaying(false);
                              setAnthemHasStarted(false);
                            } else {
                              setIsAnthemPlaying(false);
                              setAnthemHasStarted(false);
                              setIsTestingAnthem(true);
                            }
                          }}
                          className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                            isTestingAnthem
                              ? "bg-stone-900 text-white hover:bg-black"
                              : "bg-white border border-rose-300 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {isTestingAnthem ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                              <span>Stop Test Preview</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                              <span>▶ Test Audio from {formatTime(anthemStart)}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Smooth Scrubber Slider */}
                    <div className="space-y-1 pt-1">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(anthemDuration, 300)}
                        step={1}
                        value={anthemStart}
                        onChange={(e) => setAnthemStart(Number(e.target.value))}
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[#712844] font-medium px-0.5">
                        <span>0:00 (Start)</span>
                        <span className="font-bold text-rose-600">{formatTime(anthemStart)}</span>
                        <span>{formatTime(Math.max(anthemDuration, 300))}</span>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: "0:00 (Beginning)", sec: 0 },
                        { label: "0:30 (Intro)", sec: 30 },
                        { label: "0:45", sec: 45 },
                        { label: "1:00 (Chorus)", sec: 60 },
                        { label: "1:30 (Build-up)", sec: 90 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setAnthemStart(preset.sec)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            anthemStart === preset.sec
                              ? "bg-rose-500 text-white shadow-2xs"
                              : "bg-white text-rose-800 border border-rose-200 hover:bg-rose-100/60"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Audition Embedded Player */}
                    {isTestingAnthem && (
                      <div className="pt-2 space-y-2">
                        <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-rose-300">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${anthemYoutubeId}?autoplay=1&start=${anthemStart}&enablejsapi=1`}
                            title="Anthem Audition Preview"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            className="w-full h-full"
                          />
                        </div>
                        <p className="text-[11px] text-center text-rose-700 font-medium">
                          🎵 Testing music starting at <span className="font-bold">{formatTime(anthemStart)}</span>. If this is the exact part you like, click &quot;Save Profile Changes&quot; below!
                        </p>
                      </div>
                    )}

                    {/* Autoplay in profile checkbox */}
                    <label className="flex items-center gap-2.5 pt-2 text-xs font-medium text-[#400e25] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={anthemAutoplay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAnthemAutoplay(checked);
                          if (!checked) {
                            setIsAnthemPlaying(false);
                            setAnthemHasStarted(false);
                          } else if (anthemYoutubeId) {
                            setIsAnthemPlaying(true);
                            setAnthemHasStarted(true);
                          }
                        }}
                        className="w-4 h-4 rounded-md border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-500 cursor-pointer"
                      />
                      <span>Auto-play softly in background when opening our profile space</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-love-primary px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* TAB: PREFERENCES & LOVE LANGUAGES */}
      {activeTab === "preferences" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 sm:p-8 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-sm space-y-6"
        >
          <div className="border-b border-rose-100 pb-4">
            <h3 className="text-lg font-bold text-[#2d0819]">Love Languages & Intimacy Reminders</h3>
            <p className="text-xs text-[#6e2743] font-medium mt-1">
              Customize how you connect and receive notifications.
            </p>
          </div>

          {/* Your Love Language */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#451428]">
              Your Primary Love Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {LOVE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLoveLanguage(lang.id)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    loveLanguage === lang.id
                      ? "bg-rose-50 border-rose-400 shadow-xs"
                      : "bg-white border-rose-200/70 hover:bg-rose-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-[#2c0819]">
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                  </div>
                  <p className="text-[10px] text-[#712844] mt-1 line-clamp-2">{lang.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Partner's Love Language */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-[#451428]">
              Partner&#39;s Love Language
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {LOVE_LANGUAGES.map((lang) => (
                <button
                  key={`partner-${lang.id}`}
                  type="button"
                  onClick={() => setPartnerLoveLanguage(lang.id)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    partnerLoveLanguage === lang.id
                      ? "bg-pink-50 border-pink-400 shadow-xs"
                      : "bg-white border-rose-200/70 hover:bg-rose-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-[#2c0819]">
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                  </div>
                  <p className="text-[10px] text-[#712844] mt-1 line-clamp-2">{lang.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="pt-4 border-t border-rose-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Notification & Email Reminders
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/70 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-[#300a1c] block">
                      Anniversary & Birthday Early Alerts
                    </span>
                    <span className="text-[11px] text-[#702945]">
                      Receive gentle email reminders 1 week and 1 day before special dates.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailReminders}
                  onChange={(e) => setEmailReminders(e.target.checked)}
                  className="w-4 h-4 rounded-md border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/70 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-[#300a1c] block">
                      Weekly Vibe Check & Date Night Suggestions
                    </span>
                    <span className="text-[11px] text-[#702945]">
                      Inspiring date ideas curated for Friday and Saturday evenings.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={vibeReminders}
                  onChange={(e) => setVibeReminders(e.target.checked)}
                  className="w-4 h-4 rounded-md border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-love-primary px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Preferences</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* TAB: SECURITY & ACCOUNT */}
      {activeTab === "security" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 sm:p-8 bg-white/95 backdrop-blur-xl border border-rose-200/90 shadow-sm space-y-6"
        >
          <div className="border-b border-rose-100 pb-4">
            <h3 className="text-lg font-bold text-[#2d0819]">Account & Privacy Sanctuary</h3>
            <p className="text-xs text-[#6e2743] font-medium mt-1">
              Your security and session information.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Couple Space Connection Management */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="font-bold text-[#2f0b1e] block">
                    {isConnected ? `Connected with ${partnerNickname || "Partner"}` : "Unpaired (Solo Sanctuary)"}
                  </span>
                  <span className="text-[#6e2541]">
                    {isConnected
                      ? "Your 2-person private sanctuary is active. Real-time updates enabled."
                      : "You are not connected to a partner. Solo memories and features remain active."}
                  </span>
                </div>
              </div>
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <Unlink className="w-3.5 h-3.5 text-rose-500" />
                  <span>Disconnect Partner</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2 rounded-xl btn-love-primary text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Pair with Partner</span>
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-rose-500" />
                <div>
                  <span className="font-bold text-[#2f0b1e] block">Email Address</span>
                  <span className="text-[#6e2541]">{user.email}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] self-start sm:self-auto">
                Verified Account
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-rose-500" />
                <div>
                  <span className="font-bold text-[#2f0b1e] block">End-to-End Encryption</span>
                  <span className="text-[#6e2541]">Your private capsules and love notes are protected with Supabase RLS.</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] self-start sm:self-auto">
                Active 🔐
              </span>
            </div>

            <div className="pt-4 border-t border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-rose-900 block text-xs">Sign Out of All Devices</span>
                <span className="text-[11px] text-[#712844]">
                  Clear your active session and close your couple space safely.
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Sign Out of QubitSells</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Disconnect Confirmation Dialog ─── */}
      <AnimatePresence>
        {isDisconnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 space-y-4"
            >
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                disabled={isDisconnecting}
                className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2d0819]">
                    Disconnect from {partnerNickname || "Partner"}?
                  </h3>
                  <p className="text-xs text-[#712844] font-medium">
                    Unlinking your shared couple sanctuary
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-xs text-[#521c32] space-y-2">
                <p className="font-semibold text-rose-950">
                  Please review what happens after disconnecting:
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed text-[#68243e]">
                  <li>
                    <strong>Shared space access closed:</strong> Neither of you will be able to access the shared couple space, joint countdowns, or shared couple anthem.
                  </li>
                  <li>
                    <strong>Couple capsules removed:</strong> Shared dual-sealed time capsules and pending unlock requests will no longer be accessible to either partner.
                  </li>
                  <li>
                    <strong>Solo memories preserved:</strong> Any solo time capsules and personal notes you created stay safe in your private vault.
                  </li>
                  <li>
                    <strong>New Love Codes:</strong> Both of you will receive fresh Love Codes to connect with someone whenever you wish.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisconnectModalOpen(false)}
                  disabled={isDisconnecting}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Keep Connected
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDisconnect}
                  disabled={isDisconnecting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Yes, Disconnect Couple Space</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── HIDDEN BACKGROUND YOUTUBE AUDIO PLAYER ─── */}
      {isConnected && anthemYoutubeId && isAnthemPlaying && !isTestingAnthem && (
        <iframe
          ref={ytIframeRef}
          key={`profile-bg-${anthemYoutubeId}-${anthemStart}`}
          src={`https://www.youtube-nocookie.com/embed/${anthemYoutubeId}?autoplay=1&start=${anthemStart}&enablejsapi=1&loop=1&playlist=${anthemYoutubeId}`}
          title="Background Couple Anthem"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          className="w-1 h-1 fixed -bottom-96 -right-96 opacity-0 pointer-events-none overflow-hidden"
        />
      )}
    </div>
  );
}
