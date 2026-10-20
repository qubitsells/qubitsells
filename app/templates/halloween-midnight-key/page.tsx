"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Music,
  Clock,
  Play,
  Pause,
  Trash2,
  Upload,
  Share2,
  Key,
} from "lucide-react";
import {
  MIDNIGHT_KEY_SCENES,
  MIDNIGHT_KEY_CONFIG,
  MIDNIGHT_KEY_PALETTE,
  DEFAULT_MIDNIGHT_GALLERY_ITEMS,
} from "@/lib/constants/midnightKeyTemplate";
import {
  FloatingQuoteGallery,
  type FloatingGalleryItem,
} from "@/components/templates/FloatingQuoteGallery";
import type { MusicTrack, TemplateTool } from "@/lib/supabase/coupleTemplates";
import { type FreeTouseTrack, artistName } from "@/lib/freetouse";
import { CURATED_TRACKS } from "@/lib/curatedTracks";
import StoreHeader from "@/components/storefront/StoreHeader";
import PurchaseDetails from "@/components/commerce/PurchaseDetails";
import {publishTemplate} from "@/lib/publish-template";

const HALLOWEEN_MUSIC_CATEGORIES = [
  { id: "ambient", label: "🌙 Midnight Ambient", query: "ambient" },
  { id: "romantic", label: "💕 Romantic", query: "romantic" },
  { id: "piano", label: "🎹 Sweet Piano", query: "piano" },
  { id: "lofi", label: "☕ Cozy Lofi", query: "lofi" },
  { id: "acoustic", label: "🎸 Acoustic", query: "guitar" },
  { id: "relaxing", label: "✨ Relaxing", query: "relaxing" },
];

export default function HalloweenMidnightKeyStudio() {
  const [step, setStep] = useState(0); // 0 = Names & Story, 1 = Tools Selection, 2 = Floating Gallery, 3 = Music & Expiry, 4 = Share

  // Step 1: Couple & Message
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [openingTagline, setOpeningTagline] = useState(MIDNIGHT_KEY_CONFIG.defaultOpening);
  const [personalMessage, setPersonalMessage] = useState(MIDNIGHT_KEY_CONFIG.defaultMessage);

  // ─────────────────────────────────────────────
  // Step 2: All 11 QubitSells Tools State
  // ─────────────────────────────────────────────

  // 1. T01 Reply Tool
  const [replyToolEnabled, setReplyToolEnabled] = useState(true);
  const [replyAllowVoice, setReplyAllowVoice] = useState(true);
  const [replyAllowPhoto, setReplyAllowPhoto] = useState(true);

  // 2. T02 Date Invitation & Proposed Slots
  const [dateToolEnabled, setDateToolEnabled] = useState(true);
  const [dateSlots, setDateSlots] = useState([
    { id: "slot_1", start_time: "Halloween Night, 8:00 PM", label: "Halloween Night (8:00 PM)" },
    { id: "slot_2", start_time: "Midnight Walk, 11:30 PM", label: "Midnight Walk (11:30 PM)" },
  ]);
  const [newSlotInput, setNewSlotInput] = useState("");

  // 3. T03 Date Location & Venue Map
  const [locationToolEnabled, setLocationToolEnabled] = useState(false);
  const [dateFormat, setDateFormat] = useState<"in_person" | "online">("in_person");
  const [dateLocation, setDateLocation] = useState("Under the Moonlit Trees");

  // 4. T04 Vibe Check & Choice Polls
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("What sounds sweetest for our Halloween adventure?");
  const [pollOptions, setPollOptions] = useState([
    "A Moonlit Stroll & Hot Apple Cider",
    "Spooky Movie Marathon Under Blankets",
    "Midnight Pumpkin Carving & Treats",
  ]);
  const [newPollOption, setNewPollOption] = useState("");

  // 5. T05 Heart-to-Heart Question Prompt
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState("What was the exact moment you knew you had feelings for me?");

  // 6. T06 Synchronized Secret Reveal
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealPrompt, setRevealPrompt] = useState("A secret confession that only unlocks when we both open it together...");

  // 7. T07 Scratch-to-Reveal Card
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchTitle, setScratchTitle] = useState("A midnight surprise for you ✨");
  const [scratchSecret, setScratchSecret] = useState("You will always be my favorite kind of magic. Happy Halloween!");

  // 8. T08 Sweet Love Coupon Voucher
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState("One Cozy Backrub & Warm Hot Chocolate");
  const [couponDesc, setCouponDesc] = useState("Redeemable whenever you feel cold or need extra love.");

  // 9. T09 Open When Sealed Letter
  const [openWhenEnabled, setOpenWhenEnabled] = useState(false);
  const [openWhenOccasion, setOpenWhenOccasion] = useState("Open when you feel cold or miss me");
  const [openWhenLetter, setOpenWhenLetter] = useState("Whenever the night feels too quiet, remember that my heart is always right beside you.");

  // 10. T10 Our Story Timeline Memories
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [storyCards] = useState([
    { photo_url: "/templates/halloween-midnight-key/01-the-hidden-key.png", caption: "Where it all began — finding the hidden key." },
    { photo_url: "/templates/halloween-midnight-key/02-follow-the-fireflies.png", caption: "Following the glowing fireflies across the bridge." },
    { photo_url: "/templates/halloween-midnight-key/05-the-heart-of-the-adventure.png", caption: "Discovering our glowing heart together." },
  ]);

  // 11. T11 Couple Bucket List
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketItems, setBucketItems] = useState([
    "Go on a midnight lantern walk together",
    "Carve glowing jack-o'-lanterns side by side",
    "Watch spooky mystery movies all night under soft blankets",
  ]);
  const [newBucketItem, setNewBucketItem] = useState("");

  // Floating Photo & Quote Gallery State
  const [floatingGalleryEnabled, setFloatingGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("Our Midnight Memories & Whispers");
  const [gallerySubtitle, setGallerySubtitle] = useState("Hover over each memory to reveal the secret quote inside my heart ✨");
  const [galleryItems, setGalleryItems] = useState<FloatingGalleryItem[]>(DEFAULT_MIDNIGHT_GALLERY_ITEMS);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 4: Music & Expiry
  const [tracks, setTracks] = useState<FreeTouseTrack[]>(CURATED_TRACKS);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [musicTab, setMusicTab] = useState<"catalog" | "youtube">("catalog");
  const [selectedCategory, setSelectedCategory] = useState("ambient");
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const expiryHours = 72;
  const [trackStartAt, setTrackStartAt] = useState(0);
  const [isYtTesting, setIsYtTesting] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load recommended music tracks
  const fetchMusic = useCallback(async (query: string) => {
    setLoadingMusic(true);
    try {
      const q = query.trim() || "ambient";
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      if (data?.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
        setTracks(data.tracks);
        setSelectedTrack((prev) => {
          if (!prev) {
            const first = data.tracks[0];
            return {
              id: first.id,
              title: first.title,
              artist: first.artists?.[0]?.[1]?.name || "Artist",
              thumbnailUrl: first.thumbnails?.md || first.thumbnails?.sm || "",
              mp3Url: first.files?.mp3 || "",
              duration: first.duration,
              startAt: 0,
              waveform: first.waveform || [],
              type: "freetouse",
            };
          }
          return prev;
        });
      } else {
        setTracks(CURATED_TRACKS);
      }
    } catch {
      setTracks(CURATED_TRACKS);
    } finally {
      setLoadingMusic(false);
    }
  }, []);

  useEffect(() => {
    void fetchMusic("ambient");
  }, [fetchMusic]);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Step 5: Submission & Results
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedManageUrl, setGeneratedManageUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const handlePreviewMusic = (track: FreeTouseTrack, startAtSeconds = 0) => {
    if (previewTrackId === track.id) {
      previewAudioRef.current?.pause();
      setPreviewTrackId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(track.files.mp3);
      const applyTime = () => {
        if (startAtSeconds > 0) {
          try {
            audio.currentTime = startAtSeconds;
          } catch {}
        }
      };
      audio.addEventListener("loadedmetadata", applyTime);
      audio.onended = () => setPreviewTrackId(null);
      audio
        .play()
        .then(() => {
          applyTime();
          previewAudioRef.current = audio;
          setPreviewTrackId(track.id);
        })
        .catch(() => {});
    }
  };

  const handleStartAtChange = (newSec: number) => {
    const maxSec = selectedTrack ? Math.max(0, Math.floor(selectedTrack.duration || 300) - 1) : 600;
    const clamped = Math.max(0, Math.min(newSec, maxSec));
    setTrackStartAt(clamped);
    setSelectedTrack((prev) => (prev ? { ...prev, startAt: clamped } : null));

    if (previewAudioRef.current && previewTrackId === selectedTrack?.id) {
      try {
        previewAudioRef.current.currentTime = clamped;
      } catch {}
    }
  };

  const toggleSelectedPreview = () => {
    if (!selectedTrack) return;

    if (selectedTrack.type === "youtube") {
      setIsYtTesting((prev) => !prev);
      return;
    }

    if (!selectedTrack.mp3Url) return;

    if (previewTrackId === selectedTrack.id) {
      previewAudioRef.current?.pause();
      setPreviewTrackId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(selectedTrack.mp3Url);
      const applyTime = () => {
        if (trackStartAt > 0) {
          try {
            audio.currentTime = trackStartAt;
          } catch {}
        }
      };
      audio.addEventListener("loadedmetadata", applyTime);
      audio.onended = () => setPreviewTrackId(null);
      audio
        .play()
        .then(() => {
          applyTime();
          previewAudioRef.current = audio;
          setPreviewTrackId(selectedTrack.id);
        })
        .catch(() => {});
    }
  };

  const handleSelectTrack = (track: FreeTouseTrack) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewTrackId(null);
    }
    setIsYtTesting(false);
    setTrackStartAt(0);
    setSelectedTrack({
      id: track.id,
      title: track.title,
      artist: track.artists?.[0]?.[1]?.name || artistName(track) || "Artist",
      thumbnailUrl: track.thumbnails?.md || track.thumbnails?.sm || "",
      mp3Url: track.files?.mp3 || "",
      duration: track.duration,
      startAt: 0,
      waveform: track.waveform || [],
      type: "freetouse",
    });
  };

  const handleVerifyYoutube = async () => {
    const cleanUrl = youtubeUrl.trim();
    if (!cleanUrl) return;
    setYoutubeLoading(true);
    setYoutubeError(null);
    try {
      const res = await fetch("/api/music/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load YouTube track.");
      const startSec = data.track?.startAt || 0;
      const track: MusicTrack = data.track || {
        id: `yt-${data.videoId}`,
        title: data.title || "YouTube Halloween Track",
        artist: data.author || data.artist || "YouTube Artist",
        thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`,
        mp3Url: `https://www.youtube.com/watch?v=${data.videoId}`,
        duration: data.duration || 300,
        startAt: startSec,
        waveform: [],
        type: "youtube",
        youtubeId: data.videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${data.videoId}`,
      };
      setSelectedTrack(track);
      setTrackStartAt(startSec);
      setIsYtTesting(false);
    } catch (err: unknown) {
      setYoutubeError((err as Error).message || "Invalid YouTube link. Please check the URL.");
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    setDateSlots((prev) => [
      ...prev,
      {
        id: `slot_${Date.now()}`,
        start_time: newSlotInput.trim(),
        label: newSlotInput.trim(),
      },
    ]);
    setNewSlotInput("");
  };

  const handleRemoveSlot = (id: string) => {
    setDateSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddPollOption = () => {
    if (!newPollOption.trim()) return;
    setPollOptions((prev) => [...prev, newPollOption.trim()]);
    setNewPollOption("");
  };

  const handleRemovePollOption = (index: number) => {
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBucketItem = () => {
    if (!newBucketItem.trim()) return;
    setBucketItems((prev) => [...prev, newBucketItem.trim()]);
    setNewBucketItem("");
  };

  const handleRemoveBucketItem = (index: number) => {
    setBucketItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Floating Photo Gallery Handlers
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "bonded/couple_templates");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      const newItem: FloatingGalleryItem = {
        id: `float_${Date.now()}`,
        url: data.url || data.secure_url,
        quote: "You will always be my favorite kind of magic.",
        author: yourName.trim() || "You & Me",
        aspect: "tall",
      };
      setGalleryItems((prev) => [...prev, newItem]);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Could not upload image. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleUpdateItemQuote = (id: string, quote: string) => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, quote } : item)));
  };

  const handleUpdateItemAuthor = (id: string, author: string) => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, author } : item)));
  };

  const handleUpdateItemAspect = (id: string, aspect: "tall" | "wide" | "square" | "circle" | "badge") => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, aspect } : item)));
  };

  const handleRemoveGalleryItem = (id: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaultGallery = () => {
    setGalleryItems(DEFAULT_MIDNIGHT_GALLERY_ITEMS);
  };

  const buildToolsPayload = (): TemplateTool[] => {
    const tools: TemplateTool[] = [];

    // 1. T01: Reply Tool
    if (replyToolEnabled) {
      tools.push({
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: "Leave a secret note or reply for me...",
        enabledFormats: {
          text: true,
          photo: replyAllowPhoto,
          voice: replyAllowVoice,
        },
        maxChars: 2000,
        maxPhotos: 3,
        maxVoiceSeconds: 60,
        allowMultiple: true,
        quickReactions: ["🎃", "🗝️", "🌙", "✨", "🖤"],
      });
    }

    // 2 & 3. T02 & T03: Date Invitation & Location
    if (dateToolEnabled) {
      tools.push({
        id: "invitation_t02",
        type: "invitation",
        enabled: true,
        activity: "Our Halloween Adventure",
        invitationMessage: MIDNIGHT_KEY_CONFIG.finalQuestion,
        format: locationToolEnabled ? dateFormat : "in_person",
        location: locationToolEnabled ? dateLocation.trim() || "Under the Moonlit Trees" : undefined,
        dateMode: "slots",
        durationMinutes: 120,
        senderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        proposedSlots: dateSlots.map((s) => ({
          id: s.id,
          start_time: s.start_time,
          label: s.label,
        })),
        allowCounterproposal: true,
      });
    }

    // 4. T04: Choice Poll
    if (pollToolEnabled) {
      tools.push({
        id: "poll_t04",
        type: "poll",
        enabled: true,
        question: pollQuestion.trim() || "What sounds sweetest for our Halloween adventure?",
        description: "Vote for your favorite idea!",
        selectionMode: "both_vote",
        allowMultiple: false,
        allowCustomSuggestion: true,
        options: pollOptions.map((opt, i) => ({
          id: `opt_${i + 1}`,
          text: opt.trim(),
        })),
      });
    }

    // 5. T05: Heart-to-Heart Question
    if (questionToolEnabled) {
      tools.push({
        id: "question_t05",
        type: "question",
        enabled: true,
        title: "A Heartfelt Question For You",
        description: "Share your secret thoughts with me.",
        questions: [
          {
            id: "q_midnight_1",
            prompt: questionPrompt.trim() || "What was the exact moment you knew you had feelings for me?",
            type: "short",
            skippable: true,
            reveal_mode: "after_partner_answers",
          },
        ],
      });
    }

    // 6. T06: Synchronized Secret Reveal
    if (revealToolEnabled) {
      tools.push({
        id: "reveal_t06",
        type: "private_reveal",
        enabled: true,
        prompt: revealPrompt.trim() || "A secret confession that only unlocks when we both open it together...",
        description: "Locked surprise unlocked together.",
        countdownSeconds: 3,
      });
    }

    // 7. T07: Scratch-to-Reveal Card
    if (scratchToolEnabled) {
      tools.push({
        id: "scratch_t07",
        type: "scratch_reveal",
        enabled: true,
        coverTitle: scratchTitle.trim() || "A midnight surprise for you ✨",
        coverInstruction: "Scratch with your finger or mouse to reveal",
        contentType: "message",
        hiddenMessage: scratchSecret.trim() || "You will always be my favorite kind of magic. Happy Halloween!",
      });
    }

    // 8. T08: Sweet Love Coupon
    if (couponToolEnabled) {
      tools.push({
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title: couponTitle.trim() || "One Cozy Backrub & Warm Hot Chocolate",
        description: couponDesc.trim() || "Redeemable whenever you feel cold or need extra love.",
        enableScheduling: true,
      });
    }

    // 9. T09: Open When Letter
    if (openWhenEnabled) {
      tools.push({
        id: "open_when_t09",
        type: "open_when",
        enabled: true,
        title: "Open When Sealed Letter",
        description: "A letter for when you need a hug.",
        attachReply: true,
        envelopes: [
          {
            id: "env_midnight_1",
            occasion: openWhenOccasion.trim() || "Open when you feel cold or miss me",
            message: openWhenLetter.trim() || "Whenever the night feels too quiet, remember that my heart is always right beside you.",
          },
        ],
      });
    }

    // 10. T10: Our Story Memories
    if (ourStoryEnabled) {
      tools.push({
        id: "our_story_t10",
        type: "our_story",
        enabled: true,
        title: "Our Story Memories",
        description: "A journey through our favorite moments together.",
        cards: storyCards.map((c, i) => ({
          id: `card_${i + 1}`,
          photo_url: c.photo_url,
          caption: c.caption,
          order: i + 1,
        })),
      });
    }

    // 11. T11: Couple Bucket List
    if (bucketListEnabled) {
      tools.push({
        id: "bucket_list_t11",
        type: "bucket_list",
        enabled: true,
        title: "Mini Couple Bucket List",
        description: "Adventures and dreams we want to experience together.",
        items: bucketItems.map((item, i) => ({
          id: `b_${i + 1}`,
          title: item.trim(),
          status: "wished",
          created_by: "creator",
        })),
      });
    }

    // 12. Floating Photo & Quote Gallery
    if (floatingGalleryEnabled && galleryItems.length > 0) {
      tools.push({
        id: "floating_gallery",
        type: "floating_gallery",
        enabled: true,
        title: galleryTitle.trim() || "Our Midnight Memories & Whispers",
        subtitle: gallerySubtitle.trim() || "Hover over each memory to reveal the secret quote inside my heart ✨",
        items: galleryItems,
      } as unknown as TemplateTool);
    }

    return tools;
  };

  const handleCreateTemplate = async () => {
    if (!partnerName.trim() || !yourName.trim()) {
      setStep(0);
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      const toolsPayload = buildToolsPayload();

      const payload = {
        theme: "halloween-midnight-key",
        scene_index: 0,
        partner_name: partnerName.trim(),
        partner_from: yourName.trim(),
        message: personalMessage.trim() || MIDNIGHT_KEY_CONFIG.defaultMessage,
        sender_gender: "male" as const,
        music_track: selectedTrack ? { ...selectedTrack, startAt: trackStartAt } : null,
        has_media: false,
        media_items: [],
        expiry_hours: Math.max(1, Math.min(720, expiryHours <= 0 ? 168 : expiryHours)),
        tools: toolsPayload,
      };

      const res = await publishTemplate({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not create your template. Please try again.");
      }

      setGeneratedCode(data.short_code);
      setGeneratedUrl(data.url);
      setGeneratedManageUrl(data.manage_url);
      setStep(4);
    } catch (err: unknown) {
      setCreationError((err as Error).message || "An error occurred during template creation.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyManageLink = () => {
    if (generatedManageUrl) {
      navigator.clipboard.writeText(generatedManageUrl);
      setCopiedManage(true);
      setTimeout(() => setCopiedManage(false), 2000);
    }
  };

  return (
    <div
      className="min-h-screen text-[#FFE2BD] selection:bg-[#F3B574] selection:text-[#1A0F24]"
      style={{ backgroundColor: MIDNIGHT_KEY_PALETTE.background }}
    >
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-4 pt-6"><PurchaseDetails productSlug="halloween-midnight-key" /></div>

      <main id="main-content" className="max-w-4xl mx-auto scroll-mt-28 pt-5 pb-20 px-4 sm:px-6">
        {/* Hidden preview audio element for testing soundtracks */}
        <audio
          ref={previewAudioRef}
          onEnded={() => setPreviewTrackId(null)}
          onError={() => setPreviewTrackId(null)}
          style={{ display: "none" }}
        />

        {/* ─────────────────────────────────────────────
            HEADER & STEP INDICATOR
        ───────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1D1429] border border-[#4A3258] text-xs font-bold text-[#FFBC73] hover:bg-[#291D38] transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Templates</span>
          </Link>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FFBC73] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F3B574]" />
              <span>Original Disney-Inspired 3D Storybook Art</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-halloween text-white tracking-wide mt-1">
              Create &quot;The Midnight Key&quot;
            </h1>
            <p className="text-xs sm:text-sm text-[#D6BDC8] font-medium mt-1">
              {MIDNIGHT_KEY_CONFIG.tagline} • 6-scene storybook art with interactive RSVP
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[
              { num: 1, label: "Couple & Message" },
              { num: 2, label: "Tools Selection" },
              { num: 3, label: "Floating Gallery" },
              { num: 4, label: "Music & Expiry" },
              { num: 5, label: "Share Link" },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => idx < step && setStep(idx)}
                  disabled={idx > step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    step === idx
                      ? "bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] shadow-xs"
                      : idx < step
                      ? "bg-[#291D38] text-[#FFE2BD] cursor-pointer"
                      : "bg-[#1D1429]/60 text-[#AA91A5]/60"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                    {s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 4 && <span className="text-[#4A3258] text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            STEP 1: COUPLE & ROMANTIC MESSAGE
        ───────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Story Filmstrip Preview */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#FFE2BD] flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#F3B574]" />
                    <span>Included 6-Scene Story Flow</span>
                  </h3>
                  <p className="text-xs text-[#D6BDC8]">
                    Your partner will watch this 27.5-second Halloween adventure unfold.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#1A0F24] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73]">
                  Fixed 16:9 3D Art
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {MIDNIGHT_KEY_SCENES.map((scene) => (
                  <div key={scene.order} className="space-y-1">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#4A3258] bg-[#120D1C]">
                      <Image
                        src={scene.file}
                        alt={scene.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[#FFBC73] text-[9px] font-bold">
                        #{scene.order}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-[#FFE2BD] truncate">
                      {scene.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inputs Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFBC73] flex items-center gap-1.5">
                    <span>Partner&#39;s Name</span>
                    <span className="text-[#FFBC73]">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="E.g. Emily, Alex..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs font-semibold text-[#FFE2BD] placeholder:text-[#AA91A5] focus:outline-none focus:border-[#F3B574]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFBC73] flex items-center gap-1.5">
                    <span>Your Name</span>
                    <span className="text-[#FFBC73]">*</span>
                  </label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="E.g. Marsad, Jordan..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs font-semibold text-[#FFE2BD] placeholder:text-[#AA91A5] focus:outline-none focus:border-[#F3B574]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFBC73] flex items-center gap-1.5">
                  <span>Opening Tagline</span>
                  <span className="text-[11px] text-[#AA91A5] font-normal">(Shown in intro)</span>
                </label>
                <input
                  type="text"
                  value={openingTagline}
                  onChange={(e) => setOpeningTagline(e.target.value)}
                  placeholder="A little adventure, just for us."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs font-semibold text-[#FFE2BD] placeholder:text-[#AA91A5] focus:outline-none focus:border-[#F3B574]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFBC73] flex items-center gap-1.5">
                  <span>Romantic Message</span>
                  <span className="text-[11px] text-[#AA91A5] font-normal">
                    (Revealed during scene 5 as the glowing heart appears)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Write a sweet message for them..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] placeholder:text-[#AA91A5] leading-relaxed focus:outline-none focus:border-[#F3B574]"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-[#120D1C] border border-[#4A3258] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#FFBC73]">
                  <span>Live Preview: Scene 5 Note Overlay</span>
                  <span>Scene 5/6</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#1D1429] border border-[#F3B574]/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFBC73]">
                    <Heart className="w-3 h-3 fill-[#F3B574] text-[#F3B574]" />
                    <span>Note From {yourName || "You"}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#FFE2BD] leading-snug">
                    &ldquo;{personalMessage || MIDNIGHT_KEY_CONFIG.defaultMessage}&rdquo;
                  </p>
                </div>
              </div>

              {/* Navigation button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!partnerName.trim() || !yourName.trim()}
                  className="px-7 py-3 rounded-full text-[#1A0F24] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
                >
                  <span>Continue to Tools Selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 2: TOOLS SELECTION (ROW OF 3 TOOLS GRID)
        ───────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-2xl bg-[#1D1429] border border-[#4A3258] text-center space-y-1">
              <h3 className="text-base font-bold text-[#FFE2BD]">
                Select Interactive Tools for {partnerName}
              </h3>
              <p className="text-xs text-[#D6BDC8] max-w-lg mx-auto">
                Toggle whichever moments you want included. Everything is pre-configured with sweet defaults so you can launch instantly without stress.
              </p>
            </div>

            {/* Tools Grid: 3 in a row on desktop (lg:grid-cols-3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Voice & Photo Notes */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  replyToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        💌
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Core Feature
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replyToolEnabled}
                        onChange={(e) => setReplyToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      1. Voice &amp; Photo Notes
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      Lets {partnerName || "your partner"} record voice memos, send selfies, and react with Halloween emojis privately.
                    </p>
                  </div>

                  {replyToolEnabled && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[#342038] text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#FFE2BD] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowVoice}
                          onChange={(e) => setReplyAllowVoice(e.target.checked)}
                          className="accent-[#F3B574]"
                        />
                        <span>🎙️ Voice Notes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#FFE2BD] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowPhoto}
                          onChange={(e) => setReplyAllowPhoto(e.target.checked)}
                          className="accent-[#F3B574]"
                        />
                        <span>📸 Photo Uploads</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 2: Halloween Date & RSVP */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  dateToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        🎃
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Recommended
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dateToolEnabled}
                        onChange={(e) => setDateToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      2. Halloween Date &amp; RSVP
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      Invites {partnerName || "your partner"} to choose your next Halloween adventure &amp; time. Their RSVP arrives in your dashboard.
                    </p>
                  </div>

                  {dateToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div className="text-[11px] font-bold text-[#FFBC73]">
                        Proposed Time Slots:
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD]"
                          >
                            <span className="truncate">{slot.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(slot.id)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 shrink-0"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newSlotInput}
                          onChange={(e) => setNewSlotInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddSlot()}
                          placeholder="Add slot (e.g. Oct 31, 8:00 PM)..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="px-3 py-1.5 rounded-xl bg-[#F3B574] text-[#1A0F24] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 3: Date Venue & Format */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  locationToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        📍
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Meetup Venue
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locationToolEnabled}
                        onChange={(e) => setLocationToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      3. Date Venue &amp; Format
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      Set whether your date is in-person (haunted trail, cozy cafe) or online (FaceTime watch party) and the venue name.
                    </p>
                  </div>

                  {locationToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-1">
                          Date Format:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDateFormat("in_person")}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dateFormat === "in_person"
                                ? "bg-[#F3B574] text-[#1A0F24] shadow-2xs"
                                : "bg-[#120D1C] border border-[#4A3258] text-[#FFE2BD]"
                            }`}
                          >
                            🏡 In-Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setDateFormat("online")}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dateFormat === "online"
                                ? "bg-[#F3B574] text-[#1A0F24] shadow-2xs"
                                : "bg-[#120D1C] border border-[#4A3258] text-[#FFE2BD]"
                            }`}
                          >
                            💻 Online Date
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Venue or Meeting Spot:
                        </label>
                        <input
                          type="text"
                          value={dateLocation}
                          onChange={(e) => setDateLocation(e.target.value)}
                          placeholder="E.g. Under the Moonlit Trees..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 4: Vibe Check & Choice Poll */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  pollToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        📊
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Fun Choice
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollToolEnabled}
                        onChange={(e) => setPollToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      4. Vibe Check &amp; Poll
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      Set up a poll so {partnerName || "your partner"} can vote on midnight treats, mystery movies, or costume ideas.
                    </p>
                  </div>

                  {pollToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Poll Question:
                        </label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder="What sounds sweetest for Halloween?..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>

                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {pollOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD]"
                          >
                            <span className="truncate">{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 shrink-0"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={newPollOption}
                          onChange={(e) => setNewPollOption(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddPollOption()}
                          placeholder="Add choice..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="px-3 py-1.5 rounded-xl bg-[#F3B574] text-[#1A0F24] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 5: Heart-to-Heart Q&A */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  questionToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        💭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Romantic
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={questionToolEnabled}
                        onChange={(e) => setQuestionToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      5. Heart-to-Heart Q&amp;A
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      Ask a sweet question that {partnerName || "your partner"} answers before continuing through the story scenes.
                    </p>
                  </div>

                  {questionToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#342038]">
                      <label className="text-[11px] font-bold text-[#FFBC73] block">
                        Your Question:
                      </label>
                      <input
                        type="text"
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="What was the moment you fell for me?..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 6: Synchronized Secret Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  revealToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        🔒
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Mutual Lock
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revealToolEnabled}
                        onChange={(e) => setRevealToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      6. Synchronized Secret
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A locked confession or surprise note with a countdown that only unlocks when both of you open it together.
                    </p>
                  </div>

                  {revealToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#342038]">
                      <label className="text-[11px] font-bold text-[#FFBC73] block">
                        Confession / Secret Note:
                      </label>
                      <input
                        type="text"
                        value={revealPrompt}
                        onChange={(e) => setRevealPrompt(e.target.value)}
                        placeholder="A secret confession that unlocks together..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 7: Scratch Card Surprise */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  scratchToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        🪄
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Surprise
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scratchToolEnabled}
                        onChange={(e) => setScratchToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      7. Scratch Card Surprise
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A foil scratch card {partnerName || "your partner"} scratches off using their finger or mouse to uncover a hidden note.
                    </p>
                  </div>

                  {scratchToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Foil Cover Title:
                        </label>
                        <input
                          type="text"
                          value={scratchTitle}
                          onChange={(e) => setScratchTitle(e.target.value)}
                          placeholder="A midnight surprise for you ✨..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Hidden Secret Message:
                        </label>
                        <input
                          type="text"
                          value={scratchSecret}
                          onChange={(e) => setScratchSecret(e.target.value)}
                          placeholder="You are my favorite magic..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 8: Sweet Love Coupon */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  couponToolEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        🎟️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Love Voucher
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponToolEnabled}
                        onChange={(e) => setCouponToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      8. Sweet Love Coupon
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A cute redeemable voucher {partnerName || "your partner"} can claim anytime (e.g., massage, hot cocoa, hugs).
                    </p>
                  </div>

                  {couponToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Coupon Voucher Title:
                        </label>
                        <input
                          type="text"
                          value={couponTitle}
                          onChange={(e) => setCouponTitle(e.target.value)}
                          placeholder="E.g. One Cozy Backrub & Warm Cocoa..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Voucher Perk / Description:
                        </label>
                        <input
                          type="text"
                          value={couponDesc}
                          onChange={(e) => setCouponDesc(e.target.value)}
                          placeholder="Redeemable whenever you feel cold or need love..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 9: Open When Sealed Letter */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  openWhenEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        ✉️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Emotional
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openWhenEnabled}
                        onChange={(e) => setOpenWhenEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      9. Open When Letter
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A sealed digital envelope {partnerName || "your partner"} saves and opens whenever they feel lonely, miss you, or need love.
                    </p>
                  </div>

                  {openWhenEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          When to open:
                        </label>
                        <input
                          type="text"
                          value={openWhenOccasion}
                          onChange={(e) => setOpenWhenOccasion(e.target.value)}
                          placeholder="E.g. Open when you feel cold or miss me..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#FFBC73] block mb-0.5">
                          Letter content:
                        </label>
                        <textarea
                          rows={2}
                          value={openWhenLetter}
                          onChange={(e) => setOpenWhenLetter(e.target.value)}
                          placeholder="Whenever the night feels too quiet, remember my heart is always beside you..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] leading-relaxed focus:outline-none focus:border-[#F3B574]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 10: Our Story Memories */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  ourStoryEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        📖
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Story Timeline
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ourStoryEnabled}
                        onChange={(e) => setOurStoryEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      10. Our Story Memories
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A sweet chronological photo timeline of your relationship milestones and favorite moments together.
                    </p>
                  </div>

                  {ourStoryEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#342038]">
                      <div className="text-[11px] font-bold text-[#FFBC73]">
                        Illustrated Milestones Included:
                      </div>
                      <div className="space-y-1 text-xs text-[#D6BDC8]">
                        {storyCards.map((c, i) => (
                          <div
                            key={i}
                            className="px-2.5 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] truncate text-[11px] text-[#FFE2BD]"
                          >
                            #{i + 1} {c.caption}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 11: Couple Bucket List */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  bucketListEnabled
                    ? "bg-[#1D1429] border-[#F3B574] shadow-sm shadow-[#F3B574]/15"
                    : "bg-[#120D1C]/70 border-[#342038] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#342038] flex items-center justify-center text-lg shadow-2xs">
                        ✈️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#342038] text-[10px] font-bold text-[#FFBC73]">
                        Adventures
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bucketListEnabled}
                        onChange={(e) => setBucketListEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F3B574]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFE2BD]">
                      11. Couple Bucket List
                    </h4>
                    <p className="text-xs text-[#D6BDC8] mt-1 leading-snug">
                      A shared wishlist of future dream dates, cute adventures, and travel goals you want to tick off together.
                    </p>
                  </div>

                  {bucketListEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#342038]">
                      <div className="text-[11px] font-bold text-[#FFBC73]">
                        Dream Adventures:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bucketItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD]"
                          >
                            <span className="truncate">{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBucketItem(idx)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 shrink-0"
                              title="Delete adventure"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={newBucketItem}
                          onChange={(e) => setNewBucketItem(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddBucketItem()}
                          placeholder="Add adventure..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                        />
                        <button
                          type="button"
                          onClick={handleAddBucketItem}
                          className="px-3 py-1.5 rounded-xl bg-[#F3B574] text-[#1A0F24] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-5 py-2.5 rounded-full bg-[#1D1429] border border-[#4A3258] text-xs font-bold text-[#D6BDC8] hover:bg-[#291D38] cursor-pointer"
              >
                ← Back to Names
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-7 py-3 rounded-full text-[#1A0F24] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
              >
                <span>Continue to Floating Gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 3: FLOATING PHOTO & QUOTE GALLERY
        ───────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-sm space-y-6"
          >
            {/* Header + Master Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#342038]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#342038] text-[#FFBC73]">
                    Floating Mosaic Wall
                  </span>
                  <span className="text-xs text-[#D6BDC8] font-semibold">Hover Quotes • Zero-Gravity</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#FFE2BD] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F3B574]" />
                  <span>Floating Photo &amp; Quote Gallery</span>
                </h3>
                <p className="text-xs text-[#D6BDC8]">
                  Display an organic floating mosaic of your memories. When your partner hovers or taps each photo, a romantic Halloween quote will appear on top ✨
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-[#FFE2BD]">
                  {floatingGalleryEnabled ? "Enabled" : "Disabled"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={floatingGalleryEnabled}
                    onChange={(e) => setFloatingGalleryEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#342038] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F3B574]"></div>
                </label>
              </div>
            </div>

            {floatingGalleryEnabled && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#FFBC73]">
                      Gallery Title
                    </label>
                    <input
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="Our Midnight Memories & Whispers"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs font-semibold text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#FFBC73]">
                      Gallery Subtitle / Prompt
                    </label>
                    <input
                      type="text"
                      value={gallerySubtitle}
                      onChange={(e) => setGallerySubtitle(e.target.value)}
                      placeholder="Hover over each memory to reveal the secret quote inside my heart ✨"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#120D1C] border border-[#4A3258] text-xs font-semibold text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                    />
                  </div>
                </div>

                {/* Upload & Reset Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="px-4 py-2.5 rounded-2xl bg-[#342038] hover:bg-[#4A3258] border border-[#F3B574]/40 text-xs font-bold text-[#FFE2BD] flex items-center gap-2 cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-[#F3B574]" />
                    <span>{isUploadingPhoto ? "Uploading to Cloudinary..." : "Upload Your Own Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetDefaultGallery}
                    className="text-xs font-semibold text-[#FFBC73] hover:underline cursor-pointer"
                  >
                    Reset to 8 Default Couple Quotes
                  </button>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
                )}

                {/* Items Editor Grid */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#FFBC73]">
                    Gallery Items ({galleryItems.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {galleryItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#120D1C] border border-[#4A3258] flex gap-3 items-start"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-[#342038]">
                          <Image
                            src={item.url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#FFBC73]">
                              #{idx + 1} Aspect:
                            </span>
                            <div className="flex items-center gap-1">
                              <select
                                value={item.aspect || "tall"}
                                onChange={(e) =>
                                  handleUpdateItemAspect(
                                    item.id,
                                    e.target.value as "tall" | "wide" | "square" | "circle" | "badge"
                                  )
                                }
                                className="px-1.5 py-0.5 rounded bg-[#1D1429] border border-[#4A3258] text-[10px] text-[#FFE2BD]"
                              >
                                <option value="tall">Tall</option>
                                <option value="wide">Wide</option>
                                <option value="square">Square</option>
                                <option value="circle">Circle</option>
                                <option value="badge">Badge</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryItem(item.id)}
                                className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={item.quote}
                            onChange={(e) => handleUpdateItemQuote(item.id, e.target.value)}
                            placeholder="Romantic quote..."
                            className="w-full px-2 py-1 rounded-lg bg-[#1D1429] border border-[#4A3258] text-[11px] text-[#FFE2BD]"
                          />
                          <input
                            type="text"
                            value={item.author || ""}
                            onChange={(e) => handleUpdateItemAuthor(item.id, e.target.value)}
                            placeholder="Author/Caption..."
                            className="w-full px-2 py-1 rounded-lg bg-[#1D1429] border border-[#4A3258] text-[10px] text-[#D6BDC8]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="pt-4 border-t border-[#342038] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#FFE2BD] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F3B574]" />
                      <span>Live Interactive Floating Collage Wall Preview</span>
                    </span>
                    <span className="text-[11px] text-[#FFBC73] font-semibold">
                      Hover over any card below to see your quote reveal!
                    </span>
                  </div>

                  <div className="rounded-3xl border border-[#4A3258] bg-[#120D1C] p-4 overflow-hidden">
                    <FloatingQuoteGallery
                      title={galleryTitle}
                      subtitle={gallerySubtitle}
                      items={galleryItems}
                      accentColor={MIDNIGHT_KEY_PALETTE.accent}
                      theme="halloween"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#342038]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-[#120D1C] border border-[#4A3258] text-xs font-bold text-[#D6BDC8] hover:bg-[#291D38] cursor-pointer"
              >
                ← Back to Tools Selection
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-7 py-3 rounded-full text-[#1A0F24] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
              >
                <span>Continue to Music &amp; Expiry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 4: MUSIC & EXPIRY
        ───────────────────────────────────────────── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#4A3258] shadow-sm space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#FFE2BD]">
                Romantic Soundtrack &amp; Expiry
              </h3>
              <p className="text-xs text-[#D6BDC8]">
                Pick a gentle Halloween melody that plays when {partnerName} starts the adventure.
              </p>
            </div>

            {/* Selected Track Banner & Timestamp Picker */}
            {selectedTrack && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#120D1C] border-2 border-[#F3B574] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTrack.thumbnailUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-[#4A3258] shadow-2xs">
                        <Image
                          src={selectedTrack.thumbnailUrl}
                          alt={selectedTrack.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#291D38] flex items-center justify-center text-xl shrink-0 border border-[#4A3258]">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FFBC73] uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Active Soundtrack</span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#FFE2BD] truncate">
                        {selectedTrack.title}
                      </h4>
                      <p className="text-[11px] text-[#AA91A5] truncate">
                        {selectedTrack.artist} • {selectedTrack.type === "youtube" ? "YouTube Audio" : "Halloween Library"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSelectedPreview}
                      className="px-3.5 py-1.5 rounded-full bg-[#1D1429] text-[#FFBC73] text-xs font-bold border border-[#F3B574]/50 shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {previewTrackId === selectedTrack.id || (selectedTrack.type === "youtube" && isYtTesting) ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-[#FFBC73]" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#FFBC73]" />
                          <span>Test from {formatTime(trackStartAt)}</span>
                        </>
                      )}
                    </button>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                      ✓ Active
                    </span>
                  </div>
                </div>

                {/* YouTube Preview Frame (when testing) */}
                {selectedTrack.type === "youtube" && isYtTesting && selectedTrack.youtubeId && (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black/90 border border-[#4A3258] shadow-md relative">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${selectedTrack.youtubeId}?autoplay=1&start=${trackStartAt}&enablejsapi=1`}
                      className="w-full h-full border-0"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title="YouTube Preview"
                    />
                  </div>
                )}

                {/* Timestamp Controller Card */}
                <div className="p-4 rounded-2xl bg-[#1D1429] border border-[#4A3258] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#FFE2BD]">
                      <Clock className="w-3.5 h-3.5 text-[#F3B574]" />
                      <span>Start song playback from:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#342038] text-[#FFBC73] font-mono font-bold text-xs">
                        {formatTime(trackStartAt)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#AA91A5]">
                      Total length: {formatTime(selectedTrack.duration || 300)}
                    </span>
                  </div>

                  {/* Interactive Waveform Visualizer & Scrubber */}
                  {selectedTrack.waveform && selectedTrack.waveform.length > 0 && (
                    <div
                      className="relative h-12 rounded-xl bg-[#120D1C] border border-[#4A3258] overflow-hidden cursor-pointer select-none"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const newSec = Math.round(ratio * (selectedTrack.duration || 300));
                        handleStartAtChange(newSec);
                      }}
                      title="Click anywhere to jump timestamp"
                    >
                      <div className="absolute inset-0 flex items-end gap-[1px] px-2 py-1.5">
                        {selectedTrack.waveform.slice(0, 80).map((v, i, arr) => {
                          const ratio = i / arr.length;
                          const barSec = ratio * (selectedTrack.duration || 300);
                          const isPastStart = barSec >= trackStartAt;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-sm transition-colors duration-150"
                              style={{
                                height: `${Math.max(15, v)}%`,
                                backgroundColor: isPastStart ? "#F3B574" : "#4A3258",
                                opacity: isPastStart ? 0.9 : 0.45,
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Chosen Pin Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 pointer-events-none transition-all duration-75"
                        style={{
                          left: `${(trackStartAt / Math.max(1, selectedTrack.duration || 300)) * 100}%`,
                          backgroundColor: "#F3B574",
                          boxShadow: "0 0 8px rgba(243, 181, 116, 0.6)",
                        }}
                      >
                        <div className="absolute -top-1 -left-2 px-1.5 py-0.5 rounded-full bg-[#F3B574] text-[#1A0F24] text-[9px] font-bold shadow-xs whitespace-nowrap">
                          📍 {formatTime(trackStartAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Slider */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor(selectedTrack.duration || 300) - 2)}
                    value={trackStartAt}
                    onChange={(e) => handleStartAtChange(Number(e.target.value))}
                    className="w-full accent-[#F3B574] h-1.5 rounded-lg cursor-pointer bg-[#342038]"
                  />

                  {/* Exact MM:SS & Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#D6BDC8]">
                        Exact timestamp:
                      </span>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={Math.floor(trackStartAt / 60)}
                          onChange={(e) => {
                            const m = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const s = trackStartAt % 60;
                            handleStartAtChange(m * 60 + s);
                          }}
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#120D1C] border border-[#4A3258] font-bold text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                          placeholder="00"
                        />
                        <span className="font-bold text-[#F3B574]">:</span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={trackStartAt % 60}
                          onChange={(e) => {
                            const s = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                            const m = Math.floor(trackStartAt / 60);
                            handleStartAtChange(m * 60 + s);
                          }}
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#120D1C] border border-[#4A3258] font-bold text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                          placeholder="00"
                        />
                        <span className="text-[10px] text-[#AA91A5]">(mm:ss)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#AA91A5]">Presets:</span>
                      {[
                        { label: "0:00 (Start)", sec: 0 },
                        { label: "0:30", sec: 30 },
                        { label: "0:45 (Chorus)", sec: 45 },
                        { label: "1:00", sec: 60 },
                        { label: "1:30", sec: 90 },
                      ]
                        .filter((p) => p.sec < (selectedTrack.duration || 300))
                        .map((p) => (
                          <button
                            key={p.sec}
                            type="button"
                            onClick={() => handleStartAtChange(p.sec)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              trackStartAt === p.sec
                                ? "bg-[#F3B574] text-[#1A0F24] shadow-2xs"
                                : "bg-[#120D1C] text-[#D6BDC8] border border-[#4A3258] hover:bg-[#291D38]"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab switch: FreeTouse vs YouTube */}
            <div className="flex gap-2 p-1 bg-[#120D1C] rounded-2xl border border-[#4A3258] max-w-xs">
              <button
                type="button"
                onClick={() => setMusicTab("catalog")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  musicTab === "catalog"
                    ? "bg-[#F3B574] text-[#1A0F24] shadow-xs"
                    : "text-[#D6BDC8] hover:bg-[#1D1429]"
                }`}
              >
                🎵 Halloween Library
              </button>
              <button
                type="button"
                onClick={() => setMusicTab("youtube")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  musicTab === "youtube"
                    ? "bg-[#F3B574] text-[#1A0F24] shadow-xs"
                    : "text-[#D6BDC8] hover:bg-[#1D1429]"
                }`}
              >
                🎬 YouTube Audio
              </button>
            </div>

            {/* Tab Content: Curated Tracks */}
            {musicTab === "catalog" && (
              <div className="space-y-4">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {HALLOWEEN_MUSIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        void fetchMusic(cat.query);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] shadow-xs"
                          : "bg-[#120D1C] border border-[#4A3258] text-[#D6BDC8] hover:bg-[#291D38]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Keyword Search */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={musicSearchQuery}
                    onChange={(e) => setMusicSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void fetchMusic(musicSearchQuery)}
                    placeholder="Search tracks by keyword (e.g. ambient, acoustic, sweet, piano, lofi)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-[#120D1C] border border-[#4A3258] text-xs text-[#FFE2BD] placeholder:text-[#AA91A5]/60 focus:outline-none focus:border-[#F3B574]"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchMusic(musicSearchQuery)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Loading indicator */}
                {loadingMusic ? (
                  <div className="p-8 text-center text-xs font-bold text-[#FFBC73] animate-pulse flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#F3B574] border-t-transparent animate-spin" />
                    <span>Finding ambient soundtracks...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {tracks.map((t) => {
                      const isSelected = selectedTrack?.id === t.id;
                      const isThisPreviewing = previewTrackId === t.id;
                      const artist = t.artists?.[0]?.[1]?.name || artistName(t) || "Artist";
                      const thumb = t.thumbnails?.sm || t.thumbnails?.md;

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-[#291D38] border-[#F3B574] shadow-md shadow-[#F3B574]/20"
                              : "bg-[#120D1C] border-[#4A3258] hover:border-[#75536D]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {thumb ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-[#4A3258]">
                                <Image
                                  src={thumb}
                                  alt={t.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePreviewMusic(t)}
                                className="w-10 h-10 rounded-xl bg-[#342038] hover:bg-[#4A3258] flex items-center justify-center text-[#F3B574] shrink-0 transition-colors cursor-pointer"
                                title={isThisPreviewing ? "Pause" : "Play preview"}
                              >
                                {isThisPreviewing ? (
                                  <Pause className="w-4 h-4 fill-[#F3B574]" />
                                ) : (
                                  <Play className="w-4 h-4 fill-[#F3B574]" />
                                )}
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#FFE2BD] truncate">{t.title}</p>
                              <p className="text-[11px] text-[#AA91A5] truncate">
                                {artist} • {formatTime(t.duration)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePreviewMusic(t)}
                              className="w-7 h-7 rounded-full bg-[#1D1429] hover:bg-[#342038] shadow-2xs flex items-center justify-center text-[#FFBC73] hover:scale-105 transition-transform border border-[#4A3258]"
                              title={isThisPreviewing ? "Stop preview" : "Listen"}
                            >
                              {isThisPreviewing ? <Pause className="w-3 h-3 fill-[#FFBC73]" /> : <Play className="w-3 h-3 fill-[#FFBC73]" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectTrack(t)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                isSelected
                                  ? "bg-[#F3B574] text-[#1A0F24] shadow-xs"
                                  : "bg-[#1D1429] border border-[#4A3258] text-[#FFE2BD] hover:bg-[#342038]"
                              }`}
                            >
                              {isSelected ? "Selected ✓" : "Select"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: YouTube Custom Audio */}
            {musicTab === "youtube" && (
              <div className="space-y-3 p-4 rounded-2xl bg-[#120D1C] border border-[#4A3258]">
                <label className="text-xs font-bold text-[#FFBC73] block">
                  YouTube Song or Lofi Video Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyYoutube()}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-2 rounded-xl bg-[#1D1429] border border-[#4A3258] text-xs text-[#FFE2BD] focus:outline-none focus:border-[#F3B574]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyYoutube}
                    disabled={youtubeLoading || !youtubeUrl.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] font-bold text-xs disabled:opacity-40 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs shrink-0"
                  >
                    {youtubeLoading ? "Verifying..." : "Attach Track"}
                  </button>
                </div>
                {youtubeError && (
                  <p className="text-xs text-rose-400 font-semibold">{youtubeError}</p>
                )}
                <p className="text-[11px] text-[#AA91A5]">
                  Paste any YouTube music link. Audio will play automatically in the background when your partner opens the adventure!
                </p>
              </div>
            )}

            <PurchaseDetails productSlug="halloween-midnight-key" />

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#342038]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-full bg-[#120D1C] border border-[#4A3258] text-xs font-bold text-[#D6BDC8] hover:bg-[#291D38] cursor-pointer"
              >
                ← Back to Gallery
              </button>

              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-8 py-3 rounded-full text-[#1A0F24] font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#F3B574] to-[#FFBC73]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isCreating ? "Forging Your Midnight Key..." : "Create Midnight Key Story ✨"}</span>
              </button>
            </div>

            {creationError && (
              <p className="text-xs text-rose-400 font-semibold text-center">{creationError}</p>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 5: SHARE LINK & COMPLETION
        ───────────────────────────────────────────── */}
        {step === 4 && generatedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#1D1429] border border-[#F3B574]/40 shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#342038] border border-[#F3B574] flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(243,181,116,0.3)]">
              🗝️
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFBC73]">
                Your Adventure is Ready
              </span>
              <h2 className="text-2xl sm:text-4xl font-halloween text-[#FFE2BD]">
                &quot;The Midnight Key&quot; is Live!
              </h2>
              <p className="text-xs text-[#D6BDC8]">
                Send this private secret link to {partnerName}. When they open it, their Halloween storybook adventure begins.
              </p>
            </div>

            {/* Short Code & Link Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#120D1C] border border-[#4A3258] space-y-3 max-w-lg mx-auto text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#FFBC73]">Shareable Adventure Link:</span>
                <span className="font-mono text-[11px] text-[#AA91A5]">Code: {generatedCode}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#1D1429] border border-[#4A3258] text-xs font-mono text-[#FFE2BD] truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95 transition-all"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={generatedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#F3B574] to-[#FFBC73] text-[#1A0F24] font-bold text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open &amp; Test Story</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `I created a Halloween adventure just for us: ${generatedUrl} 🗝️🎃`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#120D1C] border border-[#4A3258] text-xs font-bold text-[#FFE2BD] hover:bg-[#291D38] flex items-center gap-2 transition-all"
              >
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `A Halloween midnight adventure, just for us 🗝️✨ ${generatedUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#120D1C] border border-[#4A3258] text-xs font-bold text-[#FFE2BD] hover:bg-[#291D38] flex items-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[#F3B574]" />
                <span>Share on X</span>
              </a>
            </div>

            {/* Manage Link Card */}
            {generatedManageUrl && (
              <div className="p-4 rounded-2xl bg-[#120D1C] border border-[#4A3258] max-w-lg mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FFBC73]">Your Secret Creator Management Link:</span>
                  <span className="text-[10px] text-[#AA91A5]">Private to you</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedManageUrl}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#1D1429] border border-[#4A3258] text-[11px] font-mono text-[#D6BDC8] truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyManageLink}
                    className="px-3 py-1.5 rounded-xl bg-[#342038] hover:bg-[#4A3258] text-xs font-bold text-[#FFE2BD] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedManage ? <Check className="w-3 h-3 text-[#F3B574]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedManage ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#AA91A5]">
                  Save this URL to view responses, RSVPs, voice memos, and photo replies from {partnerName}.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
