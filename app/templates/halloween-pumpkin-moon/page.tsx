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
  Flame,
  Moon,
} from "lucide-react";
import {
  PUMPKIN_MOON_SCENES,
  PUMPKIN_MOON_CONFIG,
  PUMPKIN_MOON_PALETTE,
  DEFAULT_PUMPKIN_MOON_GALLERY_ITEMS,
} from "@/lib/constants/pumpkinMoonTemplate";
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

export default function PumpkinMoonStudio() {
  const [step, setStep] = useState(0); // 0 = Names & Story, 1 = Tools Selection, 2 = Floating Gallery, 3 = Music & Expiry, 4 = Share

  // Step 1: Couple & Message
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [openingTagline, setOpeningTagline] = useState(PUMPKIN_MOON_CONFIG.defaultOpening);
  const [personalMessage, setPersonalMessage] = useState(PUMPKIN_MOON_CONFIG.defaultMessage);

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
    { id: "slot_1", start_time: "Halloween Evening, 7:00 PM", label: "Halloween Evening (7:00 PM)" },
    { id: "slot_2", start_time: "Moonlit Picnic, 9:30 PM", label: "Moonlit Picnic (9:30 PM)" },
  ]);
  const [newSlotInput, setNewSlotInput] = useState("");

  // 3. T03 Date Location & Venue Map
  const [locationToolEnabled, setLocationToolEnabled] = useState(false);
  const [dateFormat, setDateFormat] = useState<"in_person" | "online">("in_person");
  const [dateLocation, setDateLocation] = useState("Under the Harvest Moon Porch");

  // 4. T04 Vibe Check & Choice Polls
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("What sounds sweetest for our Halloween date?");
  const [pollOptions, setPollOptions] = useState([
    "Carving Jack-o'-Lanterns & Spiced Cider",
    "Spooky Movie Marathon Under Warm Blankets",
    "Moonlit Walk & Roasted Pumpkin Treats",
  ]);
  const [newPollOption, setNewPollOption] = useState("");

  // 5. T05 Heart-to-Heart Question Prompt
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState("What is your favorite memory of us in the autumn?");

  // 6. T06 Synchronized Secret Reveal
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealPrompt, setRevealPrompt] = useState("A sweet secret confession waiting to be unlocked by both of us...");

  // 7. T07 Scratch-to-Reveal Card
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchTitle, setScratchTitle] = useState("A little Halloween surprise for you 🎃");
  const [scratchSecret, setScratchSecret] = useState("You will always be my favorite pumpkin in the patch. Happy Halloween, my love!");

  // 8. T08 Sweet Love Coupon Voucher
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState("One Cozy Blanket Hug & Pumpkin Spice Treat");
  const [couponDesc, setCouponDesc] = useState("Redeemable whenever you need warmth, sweet treats, or extra cuddles.");

  // 9. T09 Open When Sealed Letter
  const [openWhenEnabled, setOpenWhenEnabled] = useState(false);
  const [openWhenOccasion, setOpenWhenOccasion] = useState("Open when autumn nights feel a little chilly");
  const [openWhenLetter, setOpenWhenLetter] = useState("No matter how dark or chilly the autumn night gets, you will always be the warmest glow in my heart.");

  // 10. T10 Our Story Timeline Memories
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [storyCards] = useState([
    { photo_url: "/templates/halloween-pumpkin-moon/01-the-halloween-meeting.png", caption: "Meeting outside our glowing autumn cottage." },
    { photo_url: "/templates/halloween-pumpkin-moon/02-picking-our-pumpkins.png", caption: "Picking our two favorite pumpkins in the patch." },
    { photo_url: "/templates/halloween-pumpkin-moon/03-lanterns-we-made.png", caption: "Carving glowing jack-o'-lanterns side by side." },
  ]);

  // 11. T11 Couple Bucket List
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketItems, setBucketItems] = useState([
    "Carve glowing jack-o'-lanterns together",
    "Share warm spiced apple cider under the moon",
    "Binge cute Halloween movies under a huge fuzzy blanket",
  ]);
  const [newBucketItem, setNewBucketItem] = useState("");

  // Floating Photo & Quote Gallery State
  const [floatingGalleryEnabled, setFloatingGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("Our Pumpkin Moon Memories & Whispers");
  const [gallerySubtitle, setGallerySubtitle] = useState("Hover over each memory to reveal the sweet quote inside my heart 🎃");
  const [galleryItems, setGalleryItems] = useState<FloatingGalleryItem[]>(DEFAULT_PUMPKIN_MOON_GALLERY_ITEMS);
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
      setYoutubeError((err as Error).message || "Invalid YouTube link. Please check and try again.");
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

  // Floating Photo Gallery Handlers (Cloudinary Upload)
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
        quote: "You will always be my favorite pumpkin in the patch.",
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
    setGalleryItems(DEFAULT_PUMPKIN_MOON_GALLERY_ITEMS);
  };

  const buildToolsPayload = (): TemplateTool[] => {
    const tools: TemplateTool[] = [];

    // 1. T01: Reply Tool
    if (replyToolEnabled) {
      tools.push({
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: "Leave a cozy note or Halloween response for me...",
        enabledFormats: {
          text: true,
          photo: replyAllowPhoto,
          voice: replyAllowVoice,
        },
        maxChars: 2000,
        maxPhotos: 3,
        maxVoiceSeconds: 60,
        allowMultiple: true,
        quickReactions: ["🎃", "🌙", "✨", "🍂", "🧡"],
      });
    }

    // 2 & 3. T02 & T03: Date Invitation & Location
    if (dateToolEnabled) {
      tools.push({
        id: "invitation_t02",
        type: "invitation",
        enabled: true,
        activity: "Our Pumpkin Moon Date",
        invitationMessage: PUMPKIN_MOON_CONFIG.finalQuestion,
        format: locationToolEnabled ? dateFormat : "in_person",
        location: locationToolEnabled ? dateLocation.trim() || "Under the Harvest Moon Porch" : undefined,
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
        question: pollQuestion.trim() || "What sounds sweetest for our Halloween date?",
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
        title: "A Heartfelt Autumn Question For You",
        description: "Share your secret thoughts with me.",
        questions: [
          {
            id: "q_pumpkin_1",
            prompt: questionPrompt.trim() || "What is your favorite memory of us in the autumn?",
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
        prompt: revealPrompt.trim() || "A sweet secret confession waiting to be unlocked by both of us...",
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
        coverTitle: scratchTitle.trim() || "A little Halloween surprise for you 🎃",
        coverInstruction: "Scratch with your finger or mouse to reveal",
        contentType: "message",
        hiddenMessage: scratchSecret.trim() || "You will always be my favorite pumpkin in the patch. Happy Halloween, my love!",
      });
    }

    // 8. T08: Sweet Love Coupon
    if (couponToolEnabled) {
      tools.push({
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title: couponTitle.trim() || "One Cozy Blanket Hug & Pumpkin Spice Treat",
        description: couponDesc.trim() || "Redeemable whenever you need warmth, sweet treats, or extra cuddles.",
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
        description: "A letter for when you need extra warmth.",
        attachReply: true,
        envelopes: [
          {
            id: "env_pumpkin_1",
            occasion: openWhenOccasion.trim() || "Open when autumn nights feel a little chilly",
            message: openWhenLetter.trim() || "No matter how dark or chilly the autumn night gets, you will always be the warmest glow in my heart.",
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
        title: "Our Autumn Chapter",
        description: "The little moments that make us smile",
        cards: storyCards.map((c, i) => ({
          id: `card_${i + 1}`,
          photo_url: c.photo_url,
          caption: c.caption,
          order: i + 1,
        })),
      });
    }

    // 11. T11: Bucket List
    if (bucketListEnabled) {
      tools.push({
        id: "bucket_list_t11",
        type: "bucket_list",
        enabled: true,
        title: "Our Autumn Bucket List",
        description: "Adventures we will share together this season",
        items: bucketItems.map((text, idx) => ({
          id: `item_${idx + 1}`,
          title: text.trim(),
          status: "wished",
          created_by: "creator",
        })),
      });
    }

    // 12. Floating Quote Gallery
    if (floatingGalleryEnabled && galleryItems.length > 0) {
      tools.push({
        id: "floating_gallery",
        type: "floating_gallery",
        enabled: true,
        title: galleryTitle.trim() || "Our Pumpkin Moon Memories & Whispers",
        subtitle: gallerySubtitle.trim() || "Hover over each memory to reveal the sweet quote inside my heart 🎃",
        items: galleryItems,
      } as unknown as TemplateTool);
    }

    return tools;
  };

  const handleCreateTemplate = async () => {
    if (!partnerName.trim() || !yourName.trim()) {
      alert("Please fill in both your partner's name and your name.");
      setStep(0);
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      const toolsPayload = buildToolsPayload();

      const payload = {
        theme: "halloween-pumpkin-moon",
        scene_index: 0,
        partner_name: partnerName.trim(),
        partner_from: yourName.trim(),
        message: personalMessage.trim() || PUMPKIN_MOON_CONFIG.defaultMessage,
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
        throw new Error(data?.error || "Failed to create template. Please check your fields and try again.");
      }

      setGeneratedCode(data.short_code);
      setGeneratedUrl(data.url);
      if (data.manage_url) {
        setGeneratedManageUrl(data.manage_url);
      }
      setStep(4);
    } catch (err: unknown) {
      console.error("Template creation error:", err);
      setCreationError((err as Error).message || "An unexpected error occurred. Please try again.");
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
      className="min-h-screen text-[#FFF3E3] selection:bg-[#FF7518] selection:text-[#0F0A06]"
      style={{ backgroundColor: PUMPKIN_MOON_PALETTE.background }}
    >
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-4 pt-6"><PurchaseDetails productSlug="halloween-pumpkin-moon" /></div>

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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1C1109] border border-[#542D14] text-xs font-bold text-[#FFD166] hover:bg-[#2A180C] transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Templates</span>
          </Link>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FFD166] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7518]" />
              <span>Original Disney-Inspired 3D Storybook Art</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-halloween text-white tracking-wide mt-1 drop-shadow-[0_4px_25px_rgba(255,117,24,0.4)]">
              Create &quot;Pumpkin Moon Date&quot;
            </h1>
            <p className="text-xs sm:text-sm text-[#C49A76] font-medium mt-1">
              {PUMPKIN_MOON_CONFIG.tagline} • 6-scene storybook art with interactive RSVP
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
            ].map((s, idx) => {
              const isCurrent = step === idx;
              const isCompleted = step > idx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (step === 4) return;
                    setStep(idx);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] shadow-sm shadow-[#FF7518]/30"
                      : isCompleted
                      ? "bg-[#2A180C] text-[#FFD166] border border-[#542D14]"
                      : "bg-[#1C1109] text-[#C49A76] border border-[#542D14]/60 hover:bg-[#2A180C]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/20">
                    {isCompleted ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            STEP 1: COUPLE & MESSAGE
        ───────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* 6-Scene Cinematic Preview Strip */}
            <div className="p-4 sm:p-6 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#FFF3E3] flex items-center gap-2">
                    <span className="text-lg">🎃</span>
                    <span>The 6 Storybook Scenes</span>
                  </h3>
                  <p className="text-[11px] text-[#C49A76]">
                    Native 16:9 3D illustrations that play continuously with crossfades
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#2A180C] border border-[#542D14] text-[10px] font-bold text-[#FFD166]">
                  27.5s Playback
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                {PUMPKIN_MOON_SCENES.map((scene) => (
                  <div
                    key={scene.file}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-[#542D14] bg-[#0F0A06] shadow-xs"
                  >
                    <Image
                      src={scene.file}
                      alt={scene.title}
                      fill
                      sizes="160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-bold text-[#FFF3E3] truncate drop-shadow-sm">
                      {scene.order}. {scene.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFD166] flex items-center gap-1.5">
                    <span>Partner&#39;s Name / Nickname</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="E.g., Luna, My Witch, Sarah..."
                    className="w-full px-4 py-3 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-sm font-semibold text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518] transition-colors"
                  />
                  <p className="text-[10px] text-[#C49A76]">
                    Appears in the cinematic title card and final question
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFD166] flex items-center gap-1.5">
                    <span>Your Name / Nickname</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="E.g., Leo, Your Vampire, Alex..."
                    className="w-full px-4 py-3 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-sm font-semibold text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518] transition-colors"
                  />
                  <p className="text-[10px] text-[#C49A76]">
                    Shown as the story creator and receiver of responses
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFD166]">
                  Opening Tagline
                </label>
                <input
                  type="text"
                  value={openingTagline}
                  onChange={(e) => setOpeningTagline(e.target.value)}
                  placeholder="A little Halloween magic, just for you."
                  className="w-full px-4 py-3 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-sm font-semibold text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFD166] flex items-center justify-between">
                  <span>Secret Autumn Note (Revealed in Scene 5)</span>
                  <span className="text-[10px] text-[#C49A76]">
                    Appears alongside the moonlit invitation
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Of all the little surprises this season, sharing it with you is my favorite."
                  className="w-full px-4 py-3 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-sm text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518] transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!partnerName.trim() || !yourName.trim()) {
                      alert("Please fill in both your partner's name and your name.");
                      return;
                    }
                    setStep(1);
                  }}
                  className="px-7 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
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
            <div className="p-5 rounded-2xl bg-[#1C1109] border border-[#542D14] text-center space-y-1">
              <h3 className="text-base font-bold text-[#FFF3E3]">
                Select Interactive Tools for {partnerName}
              </h3>
              <p className="text-xs text-[#C49A76] max-w-lg mx-auto">
                Toggle whichever moments you want included. Everything is pre-configured with sweet defaults so you can launch instantly without stress.
              </p>
            </div>

            {/* Tools Grid: 3 in a row on desktop (lg:grid-cols-3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Voice & Photo Notes */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  replyToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        💌
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
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
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Voice &amp; Photo Notes
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Partner can record sweet voice memos, upload selfies, and tap Halloween reactions.
                    </p>
                  </div>

                  {replyToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-1.5 text-xs text-[#FFF3E3]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replyAllowVoice}
                          onChange={(e) => setReplyAllowVoice(e.target.checked)}
                          className="rounded text-[#FF7518] focus:ring-[#FF7518]"
                        />
                        <span>Allow 60s Voice Memos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replyAllowPhoto}
                          onChange={(e) => setReplyAllowPhoto(e.target.checked)}
                          className="rounded text-[#FF7518] focus:ring-[#FF7518]"
                        />
                        <span>Allow Photo Attachments</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 2: Date Invitation & RSVP */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  dateToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        🎃
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Final Question
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dateToolEnabled}
                        onChange={(e) => setDateToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Date Invitation &amp; RSVP
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      &quot;Will you be my Halloween date?&quot; with proposed times &amp; 3 choices.
                    </p>
                  </div>

                  {dateToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#FFD166] block">
                          Proposed Time Slots ({dateSlots.length}):
                        </span>
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[#0F0A06] text-[#FFF3E3]"
                          >
                            <span className="truncate">{slot.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(slot.id)}
                              className="text-rose-400 hover:text-rose-300 ml-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newSlotInput}
                          onChange={(e) => setNewSlotInput(e.target.value)}
                          placeholder="E.g., Oct 31, 8:00 PM"
                          className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#2A180C] text-[#FFD166] font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 3: Location & Format */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  locationToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        📍
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Venue Details
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locationToolEnabled}
                        onChange={(e) => setLocationToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Venue / Rendezvous
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Specify an in-person autumn spot or cozy remote Discord/FaceTime call.
                    </p>
                  </div>

                  {locationToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-2">
                      <div className="flex gap-2 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="format"
                            checked={dateFormat === "in_person"}
                            onChange={() => setDateFormat("in_person")}
                            className="text-[#FF7518]"
                          />
                          <span>In-Person</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="format"
                            checked={dateFormat === "online"}
                            onChange={() => setDateFormat("online")}
                            className="text-[#FF7518]"
                          />
                          <span>Online Call</span>
                        </label>
                      </div>

                      <input
                        type="text"
                        value={dateLocation}
                        onChange={(e) => setDateLocation(e.target.value)}
                        placeholder="Under the Harvest Moon Porch"
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 4: Choice Poll */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  pollToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        📊
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Voting
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollToolEnabled}
                        onChange={(e) => setPollToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Choice Poll
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Vote together on activities, pumpkin snacks, or movie choices.
                    </p>
                  </div>

                  {pollToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-2">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Poll question..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                      <div className="space-y-1">
                        {pollOptions.map((opt, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] p-1 rounded bg-[#0F0A06] text-[#FFF3E3]"
                          >
                            <span className="truncate">{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(i)}
                              className="text-rose-400 ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newPollOption}
                          onChange={(e) => setNewPollOption(e.target.value)}
                          placeholder="New option..."
                          className="w-full px-2 py-0.5 text-xs rounded bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="px-2 py-0.5 text-xs rounded bg-[#2A180C] text-[#FFD166] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 5: Heart-to-Heart Question */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  questionToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        💬
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Intimacy
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={questionToolEnabled}
                        onChange={(e) => setQuestionToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Heartfelt Question
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      A deep prompt to discover your partner&#39;s sweetest thoughts.
                    </p>
                  </div>

                  {questionToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C]">
                      <textarea
                        rows={2}
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="What is your favorite memory of us in the autumn?"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 6: Synchronized Secret Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  revealToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        🔒
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Dual Unlock
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revealToolEnabled}
                        onChange={(e) => setRevealToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Synchronized Reveal
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      A locked secret that unlocks simultaneously when you both tap.
                    </p>
                  </div>

                  {revealToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C]">
                      <textarea
                        rows={2}
                        value={revealPrompt}
                        onChange={(e) => setRevealPrompt(e.target.value)}
                        placeholder="Secret prompt..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 7: Scratch-to-Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  scratchToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        ✨
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Playful
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scratchToolEnabled}
                        onChange={(e) => setScratchToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Scratch-to-Reveal
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Partner rubs their screen to scratch away metallic foil and find your note.
                    </p>
                  </div>

                  {scratchToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-1.5">
                      <input
                        type="text"
                        value={scratchTitle}
                        onChange={(e) => setScratchTitle(e.target.value)}
                        placeholder="Cover title..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={scratchSecret}
                        onChange={(e) => setScratchSecret(e.target.value)}
                        placeholder="Secret message beneath foil..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 8: Love Coupon */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  couponToolEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        🎟️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Sweet Perk
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponToolEnabled}
                        onChange={(e) => setCouponToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Love Coupon
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      A digital coupon redeemable whenever they want cuddles or treats.
                    </p>
                  </div>

                  {couponToolEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-1.5">
                      <input
                        type="text"
                        value={couponTitle}
                        onChange={(e) => setCouponTitle(e.target.value)}
                        placeholder="Coupon perk..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={couponDesc}
                        onChange={(e) => setCouponDesc(e.target.value)}
                        placeholder="Description..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 9: Open When Letter */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  openWhenEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        ✉️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Comfort
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openWhenEnabled}
                        onChange={(e) => setOpenWhenEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Open When Letter
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      A virtual sealed envelope to open when autumn nights feel cold.
                    </p>
                  </div>

                  {openWhenEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-1.5">
                      <input
                        type="text"
                        value={openWhenOccasion}
                        onChange={(e) => setOpenWhenOccasion(e.target.value)}
                        placeholder="Open when..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={openWhenLetter}
                        onChange={(e) => setOpenWhenLetter(e.target.value)}
                        placeholder="Letter contents..."
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3] focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 10: Our Story Memories */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  ourStoryEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        📖
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Timeline
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ourStoryEnabled}
                        onChange={(e) => setOurStoryEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Our Story Timeline
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Showcases your milestones with story cards and romantic captions.
                    </p>
                  </div>

                  {ourStoryEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] text-xs text-[#C49A76]">
                      <span>3 illustrated story cards active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 11: Couple Bucket List */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  bucketListEnabled
                    ? "bg-[#1C1109] border-[#FF7518] shadow-sm shadow-[#FF7518]/15"
                    : "bg-[#0F0A06]/70 border-[#2A180C] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#2A180C] flex items-center justify-center text-lg shadow-2xs">
                        🎯
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#2A180C] text-[10px] font-bold text-[#FFD166]">
                        Future Plans
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bucketListEnabled}
                        onChange={(e) => setBucketListEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF7518]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#FFF3E3]">
                      Autumn Bucket List
                    </h4>
                    <p className="text-[11px] text-[#C49A76] mt-0.5">
                      Checklist of romantic autumn goals you can check off together.
                    </p>
                  </div>

                  {bucketListEnabled && (
                    <div className="pt-2 border-t border-[#2A180C] space-y-1.5">
                      <div className="space-y-1">
                        {bucketItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] p-1 rounded bg-[#0F0A06] text-[#FFF3E3]"
                          >
                            <span className="truncate">{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBucketItem(i)}
                              className="text-rose-400 ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newBucketItem}
                          onChange={(e) => setNewBucketItem(e.target.value)}
                          placeholder="New goal..."
                          className="w-full px-2 py-0.5 text-xs rounded bg-[#0F0A06] border border-[#542D14] text-[#FFF3E3]"
                        />
                        <button
                          type="button"
                          onClick={handleAddBucketItem}
                          className="px-2 py-0.5 text-xs rounded bg-[#2A180C] text-[#FFD166] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-6 py-2.5 rounded-full bg-[#1C1109] border border-[#542D14] text-xs font-bold text-[#FFF3E3] hover:bg-[#2A180C] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-7 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
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
            className="space-y-6"
          >
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-[#2A180C]">
                <div>
                  <h3 className="text-base font-bold text-[#FFF3E3] flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <span>Floating Photo &amp; Quote Gallery</span>
                  </h3>
                  <p className="text-xs text-[#C49A76] mt-0.5">
                    An organic zero-gravity mosaic wall. Each memory reveals a romantic quote on hover.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={floatingGalleryEnabled}
                    onChange={(e) => setFloatingGalleryEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2A180C] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF7518]"></div>
                </label>
              </div>

              {floatingGalleryEnabled && (
                <div className="space-y-6">
                  {/* Titles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#FFD166]">
                        Gallery Section Title
                      </label>
                      <input
                        type="text"
                        value={galleryTitle}
                        onChange={(e) => setGalleryTitle(e.target.value)}
                        placeholder="Our Pumpkin Moon Memories & Whispers"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-xs font-semibold text-[#FFF3E3] focus:outline-none focus:border-[#FF7518]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#FFD166]">
                        Gallery Subtitle / Prompt
                      </label>
                      <input
                        type="text"
                        value={gallerySubtitle}
                        onChange={(e) => setGallerySubtitle(e.target.value)}
                        placeholder="Hover over each memory to reveal the sweet quote inside my heart 🎃"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#0F0A06] border border-[#542D14] text-xs font-semibold text-[#FFF3E3] focus:outline-none focus:border-[#FF7518]"
                      />
                    </div>
                  </div>

                  {/* Upload & Reset Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="px-4 py-2.5 rounded-2xl bg-[#2A180C] hover:bg-[#542D14] border border-[#FF7518]/50 text-xs font-bold text-[#FFF3E3] flex items-center gap-2 cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#FF7518]" />
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
                      className="text-xs font-semibold text-[#FFD166] hover:underline cursor-pointer"
                    >
                      Reset to 8 Default Couple Quotes
                    </button>
                  </div>

                  {uploadError && (
                    <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
                  )}

                  {/* Items Editor Grid */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-[#FFD166]">
                      Gallery Items ({galleryItems.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                      {galleryItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-[#0F0A06] border border-[#542D14] flex gap-3 items-start"
                        >
                          <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-[#2A180C]">
                            <Image
                              src={item.url}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[#FFD166]">
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
                                  className="px-1.5 py-0.5 rounded bg-[#1C1109] border border-[#542D14] text-[10px] text-[#FFF3E3]"
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
                              placeholder="Hover quote..."
                              className="w-full px-2 py-1 text-xs rounded bg-[#1C1109] border border-[#542D14] text-[#FFF3E3] focus:outline-none"
                            />

                            <input
                              type="text"
                              value={item.author || ""}
                              onChange={(e) => handleUpdateItemAuthor(item.id, e.target.value)}
                              placeholder="Caption / tag..."
                              className="w-full px-2 py-0.5 text-[10px] rounded bg-[#1C1109] border border-[#542D14] text-[#C49A76] focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Mini Preview of Floating Gallery */}
                  <div className="pt-4 border-t border-[#2A180C] space-y-2">
                    <span className="text-xs font-bold text-[#FFD166] block">
                      Live Gallery Preview:
                    </span>
                    <FloatingQuoteGallery
                      items={galleryItems}
                      title={galleryTitle}
                      subtitle={gallerySubtitle}
                      accentColor={PUMPKIN_MOON_PALETTE.accent}
                      theme="pumpkin-moon"
                      isStudioPreview
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2.5 rounded-full bg-[#1C1109] border border-[#542D14] text-xs font-bold text-[#FFF3E3] hover:bg-[#2A180C] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Tools</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-7 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
              >
                <span>Continue to Music &amp; Soundtrack</span>
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
            className="space-y-6"
          >
            {/* Music Selector Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1C1109] border border-[#542D14] shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-[#2A180C]">
                <div>
                  <h3 className="text-base font-bold text-[#FFF3E3] flex items-center gap-2">
                    <Music className="w-5 h-5 text-[#FF7518]" />
                    <span>Halloween Ambient Soundtrack &amp; Expiry</span>
                  </h3>
                  <p className="text-xs text-[#C49A76]">
                    Pick a gentle melody or ambient tone that plays when {partnerName || "your partner"} starts the journey.
                  </p>
                </div>

                {/* Tab switch: FreeTouse vs YouTube */}
                <div className="flex rounded-full bg-[#0F0A06] p-1 border border-[#542D14] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMusicTab("catalog")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      musicTab === "catalog"
                        ? "bg-[#2A180C] text-[#FFD166] shadow-xs"
                        : "text-[#C49A76] hover:text-[#FFF3E3]"
                    }`}
                  >
                    🎵 Halloween Library
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicTab("youtube")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      musicTab === "youtube"
                        ? "bg-[#2A180C] text-[#FFD166] shadow-xs"
                        : "text-[#C49A76] hover:text-[#FFF3E3]"
                    }`}
                  >
                    🎬 YouTube Audio
                  </button>
                </div>
              </div>

              {/* Selected Track Banner & Timestamp Picker */}
              {selectedTrack && (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0F0A06] border-2 border-[#FF7518]/60 shadow-xs space-y-4">
                  {/* Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedTrack.thumbnailUrl ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-[#542D14] shadow-2xs">
                          <Image
                            src={selectedTrack.thumbnailUrl}
                            alt={selectedTrack.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#1C1109] flex items-center justify-center text-xl shrink-0 border border-[#542D14]">
                          🎵
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FFD166] uppercase tracking-wider">
                          <Sparkles className="w-3 h-3 text-[#FF7518]" />
                          <span>Active Soundtrack</span>
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#FFF3E3] truncate">
                          {selectedTrack.title}
                        </h4>
                        <p className="text-[11px] text-[#C49A76] truncate">
                          {selectedTrack.artist} • {selectedTrack.type === "youtube" ? "YouTube Audio" : "Ambient Library"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={toggleSelectedPreview}
                        className="px-3.5 py-1.5 rounded-full bg-[#1C1109] text-[#FFD166] text-xs font-bold border border-[#FF7518]/50 shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {previewTrackId === selectedTrack.id || (selectedTrack.type === "youtube" && isYtTesting) ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-[#FFD166]" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-[#FFD166]" />
                            <span>Test from {formatTime(trackStartAt)}</span>
                          </>
                        )}
                      </button>
                      <span className="px-2.5 py-1 rounded-full bg-[#2A180C] text-[#FF7518] border border-[#FF7518]/40 text-[10px] font-bold">
                        ✓ Active
                      </span>
                    </div>
                  </div>

                  {/* YouTube Preview Frame (when testing YouTube audio) */}
                  {selectedTrack.type === "youtube" && isYtTesting && selectedTrack.youtubeId && (
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black/90 border border-[#542D14] shadow-md relative">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${selectedTrack.youtubeId}?autoplay=1&start=${trackStartAt}&enablejsapi=1`}
                        className="w-full h-full border-0"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="YouTube Preview"
                      />
                    </div>
                  )}

                  {/* ── Timestamp Controller Card ── */}
                  <div className="p-4 rounded-2xl bg-[#1C1109] border border-[#542D14] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2 font-bold text-[#FFF3E3]">
                        <Clock className="w-3.5 h-3.5 text-[#FF7518]" />
                        <span>Start song playback from:</span>
                        <span className="px-2 py-0.5 rounded-lg bg-[#2A180C] text-[#FFD166] border border-[#FF7518]/40 font-mono font-bold text-xs">
                          {formatTime(trackStartAt)}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#C49A76]">
                        Total length: {formatTime(selectedTrack.duration || 300)}
                      </span>
                    </div>

                    {/* Interactive Waveform Visualizer & Scrubber */}
                    {selectedTrack.waveform && selectedTrack.waveform.length > 0 && (
                      <div
                        className="relative h-12 rounded-xl bg-[#0F0A06] border border-[#542D14] overflow-hidden cursor-pointer select-none"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          const newSec = Math.round(ratio * (selectedTrack.duration || 300));
                          handleStartAtChange(newSec);
                        }}
                        title="Click anywhere to jump timestamp"
                      >
                        {/* Bars */}
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
                                  backgroundColor: isPastStart ? "#FF7518" : "#542D14",
                                  opacity: isPastStart ? 0.95 : 0.45,
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
                            backgroundColor: "#FF7518",
                            boxShadow: "0 0 8px rgba(255, 117, 24, 0.8)",
                          }}
                        >
                          <div className="absolute -top-1 -left-2 px-1.5 py-0.5 rounded-full bg-[#FF7518] text-[#0F0A06] text-[9px] font-bold shadow-xs whitespace-nowrap">
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
                      className="w-full accent-[#FF7518] h-1.5 rounded-lg cursor-pointer bg-[#0F0A06]"
                    />

                    {/* Precise Minutes & Seconds Input + Preset Moments */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#C49A76]">
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
                            className="w-11 px-2 py-1 text-center rounded-lg bg-[#0F0A06] border border-[#542D14] font-bold text-[#FFF3E3] focus:outline-none focus:border-[#FF7518]"
                            placeholder="00"
                          />
                          <span className="font-bold text-[#FF7518]">:</span>
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
                            className="w-11 px-2 py-1 text-center rounded-lg bg-[#0F0A06] border border-[#542D14] font-bold text-[#FFF3E3] focus:outline-none focus:border-[#FF7518]"
                            placeholder="00"
                          />
                          <span className="text-[10px] text-[#C49A76]">(mm:ss)</span>
                        </div>
                      </div>

                      {/* Quick presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-[#C49A76]">Presets:</span>
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
                                  ? "bg-[#FF7518] text-[#0F0A06] shadow-2xs"
                                  : "bg-[#0F0A06] text-[#C49A76] border border-[#542D14] hover:bg-[#2A180C]"
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

              {/* Tab Content: Curated Tracks */}
              {musicTab === "catalog" && (
                <div className="space-y-4">
                  {/* Category Filter Pills */}
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
                            ? "bg-[#2A180C] text-[#FFD166] border border-[#FF7518] shadow-2xs"
                            : "bg-[#0F0A06] text-[#C49A76] border border-[#542D14] hover:bg-[#1C1109]"
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
                      className="flex-1 px-4 py-2 rounded-xl bg-[#0F0A06] border border-[#542D14] text-xs text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518]"
                    />
                    <button
                      type="button"
                      onClick={() => void fetchMusic(musicSearchQuery)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      Search
                    </button>
                  </div>

                  {/* Loading indicator */}
                  {loadingMusic ? (
                    <div className="p-8 text-center text-xs font-bold text-[#FF7518] animate-pulse flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#FF7518] border-t-transparent animate-spin" />
                      <span>Finding ambient soundtracks...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {tracks.map((t) => {
                        const isSelected = selectedTrack?.id === t.id;
                        const isPreviewing = previewTrackId === t.id;
                        const thumb = t.thumbnails?.sm || t.thumbnails?.md;
                        return (
                          <div
                            key={t.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isSelected
                                ? "bg-[#2A180C] border-[#FF7518] shadow-xs"
                                : "bg-[#0F0A06] border-[#542D14] hover:border-[#8C441B]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {thumb ? (
                                <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-[#542D14]">
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
                                  className="w-8 h-8 rounded-full bg-[#1C1109] shadow-xs flex items-center justify-center text-[#FFD166] hover:scale-105 transition-transform shrink-0"
                                  title={isPreviewing ? "Stop" : "Preview song"}
                                >
                                  {isPreviewing ? <Pause className="w-3.5 h-3.5 fill-[#FFD166]" /> : <Play className="w-3.5 h-3.5 fill-[#FFD166]" />}
                                </button>
                              )}

                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-[#FFF3E3] truncate">
                                  {t.title}
                                </h5>
                                <p className="text-[10px] text-[#C49A76] truncate">
                                  {t.artists?.[0]?.[1]?.name || artistName(t) || "Artist"} • {formatTime(t.duration)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePreviewMusic(t)}
                                className="w-7 h-7 rounded-full bg-[#1C1109] hover:bg-[#2A180C] shadow-2xs flex items-center justify-center text-[#FFD166] hover:scale-105 transition-transform border border-[#542D14]"
                                title={isPreviewing ? "Stop preview" : "Listen"}
                              >
                                {isPreviewing ? <Pause className="w-3 h-3 fill-[#FFD166]" /> : <Play className="w-3 h-3 fill-[#FFD166]" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectTrack(t)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#FF7518] text-[#0F0A06] shadow-xs"
                                    : "bg-[#1C1109] text-[#FFD166] border border-[#542D14] hover:bg-[#2A180C]"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: YouTube Tab */}
              {musicTab === "youtube" && (
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#FFF3E3] block">
                      Paste YouTube Song or Video URL:
                    </label>
                    <p className="text-[11px] text-[#C49A76]">
                      Supports any standard YouTube link, mobile share link (youtu.be), or Shorts.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyYoutube()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-4 py-2 rounded-xl bg-[#0F0A06] border border-[#542D14] text-xs text-[#FFF3E3] placeholder:text-[#C49A76]/60 focus:outline-none focus:border-[#FF7518]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyYoutube}
                      disabled={youtubeLoading || !youtubeUrl.trim()}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] text-xs font-bold hover:scale-105 active:scale-95 disabled:opacity-40 transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      {youtubeLoading ? "Verifying..." : "Attach Track"}
                    </button>
                  </div>

                  {youtubeError && (
                    <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 font-medium">
                      {youtubeError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <PurchaseDetails productSlug="halloween-pumpkin-moon" />

            {/* Stepper Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-full bg-[#1C1109] border border-[#542D14] text-xs font-bold text-[#FFF3E3] hover:bg-[#2A180C] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Gallery</span>
              </button>

              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-8 py-3 rounded-full text-[#0F0A06] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-[#FF7518] to-[#FF8C38]"
              >
                {isCreating ? (
                  <span>Crafting Story...</span>
                ) : (
                  <>
                    <span>Generate Pumpkin Moon Date 🎃</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {creationError && (
              <p className="text-xs text-rose-400 font-semibold text-center">{creationError}</p>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 5: SHARE LINK & READY
        ───────────────────────────────────────────── */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="p-8 sm:p-10 rounded-3xl bg-[#1C1109] border-2 border-[#FF7518] shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#2A180C] border border-[#FF7518] flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(255,117,24,0.4)]">
                🎃
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl sm:text-3xl font-halloween text-[#FFF3E3] tracking-wide">
                  Your Pumpkin Moon Story Is Ready!
                </h2>
                <p className="text-xs sm:text-sm text-[#C49A76]">
                  Share this private link with {partnerName}. When they open it, they&#39;ll experience the 6-scene story and your invitation.
                </p>
              </div>

              {/* Share URL Box */}
              <div className="p-4 rounded-2xl bg-[#0F0A06] border border-[#542D14] max-w-lg mx-auto flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#FFD166] truncate text-left">
                  {generatedUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer hover:brightness-105 transition-all shadow-xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {generatedUrl && (
                  <Link
                    href={generatedUrl}
                    target="_blank"
                    className="px-6 py-3 rounded-full bg-[#2A180C] hover:bg-[#542D14] border border-[#FF7518]/50 text-xs font-bold text-[#FFF3E3] flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <span>View Story Page</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF7518]" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF7518] to-[#FF8C38] text-[#0F0A06] font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with {partnerName}</span>
                </button>
              </div>

              {/* Creator Secret Manage Link */}
              {generatedManageUrl && (
                <div className="pt-6 border-t border-[#2A180C] max-w-md mx-auto text-left space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD166]">
                    <span>Creator Secret Management Link</span>
                    <button
                      type="button"
                      onClick={handleCopyManageLink}
                      className="text-[#FF7518] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedManage ? "Copied!" : "Copy Secret Link"}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#C49A76]">
                    Keep this private! It lets you view partner RSVPs, listen to voice replies, and manage responses.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
