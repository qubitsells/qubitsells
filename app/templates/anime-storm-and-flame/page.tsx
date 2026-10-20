"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Gift,
  Lock,
  Mail,
  Music,
  Check,
  Copy,
  ExternalLink,
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  Share2,
  Upload,
  Sliders,
  MapPin,
  Zap,
  Flame,
  Shield,
  Scroll,
  BookOpen,
  Compass,
  ShieldCheck,
} from "lucide-react";
import {
  STORM_AND_FLAME_SCENES,
  STORM_AND_FLAME_CONFIG,
  STORM_AND_FLAME_PALETTE,
  DEFAULT_STORM_AND_FLAME_GALLERY_ITEMS,
} from "@/lib/constants/animeStormAndFlameTemplate";
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

const STORM_MUSIC_CATEGORIES = [
  { id: "storm", label: "⚡ Storm & Lightning", query: "electronic" },
  { id: "flame", label: "🔥 Golden Flame", query: "cinematic" },
  { id: "epic", label: "⚔️ Battle Romance", query: "epic" },
  { id: "piano", label: "🎹 Midnight Piano", query: "piano" },
  { id: "lofi", label: "☕ Cozy Anime Lofi", query: "lofi" },
  { id: "ambient", label: "✨ Ambient Skies", query: "ambient" },
];

export default function AnimeStormAndFlameStudio() {
  const [step, setStep] = useState(0); // 0 = Story & Names, 1 = Tools Selection, 2 = Floating Gallery, 3 = Soundtrack & Expiry, 4 = Share Link

  // Step 1: Couple & Romantic Message
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [openingTagline, setOpeningTagline] = useState(
    STORM_AND_FLAME_CONFIG.defaultOpening
  );
  const [personalMessage, setPersonalMessage] = useState(
    STORM_AND_FLAME_CONFIG.defaultMessage
  );
  const [sacredPromise, setSacredPromise] = useState(
    STORM_AND_FLAME_CONFIG.defaultPromise
  );

  // ─────────────────────────────────────────────
  // Step 2: All 11 QubitSells Tools State
  // ─────────────────────────────────────────────

  // 1. T01 Reply Tool (Voice memos, photo selfies, text)
  const [replyToolEnabled, setReplyToolEnabled] = useState(true);
  const [replyAllowVoice, setReplyAllowVoice] = useState(true);
  const [replyAllowPhoto, setReplyAllowPhoto] = useState(true);

  // 2. T02 Date Invitation & Proposed Slots
  const [dateToolEnabled, setDateToolEnabled] = useState(true);
  const [dateSlots, setDateSlots] = useState([
    {
      id: "slot_1",
      start_time: "Friday Night, 8:00 PM",
      label: "Anime Night & Cozy Blankets (8:00 PM)",
    },
    {
      id: "slot_2",
      start_time: "Saturday Evening, 7:00 PM",
      label: "Dinner Date & Starlight Stroll (7:00 PM)",
    },
  ]);
  const [newSlotInput, setNewSlotInput] = useState("");

  // 3. T03 Date Location & Venue Map
  const [locationToolEnabled, setLocationToolEnabled] = useState(false);
  const [dateFormat, setDateFormat] = useState<"in_person" | "online">("in_person");
  const [dateLocation, setDateLocation] = useState(
    "Under the Neon City Lights & Ramen Bar"
  );

  // 4. T04 Vibe Check & Choice Polls
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState(
    "What anime world or date shall we explore next?"
  );
  const [pollOptions, setPollOptions] = useState([
    "Battle fantasy anime marathon with hot ramen",
    "Scenic rooftop stargazing with warm cider",
    "Weekend road trip chasing thunderstorms",
  ]);
  const [newPollOption, setNewPollOption] = useState("");

  // 5. T05 Heart-to-Heart Question Prompt
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState(
    "When was the exact moment you felt that our hearts were united in the storm?"
  );

  // 6. T06 Synchronized Secret Reveal
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealPrompt, setRevealPrompt] = useState(
    "A secret confession of my love, unlocked only when both our fingers touch under the lightning..."
  );

  // 7. T07 Scratch-to-Reveal Card
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchTitle, setScratchTitle] = useState(
    "A fiery surprise for you ⚡🔥"
  );
  const [scratchSecret, setScratchSecret] = useState(
    "No matter how fierce the storm becomes, you are my home and my forever companion."
  );

  // 8. T08 Sweet Love Coupon Voucher
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState(
    "One Epic Anime Marathon & Midnight Ramen Feast"
  );
  const [couponDesc, setCouponDesc] = useState(
    "Redeemable anytime you need warmth, rest, or extra pampering under the blankets."
  );

  // 9. T09 Open When Sealed Letter
  const [openWhenEnabled, setOpenWhenEnabled] = useState(false);
  const [openWhenOccasion, setOpenWhenOccasion] = useState(
    "Open when the storm feels too heavy or you miss me"
  );
  const [openWhenLetter, setOpenWhenLetter] = useState(
    "Close your eyes and breathe. I have your back through every gale, and I will always stand beside you."
  );

  // 10. T10 Our Story Timeline Memories
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [storyCards, setStoryCards] = useState([
    {
      photo_url: "/templates/anime-storm-and-flame/01-before-the-storm.png",
      caption: "Where it began — our sparks first meeting.",
    },
    {
      photo_url: "/templates/anime-storm-and-flame/03-i-have-your-back.png",
      caption: "Shielding each other against every sudden squall.",
    },
    {
      photo_url: "/templates/anime-storm-and-flame/05-our-combined-strength.png",
      caption: "Two powers combined into one unstoppable love.",
    },
  ]);

  // 11. T11 Couple Bucket List
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketItems, setBucketItems] = useState([
    "Watch a midnight thunderstorm from a cozy high-rise",
    "Late-night hot ramen bar after an anime premiere",
    "Travel to Japan and walk through ancient mountain shrines together",
  ]);
  const [newBucketItem, setNewBucketItem] = useState("");

  // Floating Photo & Quote Gallery State
  const [floatingGalleryEnabled, setFloatingGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("Our Storm & Flame Memories & Whispers");
  const [gallerySubtitle, setGallerySubtitle] = useState(
    "Hover over each memory to reveal the secret quote inside my heart ✨"
  );
  const [galleryItems, setGalleryItems] = useState<FloatingGalleryItem[]>(
    DEFAULT_STORM_AND_FLAME_GALLERY_ITEMS
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3: Music & Expiry
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [musicTab, setMusicTab] = useState<"catalog" | "youtube">("catalog");
  const [selectedCategory, setSelectedCategory] = useState("storm");
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [tracks, setTracks] = useState<FreeTouseTrack[]>(CURATED_TRACKS);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [trackStartAt, setTrackStartAt] = useState(0);

  // YouTube Custom Music
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isYtTesting, setIsYtTesting] = useState(false);

  // Expiry Hours (168 = 7 days default)
  const expiryHours = 72;

  // Step 4: Share Link & Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedManageUrl, setGeneratedManageUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Pre-load recommended music tracks from API
  const fetchMusic = useCallback(async (query: string) => {
    setLoadingMusic(true);
    try {
      const q = query.trim() || "electronic";
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
              artist: first.artists?.[0]?.[1]?.name || artistName(first) || "Artist",
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
    void fetchMusic("electronic");
  }, [fetchMusic]);

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
    const maxSec = selectedTrack
      ? Math.max(0, Math.floor(selectedTrack.duration || 300) - 1)
      : 600;
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
      if (!res.ok)
        throw new Error(data?.error || "Could not load YouTube soundtrack.");
      const startSec = data.track?.startAt || 0;
      const track: MusicTrack = data.track || {
        id: `yt-${data.videoId}`,
        title: data.title || "YouTube Anime Track",
        artist: data.author || data.artist || "YouTube Artist",
        thumbnailUrl:
          data.thumbnailUrl ||
          `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`,
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
      setYoutubeError(
        (err as Error).message ||
          "Invalid YouTube link. Please check the URL and try again."
      );
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

  const handleUpdateStoryCaption = (index: number, newCaption: string) => {
    setStoryCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, caption: newCaption } : card
      )
    );
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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        throw new Error(
          data.error || "Failed to upload image. Please try again."
        );
      }

      const newItem: FloatingGalleryItem = {
        id: `photo_${Date.now()}`,
        url: data.secure_url,
        aspect: "square",
        quote: "Two powers, united under one sky forever.",
        author: yourName.trim() || "My Love",
      };

      setGalleryItems((prev) => [newItem, ...prev]);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Error uploading image.");
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleUpdateItemAspect = (
    id: string,
    aspect: "tall" | "wide" | "square" | "circle" | "badge"
  ) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, aspect } : item))
    );
  };

  const handleUpdateItemQuote = (id: string, quote: string) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quote } : item))
    );
  };

  const handleUpdateItemAuthor = (id: string, author: string) => {
    setGalleryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, author } : item))
    );
  };

  const handleRemoveGalleryItem = (id: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaultGallery = () => {
    setGalleryItems(DEFAULT_STORM_AND_FLAME_GALLERY_ITEMS);
  };

  // Compile all tools into valid payload
  const buildToolsPayload = (): TemplateTool[] => {
    const tools: TemplateTool[] = [];

    // 1. T01: Reply Tool
    if (replyToolEnabled) {
      tools.push({
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: `Leave a battle-partner note or whisper for ${
          yourName.trim() || "me"
        }...`,
        enabledFormats: {
          text: true,
          photo: replyAllowPhoto,
          voice: replyAllowVoice,
        },
        maxChars: 2000,
        maxPhotos: 3,
        maxVoiceSeconds: 60,
        allowMultiple: true,
        quickReactions: ["⚡", "🔥", "🛡️", "✨", "🤍"],
      });
    }

    // 2 & 3. T02 & T03: Date Invitation & Location
    if (dateToolEnabled) {
      tools.push({
        id: "invitation_t02",
        type: "invitation",
        enabled: true,
        activity: "Our Next Adventure",
        invitationMessage: STORM_AND_FLAME_CONFIG.finalQuestion,
        format: locationToolEnabled ? dateFormat : "in_person",
        location: locationToolEnabled
          ? dateLocation.trim() || "Under the Neon City Lights & Ramen Bar"
          : undefined,
        dateMode: "slots",
        durationMinutes: 120,
        senderTimezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
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
        question:
          pollQuestion.trim() || "What anime world or date shall we explore next?",
        description: "Cast your vote for our next adventure!",
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
        title: "A Heartfelt Question In The Storm",
        description: "Whisper your honest answer to me.",
        questions: [
          {
            id: "q_storm_1",
            prompt:
              questionPrompt.trim() ||
              "When was the exact moment you felt that our hearts were united in the storm?",
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
        prompt:
          revealPrompt.trim() ||
          "A secret confession of my love, unlocked only when both our fingers touch under the lightning...",
        description: "Locked surprise unlocked together.",
        countdownSeconds: 3,
      });
    }

    // 7. T07: Scratch Card Surprise
    if (scratchToolEnabled) {
      tools.push({
        id: "scratch_t07",
        type: "scratch_reveal",
        enabled: true,
        coverTitle: scratchTitle.trim() || "A fiery surprise for you ⚡🔥",
        coverInstruction: "Scratch with your finger or mouse to reveal",
        contentType: "message",
        hiddenMessage:
          scratchSecret.trim() ||
          "No matter how fierce the storm becomes, you are my home and my forever companion.",
      });
    }

    // 8. T08: Sweet Love Coupon
    if (couponToolEnabled) {
      tools.push({
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title:
          couponTitle.trim() ||
          "One Epic Anime Marathon & Midnight Ramen Feast",
        description:
          couponDesc.trim() ||
          "Redeemable anytime you need warmth, rest, or extra pampering under the blankets.",
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
        description: "A letter for when you need courage or a warm hug.",
        attachReply: true,
        envelopes: [
          {
            id: "env_storm_1",
            occasion:
              openWhenOccasion.trim() ||
              "Open when the storm feels too heavy or you miss me",
            message:
              openWhenLetter.trim() ||
              "Close your eyes and breathe. I have your back through every gale, and I will always stand beside you.",
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
        title: "Our Anime Couple Bucket List",
        description: "Adventures and dreams we vow to conquer hand-in-hand.",
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
        title: galleryTitle.trim() || "Our Storm & Flame Memories & Whispers",
        subtitle:
          gallerySubtitle.trim() ||
          "Hover over each memory to reveal the secret quote inside my heart ✨",
        items: galleryItems,
      } as unknown as TemplateTool);
    }

    return tools;
  };

  const handleCreateTemplate = async () => {
    if (!partnerName.trim() || !yourName.trim()) {
      alert("Please enter both your partner's name and your name.");
      setStep(0);
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      const toolsPayload = buildToolsPayload();

      // Store custom tagline & sacred promise inside metadata tool for viewer retrieval
      toolsPayload.push({
        id: "storm_flame_meta",
        type: "storm_flame_meta",
        opening_tagline:
          openingTagline.trim() || STORM_AND_FLAME_CONFIG.defaultOpening,
        sacred_promise:
          sacredPromise.trim() || STORM_AND_FLAME_CONFIG.defaultPromise,
      } as unknown as TemplateTool);

      const payload = {
        theme: "anime-storm-and-flame",
        scene_index: 0,
        partner_name: partnerName.trim(),
        partner_from: yourName.trim(),
        message: personalMessage.trim() || STORM_AND_FLAME_CONFIG.defaultMessage,
        sender_gender: "male" as const,
        music_track: selectedTrack
          ? {
              ...selectedTrack,
              thumbnailUrl:
                selectedTrack.thumbnailUrl?.startsWith("http")
                  ? selectedTrack.thumbnailUrl
                  : "https://eu.data.freetouse.com/music/tracks/b92bbd81-b5e3-382d-2d8a-8023ed6e7340/cover/webp/sm/cover-sm.webp",
              startAt: trackStartAt,
            }
          : null,
        has_media: false,
        media_items: [],
        expiry_hours: Math.max(
          1,
          Math.min(720, expiryHours <= 0 ? 168 : expiryHours)
        ),
        tools: toolsPayload,
      };

      const res = await publishTemplate({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || "Could not create your template. Please try again."
        );
      }

      setGeneratedCode(data.short_code);
      setGeneratedUrl(data.url);
      setGeneratedManageUrl(data.manage_url);
      setStep(4);
    } catch (err: unknown) {
      setCreationError(
        (err as Error).message || "An error occurred during template creation."
      );
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
      className="min-h-screen text-[#EFF7FF] selection:bg-[#00E5FF] selection:text-[#050B16]"
      style={{ backgroundColor: STORM_AND_FLAME_PALETTE.background }}
    >
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-4 pt-6"><PurchaseDetails productSlug="anime-storm-and-flame" /></div>

      <main id="main-content" className="max-w-4xl mx-auto scroll-mt-28 pt-5 pb-20 px-4 sm:px-6">
        {/* ─────────────────────────────────────────────
            HEADER & STEP INDICATOR
        ───────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#00E5FF] hover:bg-[#18253E] transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Templates</span>
          </Link>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#00E5FF] flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Battle Fantasy Anime Romance</span>
              <Flame className="w-3.5 h-3.5 text-[#FF9900]" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-storm-flame font-bold text-[#EFF7FF] tracking-tight mt-1">
              Create &quot;Storm &amp; Flame&quot;
            </h1>
            <p className="text-xs sm:text-sm text-[#B9CBDF] font-medium mt-1">
              {STORM_AND_FLAME_CONFIG.tagline} • 6-scene elemental anime story arc
            </p>
          </div>

          {/* Clean Stepper */}
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
                      ? "bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] shadow-md shadow-[#00E5FF]/20"
                      : idx < step
                      ? "bg-[#18253E] text-[#00E5FF] border border-[#273B5E] cursor-pointer"
                      : "bg-[#0F1A2E]/60 text-[#738CA8]/60 border border-[#273B5E]/40"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                    {s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 4 && <span className="text-[#273B5E] text-xs">→</span>}
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
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#EFF7FF] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00E5FF]" />
                    <span>Included 6-Scene Anime Story Arc</span>
                  </h3>
                  <p className="text-xs text-[#B9CBDF]">
                    Your partner will watch this 27.5-second battle-fantasy romance unfold with elemental power.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#050B16] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#FF9900]">
                  Fixed 16:9 2D Art
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {STORM_AND_FLAME_SCENES.map((scene) => (
                  <div key={scene.order} className="space-y-1">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#273B5E] bg-[#070F1E]">
                      <Image
                        src={scene.file}
                        alt={scene.title}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 text-[9px] font-bold text-[#00E5FF]">
                        #{scene.order}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#EFF7FF] truncate">
                      {scene.title}
                    </p>
                    <p className="text-[9px] text-[#738CA8] line-clamp-2 leading-tight">
                      {scene.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Names & Personal Note Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-xl space-y-6">
              <div className="space-y-1 border-b border-[#273B5E] pb-4">
                <h3 className="font-storm-flame text-lg sm:text-xl font-bold text-[#EFF7FF]">
                  Personalize Your Anime Battle Story
                </h3>
                <p className="text-xs text-[#B9CBDF]">
                  Personalize the names, opening vow, and heartfelt messages for your partner.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#EFF7FF] block mb-1">
                    Partner&#39;s Name <span className="text-[#00E5FF]">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="E.g., Maya, Sophia, My Queen..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-semibold text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#EFF7FF] block mb-1">
                    Your Name <span className="text-[#00E5FF]">*</span>
                  </label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="E.g., Alex, Leo, Your Guardian..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-semibold text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#EFF7FF] block mb-1">
                  Opening Story Tagline
                </label>
                <input
                  type="text"
                  value={openingTagline}
                  onChange={(e) => setOpeningTagline(e.target.value)}
                  placeholder="Two powers. One promise."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-medium text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#EFF7FF] block mb-1">
                  Your Personal Message Card (Revealed on final scene)
                </label>
                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="With you beside me, I am ready for every new chapter..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-medium text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF] leading-relaxed resize-none"
                />
                <p className="text-[11px] text-[#738CA8] mt-1">
                  This note appears in an elemental parchment card that honors your journey together.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#EFF7FF] flex items-center gap-1.5 mb-1">
                  <Scroll className="w-3.5 h-3.5 text-[#FF9900]" />
                  <span>Sacred Promise (Interactive unsealing during Scene 4)</span>
                </label>
                <textarea
                  rows={2}
                  value={sacredPromise}
                  onChange={(e) => setSacredPromise(e.target.value)}
                  placeholder="I promise to be your shield against the storm and the warmth in your darkest night..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-medium text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF] leading-relaxed resize-none"
                />
                <p className="text-[11px] text-[#738CA8] mt-1">
                  Your partner touches the glowing emblem to break the seal and read this sacred vow.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!partnerName.trim() || !yourName.trim()}
                  className="px-7 py-3 rounded-full text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#38BDF8]"
                >
                  <span>Continue to Tools Selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 2: TOOLS SELECTION (11 QubitSells Tools Desktop Grid)
        ───────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] text-center space-y-1 shadow-lg">
              <h3 className="font-storm-flame text-lg sm:text-xl font-bold text-[#EFF7FF]">
                Select Interactive Tools for {partnerName || "your partner"}
              </h3>
              <p className="text-xs text-[#B9CBDF] max-w-lg mx-auto">
                Toggle whichever moments you want included. Everything is pre-configured with elemental anime defaults so you can launch instantly without stress.
              </p>
            </div>

            {/* Tools Grid: 3 in a row on desktop (lg:grid-cols-3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Voice & Photo Love Notes */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  replyToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        ⚡
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
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
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      1. Voice &amp; Photo Notes
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      Lets {partnerName || "your partner"} record battle-partner voice memos, send selfies, and react with elemental emojis directly to you.
                    </p>
                  </div>

                  {replyToolEnabled && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[#273B5E] text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#EFF7FF] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowVoice}
                          onChange={(e) => setReplyAllowVoice(e.target.checked)}
                          className="accent-[#00E5FF]"
                        />
                        <span>Voice Notes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#EFF7FF] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowPhoto}
                          onChange={(e) => setReplyAllowPhoto(e.target.checked)}
                          className="accent-[#00E5FF]"
                        />
                        <span>Photo Uploads</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 2: Date Invitation & Proposed Slots */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  dateToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        ⚔️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#FF9900] border border-[#FF9900]/30">
                        RSVP
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dateToolEnabled}
                        onChange={(e) => setDateToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      2. Date Invitation &amp; Slots
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      Propose anime dates, ramen feasts, or stargazing times for {partnerName || "your partner"} to accept or counter-propose.
                    </p>
                  </div>

                  {dateToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div className="text-[11px] font-bold text-[#00E5FF]">
                        Proposed Slots:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF]"
                          >
                            <span className="truncate">{slot.label}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(slot.id)}
                              className="text-[#738CA8] hover:text-red-400 p-0.5 shrink-0 transition-colors"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={newSlotInput}
                          onChange={(e) => setNewSlotInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddSlot()}
                          placeholder="Add slot (e.g. Sunday 7:00 PM)..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="px-3 py-1.5 rounded-xl bg-[#18253E] border border-[#273B5E] text-[#00E5FF] text-xs font-bold hover:bg-[#273B5E] transition-all shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 3: Date Location & Venue Map */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  locationToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        📍
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
                        Venue &amp; Map
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locationToolEnabled}
                        onChange={(e) => setLocationToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      3. Date Location / Venue
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      Specify an in-person neon ramen bar or cozy virtual anime watch party.
                    </p>
                  </div>

                  {locationToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDateFormat("in_person")}
                          className={`flex-1 py-1 rounded-xl text-xs font-bold transition-all ${
                            dateFormat === "in_person"
                              ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                              : "bg-[#070F1E] text-[#B9CBDF] border border-[#273B5E]"
                          }`}
                        >
                          In Person
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFormat("online")}
                          className={`flex-1 py-1 rounded-xl text-xs font-bold transition-all ${
                            dateFormat === "online"
                              ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                              : "bg-[#070F1E] text-[#B9CBDF] border border-[#273B5E]"
                          }`}
                        >
                          Virtual / Call
                        </button>
                      </div>

                      <input
                        type="text"
                        value={dateLocation}
                        onChange={(e) => setDateLocation(e.target.value)}
                        placeholder="E.g. Under the Neon City Lights & Ramen Bar..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 4: Vibe Check & Choice Polls */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  pollToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        🔥
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#FF9900] border border-[#FF9900]/30">
                        Anime Poll
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollToolEnabled}
                        onChange={(e) => setPollToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      4. Vibe Check &amp; Poll
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      Vote together on anime series, delicious feast spots, or weekend expeditions.
                    </p>
                  </div>

                  {pollToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Poll question..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-semibold text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                      />

                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {pollOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF]"
                          >
                            <span className="truncate">{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="text-[#738CA8] hover:text-red-400 p-0.5 shrink-0 transition-colors"
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
                          placeholder="Add option..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="px-3 py-1.5 rounded-xl bg-[#18253E] border border-[#273B5E] text-[#00E5FF] text-xs font-bold hover:bg-[#273B5E] transition-all shadow-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 5: Heart-to-Heart Question Prompt */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  questionToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        💭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
                        Sacred Bond
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={questionToolEnabled}
                        onChange={(e) => setQuestionToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      5. Heart-to-Heart Question
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      Ask a heartfelt question that reveals once {partnerName || "your partner"} shares their answer.
                    </p>
                  </div>

                  {questionToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#273B5E]">
                      <label className="text-[10px] font-bold text-[#00E5FF] block">
                        Intimate Prompt:
                      </label>
                      <textarea
                        rows={2}
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="When was the moment you felt our hearts unite?..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] leading-relaxed focus:outline-none focus:border-[#00E5FF] resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 6: Synchronized Secret Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  revealToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        🔒
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#FF9900] border border-[#FF9900]/30">
                        Synchronized
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revealToolEnabled}
                        onChange={(e) => setRevealToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      6. Secret Reveal
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      A locked surprise unlocked simultaneously with a 3-second synchronized countdown.
                    </p>
                  </div>

                  {revealToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#273B5E]">
                      <label className="text-[10px] font-bold text-[#FF9900] block">
                        Locked Secret Note:
                      </label>
                      <textarea
                        rows={2}
                        value={revealPrompt}
                        onChange={(e) => setRevealPrompt(e.target.value)}
                        placeholder="A secret confession of my love, unlocked together..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] leading-relaxed focus:outline-none focus:border-[#00E5FF] resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 7: Scratch Card Surprise */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  scratchToolEnabled
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        🪄
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
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
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      7. Scratch Card Surprise
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      An electric foil card {partnerName || "your partner"} scratches off using finger or mouse to uncover a hidden note.
                    </p>
                  </div>

                  {scratchToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div>
                        <label className="text-[10px] font-bold text-[#00E5FF] block mb-0.5">
                          Foil Cover Title:
                        </label>
                        <input
                          type="text"
                          value={scratchTitle}
                          onChange={(e) => setScratchTitle(e.target.value)}
                          placeholder="A fiery surprise for you ⚡🔥..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#00E5FF] block mb-0.5">
                          Hidden Secret Message:
                        </label>
                        <input
                          type="text"
                          value={scratchSecret}
                          onChange={(e) => setScratchSecret(e.target.value)}
                          placeholder="No matter how fierce the storm becomes, you are my home..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
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
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        🎟️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#FF9900] border border-[#FF9900]/30">
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
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      8. Sweet Love Coupon
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      A cute redeemable anime voucher {partnerName || "your partner"} can claim anytime (e.g., ramen run, cozy cuddle massage).
                    </p>
                  </div>

                  {couponToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div>
                        <label className="text-[10px] font-bold text-[#FF9900] block mb-0.5">
                          Coupon Voucher Title:
                        </label>
                        <input
                          type="text"
                          value={couponTitle}
                          onChange={(e) => setCouponTitle(e.target.value)}
                          placeholder="E.g. One Epic Anime Marathon & Midnight Ramen..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#FF9900] block mb-0.5">
                          Voucher Perk / Description:
                        </label>
                        <input
                          type="text"
                          value={couponDesc}
                          onChange={(e) => setCouponDesc(e.target.value)}
                          placeholder="Redeemable whenever you need warmth, rest, or pampering..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
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
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        ✉️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
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
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      9. Open When Letter
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      A sealed digital envelope {partnerName || "your partner"} saves and opens whenever they feel lonely, miss you, or face a storm.
                    </p>
                  </div>

                  {openWhenEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div>
                        <label className="text-[10px] font-bold text-[#00E5FF] block mb-0.5">
                          When to open:
                        </label>
                        <input
                          type="text"
                          value={openWhenOccasion}
                          onChange={(e) => setOpenWhenOccasion(e.target.value)}
                          placeholder="E.g. Open when the storm feels too heavy or you miss me..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#00E5FF] block mb-0.5">
                          Letter content:
                        </label>
                        <textarea
                          rows={2}
                          value={openWhenLetter}
                          onChange={(e) => setOpenWhenLetter(e.target.value)}
                          placeholder="Close your eyes and breathe. I have your back through every gale..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] leading-relaxed focus:outline-none focus:border-[#00E5FF] resize-none"
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
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        📖
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#FF9900] border border-[#FF9900]/30">
                        Journey
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ourStoryEnabled}
                        onChange={(e) => setOurStoryEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      10. Our Story Memories
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      3 milestone cards taking {partnerName || "your partner"} through your journey and shared power.
                    </p>
                  </div>

                  {ourStoryEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {storyCards.map((card, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E]"
                          >
                            <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-[#273B5E]">
                              <Image
                                src={card.photo_url}
                                alt="Memory"
                                fill
                                sizes="60px"
                                className="object-cover"
                              />
                            </div>
                            <input
                              type="text"
                              value={card.caption}
                              onChange={(e) => handleUpdateStoryCaption(idx, e.target.value)}
                              className="flex-1 px-2 py-1 rounded-lg bg-[#0F1A2E] border border-[#273B5E] text-[11px] text-[#EFF7FF] focus:outline-none focus:border-[#00E5FF]"
                            />
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
                    ? "bg-[#121F38] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/10"
                    : "bg-[#0B1526]/70 border-[#1E2E4A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#18253E] border border-[#273B5E] flex items-center justify-center text-lg shadow-xs">
                        🧭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#18253E] text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30">
                        Future Goals
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bucketListEnabled}
                        onChange={(e) => setBucketListEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#18253E] border border-[#273B5E] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF] peer-checked:border-[#00E5FF]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EFF7FF]">
                      11. Couple Bucket List
                    </h4>
                    <p className="text-xs text-[#B9CBDF] mt-1 leading-snug">
                      A shared wishlist of future dream dates, anime conventions, and adventures you vow to conquer together.
                    </p>
                  </div>

                  {bucketListEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#273B5E]">
                      <div className="text-[11px] font-bold text-[#00E5FF]">
                        Dream Adventures:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bucketItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF]"
                          >
                            <span className="truncate">{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBucketItem(idx)}
                              className="text-[#738CA8] hover:text-red-400 p-0.5 shrink-0 transition-colors"
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
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                        />
                        <button
                          type="button"
                          onClick={handleAddBucketItem}
                          className="px-3 py-1.5 rounded-xl bg-[#18253E] border border-[#273B5E] text-[#00E5FF] text-xs font-bold hover:bg-[#273B5E] transition-all shadow-xs"
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
                className="px-5 py-2.5 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#B9CBDF] hover:bg-[#18253E] hover:text-[#EFF7FF] transition-all cursor-pointer"
              >
                ← Back to Message
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-7 py-3 rounded-full text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#38BDF8]"
              >
                <span>Continue to Floating Gallery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 3: FLOATING PHOTO & QUOTE GALLERY (Step index 2)
        ───────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-xl space-y-6"
          >
            {/* Header + Master Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#273B5E]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#18253E] text-[#00E5FF] border border-[#00E5FF]/30">
                    Floating Mosaic Wall
                  </span>
                  <span className="text-xs text-[#B9CBDF] font-semibold">Hover Quotes • Zero-Gravity</span>
                </div>
                <h3 className="text-lg sm:text-xl font-storm-flame font-bold text-[#EFF7FF] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00E5FF]" />
                  <span>Floating Photo &amp; Quote Gallery</span>
                </h3>
                <p className="text-xs text-[#B9CBDF]">
                  Display an organic floating mosaic of your memories. When your partner hovers or taps each memory, a romantic quote appears on top ✨
                </p>
              </div>

              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-auto bg-[#070F1E] px-4 py-2 rounded-2xl border border-[#273B5E] hover:border-[#00E5FF] transition-all">
                <input
                  type="checkbox"
                  checked={floatingGalleryEnabled}
                  onChange={(e) => setFloatingGalleryEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#18253E] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#B9CBDF] peer-checked:after:bg-[#050B16] after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E5FF] relative"></div>
                <span className="text-xs font-bold text-[#EFF7FF]">
                  {floatingGalleryEnabled ? "Gallery Enabled" : "Gallery Disabled"}
                </span>
              </label>
            </div>

            {floatingGalleryEnabled && (
              <div className="space-y-6">
                {/* Gallery Title & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#EFF7FF]">Gallery Section Title</label>
                    <input
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="Our Storm & Flame Memories & Whispers"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#273B5E] bg-[#070F1E] text-xs font-medium text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-hidden focus:border-[#00E5FF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#EFF7FF]">Gallery Subtitle</label>
                    <input
                      type="text"
                      value={gallerySubtitle}
                      onChange={(e) => setGallerySubtitle(e.target.value)}
                      placeholder="Hover over each memory to reveal the secret quote inside my heart ✨"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#273B5E] bg-[#070F1E] text-xs font-medium text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-hidden focus:border-[#00E5FF]"
                    />
                  </div>
                </div>

                {/* Upload & Preset toolbar */}
                <div className="p-4 rounded-2xl bg-[#070F1E] border border-dashed border-[#273B5E] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] text-xs font-bold shadow-xs hover:scale-105 active:scale-95 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingPhoto ? "Uploading..." : "Upload Couple Photo"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleUploadPhoto}
                        disabled={isUploadingPhoto}
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetDefaultGallery}
                      className="px-3 py-2 rounded-xl border border-[#273B5E] bg-[#18253E] text-xs font-semibold text-[#B9CBDF] hover:text-[#EFF7FF] hover:border-[#00E5FF] transition-colors"
                      title="Reset gallery items to anime storm and flame preset"
                    >
                      Reset Default Memories
                    </button>
                  </div>

                  <span className="text-[11px] text-[#738CA8]">
                    PNG, JPG, WEBP • Auto-optimized • {galleryItems.length} memories
                  </span>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800">
                    {uploadError}
                  </p>
                )}

                {/* Items Manager List */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#EFF7FF] block">
                    Custom Memories &amp; Secret Whispers ({galleryItems.length})
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {galleryItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-[#273B5E] bg-[#070F1E] flex gap-3 items-start"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#273B5E] bg-[#18253E]">
                          <Image
                            src={item.url}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-1.5 min-w-0">
                          {/* Aspect selector chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {(["square", "tall", "wide", "circle", "badge"] as const).map(
                              (asp) => (
                                <button
                                  key={asp}
                                  type="button"
                                  onClick={() => handleUpdateItemAspect(item.id, asp)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                                    item.aspect === asp
                                      ? "bg-[#00E5FF] text-[#050B16]"
                                      : "bg-[#18253E] text-[#B9CBDF] border border-[#273B5E]"
                                  }`}
                                >
                                  {asp}
                                </button>
                              )
                            )}
                          </div>

                          {/* Secret Quote Input */}
                          <input
                            type="text"
                            value={item.quote}
                            onChange={(e) => handleUpdateItemQuote(item.id, e.target.value)}
                            placeholder="Romantic quote inside memory..."
                            className="w-full px-2.5 py-1 rounded-lg border border-[#273B5E] bg-[#0F1A2E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-hidden focus:border-[#00E5FF]"
                          />

                          {/* Author / Tagline */}
                          <input
                            type="text"
                            value={item.author || ""}
                            onChange={(e) => handleUpdateItemAuthor(item.id, e.target.value)}
                            placeholder="Tag (e.g. My Queen, Before The Storm)..."
                            className="w-full px-2.5 py-1 rounded-lg border border-[#273B5E] bg-[#0F1A2E] text-[11px] text-[#B9CBDF] placeholder:text-[#738CA8] focus:outline-hidden focus:border-[#00E5FF]"
                          />
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryItem(item.id)}
                          className="text-[#738CA8] hover:text-red-400 p-1 shrink-0 transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Wall Interactive Preview */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#EFF7FF] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#00E5FF]" />
                      <span>Live Interactive Wall Preview</span>
                    </span>
                    <span className="text-[11px] text-[#738CA8]">
                      Hover memories to test quotes &amp; tap to zoom
                    </span>
                  </div>

                  <div className="rounded-3xl border border-[#273B5E] overflow-hidden bg-[#070F1E]">
                    <FloatingQuoteGallery
                      items={galleryItems}
                      title={galleryTitle}
                      subtitle={gallerySubtitle}
                      theme="anime-storm-and-flame"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#273B5E]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#B9CBDF] hover:bg-[#18253E] hover:text-[#EFF7FF] transition-all cursor-pointer"
              >
                ← Back to Tools
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-7 py-3 rounded-full text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#38BDF8]"
              >
                <span>Continue to Music &amp; Expiry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 4: SOUNDTRACK & EXPIRY DURATION (Step index 3)
        ───────────────────────────────────────────── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-xl space-y-6"
          >
            <div className="space-y-1">
              <h3 className="font-storm-flame text-lg sm:text-xl font-bold text-[#EFF7FF] flex items-center gap-2">
                <Music className="w-4 h-4 text-[#00E5FF]" />
                <span>Anime Battle Soundtrack &amp; Expiry</span>
              </h3>
              <p className="text-xs text-[#B9CBDF]">
                Pick an atmospheric melody that plays softly when {partnerName || "your partner"} opens their letter.
              </p>
            </div>

            {/* Selected Track Banner & Timestamp Picker */}
            {selectedTrack && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#070F1E] border-2 border-[#273B5E] shadow-sm space-y-4">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTrack.thumbnailUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-[#273B5E] shadow-xs">
                        <Image
                          src={selectedTrack.thumbnailUrl}
                          alt={selectedTrack.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#18253E] flex items-center justify-center text-xl shrink-0 border border-[#273B5E]">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00E5FF] uppercase tracking-wider">
                        <Zap className="w-3 h-3 text-[#00E5FF]" />
                        <span>Active Soundtrack</span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#EFF7FF] truncate">
                        {selectedTrack.title}
                      </h4>
                      <p className="text-[11px] text-[#738CA8] truncate">
                        {selectedTrack.artist} • {selectedTrack.type === "youtube" ? "YouTube Audio" : "Anime Library"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSelectedPreview}
                      className="px-3.5 py-1.5 rounded-full bg-[#18253E] text-[#00E5FF] text-xs font-bold border border-[#273B5E] shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {previewTrackId === selectedTrack.id || (selectedTrack.type === "youtube" && isYtTesting) ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-[#00E5FF]" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#00E5FF]" />
                          <span>Test from {formatTime(trackStartAt)}</span>
                        </>
                      )}
                    </button>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                      ✓ Active
                    </span>
                  </div>
                </div>

                {/* YouTube Preview Frame (when testing YouTube audio) */}
                {selectedTrack.type === "youtube" && isYtTesting && selectedTrack.youtubeId && (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black/90 border border-[#273B5E] shadow-md relative">
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
                <div className="p-4 rounded-2xl bg-[#0F1A2E] border border-[#273B5E] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#EFF7FF]">
                      <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                      <span>Start song playback from:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#18253E] text-[#00E5FF] border border-[#00E5FF]/30 font-mono font-bold text-xs">
                        {formatTime(trackStartAt)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#738CA8]">
                      Total length: {formatTime(selectedTrack.duration || 300)}
                    </span>
                  </div>

                  {/* Interactive Waveform Visualizer & Scrubber */}
                  <div
                    className="relative h-12 rounded-xl bg-[#070F1E] border border-[#273B5E] overflow-hidden cursor-pointer select-none"
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
                      {((selectedTrack.waveform && selectedTrack.waveform.length > 0)
                        ? selectedTrack.waveform
                        : [25, 45, 60, 35, 50, 75, 90, 40, 60, 80, 95, 70, 45, 55, 75, 85, 60, 40, 65, 80, 95, 85, 50, 65, 75, 55, 40, 50, 70, 85, 65, 45, 55, 70, 80, 90, 95, 75, 55, 45]
                      ).slice(0, 80).map((v, i, arr) => {
                        const ratio = i / arr.length;
                        const barSec = ratio * (selectedTrack.duration || 300);
                        const isPastStart = barSec >= trackStartAt;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-sm transition-colors duration-150"
                            style={{
                              height: `${Math.max(15, v)}%`,
                              backgroundColor: isPastStart ? "#00E5FF" : "#273B5E",
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
                        backgroundColor: "#00E5FF",
                        boxShadow: "0 0 8px rgba(0, 229, 255, 0.8)",
                      }}
                    >
                      <div className="absolute -top-1 -left-2 px-1.5 py-0.5 rounded-full bg-[#00E5FF] text-[#050B16] text-[9px] font-bold shadow-xs whitespace-nowrap">
                        📍 {formatTime(trackStartAt)}
                      </div>
                    </div>
                  </div>

                  {/* Timeline Slider */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor(selectedTrack.duration || 300) - 2)}
                    value={trackStartAt}
                    onChange={(e) => handleStartAtChange(Number(e.target.value))}
                    className="w-full accent-[#00E5FF] h-1.5 rounded-lg cursor-pointer bg-[#18253E]"
                  />

                  {/* Precise Minutes & Seconds Input + Preset Moments */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#B9CBDF]">
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#070F1E] border border-[#273B5E] font-bold text-[#EFF7FF] focus:outline-none focus:border-[#00E5FF]"
                          placeholder="00"
                        />
                        <span className="font-bold text-[#00E5FF]">:</span>
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#070F1E] border border-[#273B5E] font-bold text-[#EFF7FF] focus:outline-none focus:border-[#00E5FF]"
                          placeholder="00"
                        />
                        <span className="text-[10px] text-[#738CA8]">(mm:ss)</span>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#738CA8]">Presets:</span>
                      {[
                        { label: "0:00 (Start)", sec: 0 },
                        { label: "0:30", sec: 30 },
                        { label: "0:45 (Climax)", sec: 45 },
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
                                ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                                : "bg-[#070F1E] text-[#B9CBDF] border border-[#273B5E] hover:border-[#00E5FF]"
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
            <div className="flex gap-2 p-1 bg-[#070F1E] rounded-2xl border border-[#273B5E] max-w-xs">
              <button
                type="button"
                onClick={() => setMusicTab("catalog")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "catalog"
                    ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                    : "text-[#B9CBDF] hover:bg-[#18253E]"
                }`}
              >
                🎵 Anime Library
              </button>
              <button
                type="button"
                onClick={() => setMusicTab("youtube")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "youtube"
                    ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                    : "text-[#B9CBDF] hover:bg-[#18253E]"
                }`}
              >
                🎬 YouTube Audio
              </button>
            </div>

            {/* Tab Content: Curated Tracks */}
            {musicTab === "catalog" ? (
              <div className="space-y-4">
                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {STORM_MUSIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        void fetchMusic(cat.query);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                          : "bg-[#070F1E] text-[#B9CBDF] border border-[#273B5E] hover:border-[#00E5FF]"
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
                    placeholder="Search library by keyword (e.g. battle, epic, piano, lofi, ambient)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchMusic(musicSearchQuery)}
                    className="px-4 py-2 rounded-xl bg-[#00E5FF] text-[#050B16] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Loading indicator */}
                {loadingMusic ? (
                  <div className="p-8 text-center text-xs font-bold text-[#00E5FF] animate-pulse flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#00E5FF] border-t-transparent animate-spin" />
                    <span>Finding epic melodies...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {tracks.map((t) => {
                      const isSelected = selectedTrack?.id === t.id;
                      const isPreviewing = previewTrackId === t.id;
                      const artist = t.artists?.[0]?.[1]?.name || artistName(t) || "Artist";
                      const thumb = t.thumbnails?.sm || t.thumbnails?.md;

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-[#18253E] border-[#00E5FF] shadow-xs"
                              : "bg-[#070F1E] border-[#273B5E] hover:border-[#00E5FF]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {thumb ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-[#273B5E]">
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
                                className="w-10 h-10 rounded-xl bg-[#18253E] shadow-xs flex items-center justify-center text-[#00E5FF] hover:scale-105 transition-transform shrink-0 border border-[#273B5E] cursor-pointer"
                                title={isPreviewing ? "Stop" : "Preview song"}
                              >
                                {isPreviewing ? <Pause className="w-4 h-4 fill-[#00E5FF]" /> : <Play className="w-4 h-4 fill-[#00E5FF]" />}
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-[#EFF7FF] truncate">
                                {t.title}
                              </h5>
                              <p className="text-[10px] text-[#738CA8] truncate">
                                {artist} • {formatTime(t.duration)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePreviewMusic(t)}
                              className="w-7 h-7 rounded-full bg-[#18253E] shadow-xs flex items-center justify-center text-[#00E5FF] hover:scale-105 transition-transform border border-[#273B5E] cursor-pointer"
                              title={isPreviewing ? "Stop preview" : "Listen"}
                            >
                              {isPreviewing ? <Pause className="w-3 h-3 fill-[#00E5FF]" /> : <Play className="w-3 h-3 fill-[#00E5FF]" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectTrack(t)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#00E5FF] text-[#050B16] shadow-xs"
                                  : "bg-[#18253E] text-[#00E5FF] border border-[#273B5E] hover:bg-[#273B5E]"
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
            ) : (
              <div className="space-y-4 max-w-lg">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#EFF7FF] block">
                    Paste YouTube Song or Video URL:
                  </label>
                  <p className="text-[11px] text-[#738CA8]">
                    Supports any standard YouTube link, mobile share link (youtu.be), or Shorts.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs text-[#EFF7FF] placeholder:text-[#738CA8] focus:outline-none focus:border-[#00E5FF]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyYoutube}
                    disabled={youtubeLoading || !youtubeUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#00E5FF] text-[#050B16] text-xs font-bold disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    {youtubeLoading ? "Verifying..." : "Load Song"}
                  </button>
                </div>

                {youtubeError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-400 font-semibold">
                    {youtubeError}
                  </div>
                )}

                {selectedTrack?.type === "youtube" && (
                  <div className="p-4 rounded-2xl bg-[#070F1E] border-2 border-emerald-500/80 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedTrack.thumbnailUrl && (
                        <div className="w-14 h-10 rounded-lg overflow-hidden relative shrink-0 border border-[#273B5E]">
                          <Image
                            src={selectedTrack.thumbnailUrl}
                            alt={selectedTrack.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          ✓ YouTube Audio Loaded
                        </span>
                        <h4 className="text-xs font-bold text-[#EFF7FF] truncate">
                          {selectedTrack.title}
                        </h4>
                        <p className="text-[10px] text-[#738CA8] truncate">
                          Channel: {selectedTrack.artist}
                        </p>
                      </div>
                    </div>

                    <a
                      href={selectedTrack.youtubeUrl || `https://www.youtube.com/watch?v=${selectedTrack.youtubeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#00E5FF] hover:underline shrink-0"
                    >
                      Open Link ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            <PurchaseDetails productSlug="anime-storm-and-flame" />

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#273B5E]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-full bg-[#0F1A2E] border border-[#273B5E] text-xs font-bold text-[#B9CBDF] hover:bg-[#18253E] hover:text-[#EFF7FF] transition-all cursor-pointer"
              >
                ← Back to Gallery
              </button>

              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-8 py-3 rounded-full text-[#050B16] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#38BDF8]"
              >
                {isCreating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#050B16] border-t-transparent rounded-full animate-spin" />
                    <span>Publishing Storm &amp; Flame...</span>
                  </>
                ) : (
                  <>
                    <span>Publish &amp; Create Storm &amp; Flame</span>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 5: SHARE & CREATOR CENTER (Step index 4)
        ───────────────────────────────────────────── */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-10 rounded-3xl bg-[#0F1A2E] border border-[#273B5E] shadow-2xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-[#18253E] text-[#00E5FF] flex items-center justify-center text-3xl mx-auto shadow-xs border border-[#00E5FF]/40 animate-pulse">
              ⚡
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF9900]">
                Successfully Created
              </span>
              <h2 className="text-2xl sm:text-3xl font-storm-flame font-bold text-[#EFF7FF]">
                Your Storm &amp; Flame Story is Ready!
              </h2>
              <p className="text-xs sm:text-sm text-[#B9CBDF] max-w-md mx-auto">
                Share this link with {partnerName || "your partner"}. When they open it, their anime battle romance will ignite with elemental power.
              </p>
            </div>

            {/* Short Code Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#18253E] text-xs font-extrabold text-[#00E5FF] tracking-wider border border-[#273B5E]">
              SHORT CODE: {generatedCode}
            </div>

            {/* Share Link Input */}
            <div className="max-w-md mx-auto flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl || ""}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#070F1E] border border-[#273B5E] text-xs font-medium text-[#EFF7FF] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {generatedUrl && (
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#38BDF8] text-[#050B16] text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Open Storm &amp; Flame Story</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {generatedUrl && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Two powers, one promise. I created something special for you ⚡🔥: ${generatedUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-[#25D366] text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </a>
              )}

              {generatedUrl && (
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Created our anime battle romance story ⚡🔥: ${generatedUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Share on X</span>
                </a>
              )}
            </div>

            {/* Secret Creator Management Link */}
            {generatedManageUrl && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#070F1E] border border-[#273B5E] text-left space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-xs font-bold text-[#EFF7FF]">
                    Secret Creator Management Link:
                  </span>
                </div>
                <p className="text-[11px] text-[#738CA8] leading-snug">
                  Bookmark this private link! It allows you to view {partnerName || "your partner"}&#39;s voice note replies, photos, date RSVPs, and intimate confessions.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={generatedManageUrl}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0F1A2E] border border-[#273B5E] text-[11px] text-[#B9CBDF] select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyManageLink}
                    className="px-3 py-1.5 rounded-lg bg-[#00E5FF] text-[#050B16] text-xs font-bold shrink-0 shadow-xs cursor-pointer hover:scale-105 transition-all"
                  >
                    {copiedManage ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
