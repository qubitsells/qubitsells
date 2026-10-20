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
  Ghost,
  RotateCcw,
} from "lucide-react";
import {
  HAUNTED_WALTZ_SCENES,
  HAUNTED_WALTZ_CONFIG,
  HAUNTED_WALTZ_PALETTE,
  DEFAULT_HAUNTED_WALTZ_GALLERY_ITEMS,
} from "@/lib/constants/hauntedWaltzTemplate";
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

const GOTHIC_MUSIC_CATEGORIES = [
  { id: "ambient", label: "🌙 Gothic Midnight", query: "ambient" },
  { id: "waltz", label: "🎻 Haunting Waltz", query: "classical" },
  { id: "romantic", label: "💕 Romantic", query: "romantic" },
  { id: "piano", label: "🎹 Melancholy Piano", query: "piano" },
  { id: "lofi", label: "☕ Cozy Lofi", query: "lofi" },
  { id: "acoustic", label: "🎸 Acoustic", query: "guitar" },
];

export default function HauntedWaltzStudio() {
  const [step, setStep] = useState(0); // 0 = Names & Story, 1 = Tools Selection, 2 = Floating Gallery, 3 = Music & Expiry, 4 = Share

  // Step 1: Couple & Message
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [openingTagline, setOpeningTagline] = useState(HAUNTED_WALTZ_CONFIG.defaultOpening);
  const [personalMessage, setPersonalMessage] = useState(HAUNTED_WALTZ_CONFIG.defaultMessage);

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
    { id: "slot_1", start_time: "Midnight Manor Stroll, 8:00 PM", label: "Midnight Manor Stroll (8:00 PM)" },
    { id: "slot_2", start_time: "Candlelit Horror Film, 10:00 PM", label: "Candlelit Horror Film (10:00 PM)" },
  ]);
  const [newSlotInput, setNewSlotInput] = useState("");

  // 3. T03 Date Location & Venue Map
  const [locationToolEnabled, setLocationToolEnabled] = useState(false);
  const [dateFormat, setDateFormat] = useState<"in_person" | "online">("in_person");
  const [dateLocation, setDateLocation] = useState("Under the Grand Manor Chandelier");

  // 4. T04 Vibe Check & Choice Polls
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("What eerie adventure should we take next?");
  const [pollOptions, setPollOptions] = useState([
    "Explore an ancient candlelit manor together",
    "Ghost tour through the fog under a full moon",
    "Gothic horror stories & spiced cider by the hearth",
  ]);
  const [newPollOption, setNewPollOption] = useState("");

  // 5. T05 Heart-to-Heart Question Prompt
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState("If we were ghosts, where would our favorite haunt in the world be?");

  // 6. T06 Synchronized Secret Reveal
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealPrompt, setRevealPrompt] = useState("A gothic confession waiting to be unlocked together in the dark...");

  // 7. T07 Scratch-to-Reveal Card
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchTitle, setScratchTitle] = useState("A gothic surprise for my midnight waltz partner 🕯️");
  const [scratchSecret, setScratchSecret] = useState("Even if eternity ended, I would still search every shadow to find you. Forever my favorite soul.");

  // 8. T08 Sweet Love Coupon Voucher
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState("One Midnight Candlelit Dance & Warm Cider");
  const [couponDesc, setCouponDesc] = useState("Redeemable whenever you want to escape the world and dance in the shadows together.");

  // 9. T09 Open When Sealed Letter
  const [openWhenEnabled, setOpenWhenEnabled] = useState(false);
  const [openWhenOccasion, setOpenWhenOccasion] = useState("Open when the night feels quiet and dark");
  const [openWhenLetter, setOpenWhenLetter] = useState("Hold my hand in your thoughts. As long as we have each other, no darkness can ever haunt us.");

  // 10. T10 Our Story Timeline Memories
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [storyCards, setStoryCards] = useState([
    { photo_url: "/templates/spooky-the-haunted-waltz/01-the-manor-at-midnight.png", caption: "Arriving at the midnight manor under the mist." },
    { photo_url: "/templates/spooky-the-haunted-waltz/03-the-ghosts-in-the-ballroom.png", caption: "Meeting the ballroom spirits waiting for their dance." },
    { photo_url: "/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png", caption: "Our timeless waltz beneath the moonlit chandelier." },
  ]);

  // 11. T11 Couple Bucket List
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketItems, setBucketItems] = useState([
    "Dance together in a moonlit room with only candlelight",
    "Explore a historic gothic estate or castle",
    "Whisper ghost stories under a warm blanket until dawn",
  ]);
  const [newBucketItem, setNewBucketItem] = useState("");

  // Floating Photo & Quote Gallery State
  const [floatingGalleryEnabled, setFloatingGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("The Haunted Waltz Gallery");
  const [gallerySubtitle, setGallerySubtitle] = useState("Gothic moments & whispers captured in time 🕯️");
  const [galleryItems, setGalleryItems] = useState<FloatingGalleryItem[]>(DEFAULT_HAUNTED_WALTZ_GALLERY_ITEMS);
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
        title: data.title || "YouTube Gothic Track",
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

  const handleUpdateStoryCaption = (index: number, newCaption: string) => {
    setStoryCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, caption: newCaption } : card))
    );
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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        throw new Error(data.error || "Failed to upload image. Please try again.");
      }

      const newItem: FloatingGalleryItem = {
        id: `photo_${Date.now()}`,
        url: data.secure_url,
        aspect: "square",
        quote: "A quiet shadow, a tender waltz, and you by my side.",
        author: yourName.trim() || "My Love",
      };

      setGalleryItems((prev) => [newItem, ...prev]);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Error uploading image.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateItemAspect = (id: string, aspect: "tall" | "wide" | "square" | "circle" | "badge") => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, aspect } : item)));
  };

  const handleUpdateItemQuote = (id: string, quote: string) => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, quote } : item)));
  };

  const handleUpdateItemAuthor = (id: string, author: string) => {
    setGalleryItems((prev) => prev.map((item) => (item.id === id ? { ...item, author } : item)));
  };

  const handleRemoveGalleryItem = (id: string) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaultGallery = () => {
    setGalleryItems(DEFAULT_HAUNTED_WALTZ_GALLERY_ITEMS);
  };

  // Assemble template tools configuration payload
  const buildToolsPayload = (): TemplateTool[] => {
    const tools: TemplateTool[] = [];

    // 1. T01: Reply Tool
    if (replyToolEnabled) {
      tools.push({
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: `Leave a midnight note or whisper for ${yourName.trim() || "me"}...`,
        enabledFormats: {
          text: true,
          photo: replyAllowPhoto,
          voice: replyAllowVoice,
        },
        maxChars: 2000,
        maxPhotos: 3,
        maxVoiceSeconds: 60,
        allowMultiple: true,
        quickReactions: ["🕯️", "👻", "✨", "🖤", "🌙"],
      });
    }

    // 2 & 3. T02 & T03: Date Invitation & Location
    if (dateToolEnabled) {
      tools.push({
        id: "invitation_t02",
        type: "invitation",
        enabled: true,
        activity: "The Haunted Waltz",
        invitationMessage: HAUNTED_WALTZ_CONFIG.finalQuestion,
        format: locationToolEnabled ? dateFormat : "in_person",
        location: locationToolEnabled ? dateLocation.trim() || "Under the Grand Manor Chandelier" : undefined,
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
        question: pollQuestion.trim() || "What eerie adventure should we take next?",
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
        title: "A Midnight Whisper For You",
        description: "Share your secret thoughts with me.",
        questions: [
          {
            id: "q_waltz_1",
            prompt: questionPrompt.trim() || "If we were ghosts, where would our favorite haunt in the world be?",
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
        prompt: revealPrompt.trim() || "A gothic confession waiting to be unlocked together in the dark...",
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
        coverTitle: scratchTitle.trim() || "A gothic surprise for my midnight waltz partner 🕯️",
        coverInstruction: "Scratch with your finger or mouse to reveal",
        contentType: "message",
        hiddenMessage: scratchSecret.trim() || "Even if eternity ended, I would still search every shadow to find you. Forever my favorite soul.",
      });
    }

    // 8. T08: Sweet Love Coupon
    if (couponToolEnabled) {
      tools.push({
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title: couponTitle.trim() || "One Midnight Candlelit Dance & Warm Cider",
        description: couponDesc.trim() || "Redeemable whenever you want to escape the world and dance in the shadows together.",
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
        description: "A letter for when the night feels dark.",
        attachReply: true,
        envelopes: [
          {
            id: "env_waltz_1",
            occasion: openWhenOccasion.trim() || "Open when the night feels quiet and dark",
            message: openWhenLetter.trim() || "Hold my hand in your thoughts. As long as we have each other, no darkness can ever haunt us.",
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
        title: "Our Gothic Chapter",
        description: "Memories that echo through time",
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
        title: "Our Spooky Bucket List",
        description: "Adventures we will share together in this lifetime",
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
        title: galleryTitle.trim() || "The Haunted Waltz Gallery",
        subtitle: gallerySubtitle.trim() || "Gothic moments & whispers captured in time 🕯️",
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
        theme: "spooky-the-haunted-waltz",
        scene_index: 0,
        partner_name: partnerName.trim(),
        partner_from: yourName.trim(),
        message: personalMessage.trim() || HAUNTED_WALTZ_CONFIG.defaultMessage,
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
      className="min-h-screen text-[#EDF1ED] selection:bg-[#90C9C6] selection:text-[#0B1015]"
      style={{ backgroundColor: HAUNTED_WALTZ_PALETTE.background }}
    >
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-4 pt-6"><PurchaseDetails productSlug="spooky-the-haunted-waltz" /></div>

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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#152026] border border-[#2E414A] text-xs font-bold text-[#90C9C6] hover:bg-[#172B31] transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Templates</span>
          </Link>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#90C9C6] flex items-center justify-center gap-1.5">
              <Ghost className="w-3.5 h-3.5 text-[#90C9C6]" />
              <span>Gothic 2D Romantic Art &amp; Cinematic Experience</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-mystical-horror text-[#EDF1ED] tracking-wide mt-1 drop-shadow-[0_4px_25px_rgba(144,201,198,0.4)]">
              Create &quot;The Haunted Waltz&quot;
            </h1>
            <p className="text-xs sm:text-sm text-[#B8C6CE] font-medium mt-1">
              {HAUNTED_WALTZ_CONFIG.tagline} • 6-scene storybook art with interactive RSVP
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
                      ? "bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] shadow-xs"
                      : idx < step
                      ? "bg-[#172B31] text-[#EDF1ED] cursor-pointer"
                      : "bg-[#152026]/60 text-[#8B9DA6]/60"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                    {s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 4 && <span className="text-[#2E414A] text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            STEP 0: COUPLE & STORY
        ───────────────────────────────────────────── */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Story Filmstrip Preview */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#152026] border border-[#2E414A] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#EDF1ED] flex items-center gap-2">
                    <Ghost className="w-4 h-4 text-[#90C9C6]" />
                    <span>Included 6-Scene Story Flow</span>
                  </h3>
                  <p className="text-xs text-[#B8C6CE]">
                    Your partner will watch this 27.5-second gothic adventure unfold.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#0B1015] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#90C9C6] to-[#FFCC99]">
                  Fixed 16:9 2D Art
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {HAUNTED_WALTZ_SCENES.map((scene) => (
                  <div key={scene.order} className="space-y-1">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#2E414A] bg-[#0B1015]">
                      <Image
                        src={scene.file}
                        alt={scene.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[#90C9C6] text-[9px] font-bold">
                        #{scene.order}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-[#EDF1ED] truncate">
                      {scene.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Couple Names & Story Inputs */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#152026] border border-[#2E414A] shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#90C9C6] flex items-center gap-1.5">
                    <span>Partner&#39;s Name</span>
                    <span className="text-[#90C9C6]">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="E.g. Emily, Alex..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs font-semibold text-[#EDF1ED] placeholder:text-[#8B9DA6] focus:outline-none focus:border-[#90C9C6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#90C9C6] flex items-center gap-1.5">
                    <span>Your Name</span>
                    <span className="text-[#90C9C6]">*</span>
                  </label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="E.g. Marsad, Jordan..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs font-semibold text-[#EDF1ED] placeholder:text-[#8B9DA6] focus:outline-none focus:border-[#90C9C6]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#90C9C6] flex items-center gap-1.5">
                  <span>Opening Tagline</span>
                  <span className="text-[11px] text-[#8B9DA6] font-normal">(Shown in intro)</span>
                </label>
                <input
                  type="text"
                  value={openingTagline}
                  onChange={(e) => setOpeningTagline(e.target.value)}
                  placeholder="Hold my hand. Let’s see what’s waiting."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs font-semibold text-[#EDF1ED] placeholder:text-[#8B9DA6] focus:outline-none focus:border-[#90C9C6]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#90C9C6] flex items-center gap-1.5">
                  <span>Romantic Message</span>
                  <span className="text-[11px] text-[#8B9DA6] font-normal">
                    (Revealed during scene 4 &amp; 5 as you enter the ballroom waltz)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Whatever waits in the dark, I want you beside me..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] placeholder:text-[#8B9DA6] leading-relaxed focus:outline-none focus:border-[#90C9C6]"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-[#0B1015] border border-[#2E414A] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#90C9C6]">
                  <span>Live Preview: Scene 4/5 Note Overlay</span>
                  <span>Scene 4 &amp; 5</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#152026] border border-[#90C9C6]/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#90C9C6]">
                    <Heart className="w-3 h-3 fill-[#90C9C6] text-[#90C9C6]" />
                    <span>Note From {yourName || "You"}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#EDF1ED] leading-snug">
                    &ldquo;{personalMessage || HAUNTED_WALTZ_CONFIG.defaultMessage}&rdquo;
                  </p>
                </div>
              </div>

              {/* Navigation button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!partnerName.trim() || !yourName.trim()}
                  className="px-7 py-3 rounded-full text-[#0B1015] font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99]"
                >
                  <span>Continue to Tools Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 1: TOOLS SELECTION (ROW OF 3 TOOLS GRID)
        ───────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-2xl bg-[#152026] border border-[#2E414A] text-center space-y-1">
              <h3 className="text-base font-bold text-[#EDF1ED]">
                Select Interactive Tools for {partnerName}
              </h3>
              <p className="text-xs text-[#B8C6CE] max-w-lg mx-auto">
                Toggle whichever moments you want included. Everything is pre-configured with sweet gothic defaults so you can launch instantly without stress.
              </p>
            </div>

            {/* Tools Grid: 3 in a row on desktop (lg:grid-cols-3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Voice & Photo Notes */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  replyToolEnabled
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        💌
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      1. Voice &amp; Photo Notes
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Lets {partnerName || "your partner"} record voice memos, send selfies, and react with gothic emojis privately.
                    </p>
                  </div>

                  {replyToolEnabled && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[#2E414A] text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#EDF1ED] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowVoice}
                          onChange={(e) => setReplyAllowVoice(e.target.checked)}
                          className="accent-[#90C9C6]"
                        />
                        <span>🎙️ Voice Notes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#EDF1ED] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowPhoto}
                          onChange={(e) => setReplyAllowPhoto(e.target.checked)}
                          className="accent-[#90C9C6]"
                        />
                        <span>📸 Photo Uploads</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 2: The Haunted Waltz Date & RSVP */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  dateToolEnabled
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        🕯️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      2. Spooky Date &amp; RSVP
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Invites {partnerName || "your partner"} to choose your next spooky night adventure &amp; time. Their RSVP arrives in your dashboard.
                    </p>
                  </div>

                  {dateToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div className="text-[11px] font-bold text-[#90C9C6]">
                        Proposed Time Slots:
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED]"
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
                          placeholder="Add slot (e.g. Midnight, 11:30 PM)..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="px-3 py-1.5 rounded-xl bg-[#90C9C6] text-[#0B1015] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        📍
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      3. Date Venue &amp; Format
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Set whether your date is in-person (haunted manor, historic castle) or online (FaceTime movie party) and the venue name.
                    </p>
                  </div>

                  {locationToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-1">
                          Date Format:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDateFormat("in_person")}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dateFormat === "in_person"
                                ? "bg-[#90C9C6] text-[#0B1015] shadow-2xs"
                                : "bg-[#0B1015] border border-[#2E414A] text-[#EDF1ED]"
                            }`}
                          >
                            🏡 In-Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setDateFormat("online")}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dateFormat === "online"
                                ? "bg-[#90C9C6] text-[#0B1015] shadow-2xs"
                                : "bg-[#0B1015] border border-[#2E414A] text-[#EDF1ED]"
                            }`}
                          >
                            💻 Online Date
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Venue or Meeting Spot:
                        </label>
                        <input
                          type="text"
                          value={dateLocation}
                          onChange={(e) => setDateLocation(e.target.value)}
                          placeholder="E.g. Under the Grand Manor Chandelier..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        📊
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      4. Vibe Check &amp; Poll
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Set up a poll so {partnerName || "your partner"} can vote on midnight treats, mystery movies, or gothic adventures.
                    </p>
                  </div>

                  {pollToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Poll Question:
                        </label>
                        <input
                          type="text"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder="What eerie adventure sounds sweetest?..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                      </div>

                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {pollOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED]"
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
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="px-3 py-1.5 rounded-xl bg-[#90C9C6] text-[#0B1015] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        💭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      5. Heart-to-Heart Q&amp;A
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Ask an intimate question that {partnerName || "your partner"} answers before continuing through the story scenes.
                    </p>
                  </div>

                  {questionToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#2E414A]">
                      <label className="text-[11px] font-bold text-[#90C9C6] block">
                        Your Question:
                      </label>
                      <input
                        type="text"
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="If we were ghosts, where would our haunt be?..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 6: Synchronized Secret Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  revealToolEnabled
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        🔒
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      6. Synchronized Secret
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      A locked confession or surprise note with a countdown that only unlocks when both of you open it together.
                    </p>
                  </div>

                  {revealToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#2E414A]">
                      <label className="text-[11px] font-bold text-[#90C9C6] block">
                        Confession / Secret Note:
                      </label>
                      <input
                        type="text"
                        value={revealPrompt}
                        onChange={(e) => setRevealPrompt(e.target.value)}
                        placeholder="A gothic confession that unlocks together..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 7: Scratch Card Surprise */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  scratchToolEnabled
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        🪄
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      7. Scratch-to-Reveal Card
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Foil-covered secret card that {partnerName || "your partner"} scratches off with their finger or cursor.
                    </p>
                  </div>

                  {scratchToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Card Cover Title:
                        </label>
                        <input
                          type="text"
                          value={scratchTitle}
                          onChange={(e) => setScratchTitle(e.target.value)}
                          placeholder="A gothic surprise for you..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Hidden Secret:
                        </label>
                        <input
                          type="text"
                          value={scratchSecret}
                          onChange={(e) => setScratchSecret(e.target.value)}
                          placeholder="Hidden secret message..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 8: Sweet Love Coupon Voucher */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  couponToolEnabled
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        🎟️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
                        Perk Voucher
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponToolEnabled}
                        onChange={(e) => setCouponToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      8. Love Coupon Voucher
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      A sweet romantic voucher {partnerName || "your partner"} can click to claim and redeem with you anytime.
                    </p>
                  </div>

                  {couponToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Coupon Title:
                        </label>
                        <input
                          type="text"
                          value={couponTitle}
                          onChange={(e) => setCouponTitle(e.target.value)}
                          placeholder="One Midnight Candlelit Dance..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Description &amp; Terms:
                        </label>
                        <input
                          type="text"
                          value={couponDesc}
                          onChange={(e) => setCouponDesc(e.target.value)}
                          placeholder="Redeemable whenever you need warmth..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        ✉️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
                        Intimacy
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openWhenEnabled}
                        onChange={(e) => setOpenWhenEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      9. Open When Letter
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      A wax-sealed envelope waiting to be clicked and unsealed during a specific romantic moment.
                    </p>
                  </div>

                  {openWhenEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Open When Condition:
                        </label>
                        <input
                          type="text"
                          value={openWhenOccasion}
                          onChange={(e) => setOpenWhenOccasion(e.target.value)}
                          placeholder="Open when the night feels quiet and dark..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#90C9C6] block mb-0.5">
                          Enclosed Letter:
                        </label>
                        <textarea
                          rows={2}
                          value={openWhenLetter}
                          onChange={(e) => setOpenWhenLetter(e.target.value)}
                          placeholder="Your sealed letter text..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        📖
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
                        Memory Timeline
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ourStoryEnabled}
                        onChange={(e) => setOurStoryEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      10. Our Story Memories
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      A sweet chronological photo timeline of your relationship milestones and favorite moments together.
                    </p>
                  </div>

                  {ourStoryEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div className="text-[11px] font-bold text-[#90C9C6]">
                        Illustrated Milestones Included:
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {storyCards.map((c, i) => (
                          <div
                            key={i}
                            className="p-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] flex items-center gap-2"
                          >
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#2E414A]">
                              <Image
                                src={c.photo_url}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-bold text-[#90C9C6] block">
                                #{i + 1} Milestone
                              </span>
                              <input
                                type="text"
                                value={c.caption}
                                onChange={(e) => handleUpdateStoryCaption(i, e.target.value)}
                                className="w-full px-1.5 py-0.5 rounded bg-[#152026] border border-[#2E414A] text-[10px] text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6] truncate"
                              />
                            </div>
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
                    ? "bg-[#152026] border-[#90C9C6] shadow-sm shadow-[#90C9C6]/15"
                    : "bg-[#0B1015]/70 border-[#2E414A] opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#172B31] flex items-center justify-center text-lg shadow-2xs">
                        🧭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#172B31] text-[10px] font-bold text-[#90C9C6]">
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
                      <div className="w-10 h-5 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#EDF1ED]">
                      11. Spooky Bucket List
                    </h4>
                    <p className="text-xs text-[#B8C6CE] mt-1 leading-snug">
                      Bucket-list adventures you two can check off together over the season.
                    </p>
                  </div>

                  {bucketListEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#2E414A]">
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bucketItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED]"
                          >
                            <span className="truncate">{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBucketItem(idx)}
                              className="text-rose-400 hover:text-rose-300 p-0.5 shrink-0"
                              title="Delete item"
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
                          placeholder="New bucket adventure..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                        />
                        <button
                          type="button"
                          onClick={handleAddBucketItem}
                          className="px-3 py-1.5 rounded-xl bg-[#90C9C6] text-[#0B1015] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-5 py-2.5 rounded-full bg-[#152026] border border-[#2E414A] text-xs font-bold text-[#B8C6CE] hover:text-[#EDF1ED] cursor-pointer"
              >
                ← Back to Names
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-7 py-3 rounded-full text-[#0B1015] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99]"
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
            className="p-6 sm:p-8 rounded-3xl bg-[#152026] border border-[#2E414A] shadow-sm space-y-6"
          >
            {/* Header + Master Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2E414A]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#172B31] text-[#90C9C6]">
                    Floating Mosaic Wall
                  </span>
                  <span className="text-xs text-[#B8C6CE] font-semibold">Hover Quotes • Zero-Gravity</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#EDF1ED] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#90C9C6]" />
                  <span>Floating Photo &amp; Quote Gallery</span>
                </h3>
                <p className="text-xs text-[#B8C6CE]">
                  Display an organic floating mosaic of your memories. When your partner hovers or taps each photo, a romantic gothic quote will appear on top ✨
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-[#EDF1ED]">
                  {floatingGalleryEnabled ? "Enabled" : "Disabled"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={floatingGalleryEnabled}
                    onChange={(e) => setFloatingGalleryEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2E414A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#90C9C6]"></div>
                </label>
              </div>
            </div>

            {floatingGalleryEnabled && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#90C9C6]">Gallery Title</label>
                    <input
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="The Haunted Waltz Gallery"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs font-semibold text-[#EDF1ED] focus:border-[#90C9C6] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#90C9C6]">Gallery Subtitle / Prompt</label>
                    <input
                      type="text"
                      value={gallerySubtitle}
                      onChange={(e) => setGallerySubtitle(e.target.value)}
                      placeholder="Hover over each memory to reveal the secret quote inside my heart ✨"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#0B1015] border border-[#2E414A] text-xs font-semibold text-[#EDF1ED] focus:border-[#90C9C6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload & Reset Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="px-4 py-2.5 rounded-2xl bg-[#172B31] hover:bg-[#1C363E] border border-[#90C9C6]/40 text-xs font-bold text-[#EDF1ED] flex items-center gap-2 cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-[#90C9C6]" />
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
                    className="text-xs font-semibold text-[#90C9C6] hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to 8 Default Couple Quotes</span>
                  </button>
                </div>

                {uploadError && <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>}

                {/* Items Editor Grid */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#90C9C6]">
                    Gallery Items ({galleryItems.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {galleryItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#0B1015] border border-[#2E414A] flex gap-3 items-start group hover:border-[#90C9C6]/60 transition-all"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-[#2E414A] bg-[#152026]">
                          <Image
                            src={item.url}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#90C9C6]">
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
                                className="px-2 py-0.5 rounded bg-[#152026] border border-[#2E414A] text-[10px] text-[#90C9C6] font-bold focus:outline-none"
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
                                className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer transition-colors"
                                title="Remove photo"
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
                            className="w-full px-2 py-1 rounded-lg bg-[#152026] border border-[#2E414A] text-[11px] text-[#EDF1ED] focus:border-[#90C9C6] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.author || ""}
                            onChange={(e) => handleUpdateItemAuthor(item.id, e.target.value)}
                            placeholder="Author/Caption..."
                            className="w-full px-2 py-1 rounded-lg bg-[#152026] border border-[#2E414A] text-[10px] text-[#B8C6CE] focus:border-[#90C9C6] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="pt-4 border-t border-[#2E414A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#EDF1ED] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#90C9C6]" />
                      <span>Live Interactive Floating Collage Wall Preview</span>
                    </span>
                    <span className="text-[11px] text-[#FFCC99] font-semibold">
                      Hover over any card below to see your quote reveal!
                    </span>
                  </div>

                  <div className="rounded-3xl border border-[#2E414A] bg-[#0B1015] p-4 overflow-hidden">
                    <FloatingQuoteGallery
                      title={galleryTitle}
                      subtitle={gallerySubtitle}
                      items={galleryItems}
                      accentColor={HAUNTED_WALTZ_PALETTE.accent}
                      theme="haunted-waltz"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#2E414A]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-[#152026] border border-[#2E414A] text-xs font-bold text-[#B8C6CE] hover:text-[#EDF1ED] hover:bg-[#172B31] cursor-pointer transition-all"
              >
                ← Back to Tools Selection
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-7 py-3 rounded-full text-[#0B1015] font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99]"
              >
                <span>Continue to Music &amp; Expiry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 3: ROMANTIC SOUNDTRACK & EXPIRY
        ───────────────────────────────────────────── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#152026] border border-[#2E414A] shadow-sm space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#EDF1ED]">
                Romantic Soundtrack &amp; Expiry
              </h3>
              <p className="text-xs text-[#B8C6CE]">
                Pick an atmospheric gothic waltz or ambient melody that plays when {partnerName || "your partner"} begins the experience.
              </p>
            </div>

            {/* Selected Track Banner & Timestamp Picker */}
            {selectedTrack && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#0B1015] border-2 border-[#90C9C6] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTrack.thumbnailUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-[#2E414A] shadow-2xs">
                        <Image
                          src={selectedTrack.thumbnailUrl}
                          alt={selectedTrack.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#172B31] flex items-center justify-center text-xl shrink-0 border border-[#2E414A]">
                        🕯️
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#90C9C6] uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Active Soundtrack</span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#EDF1ED] truncate">
                        {selectedTrack.title}
                      </h4>
                      <p className="text-[11px] text-[#8B9DA6] truncate">
                        {selectedTrack.artist} • {selectedTrack.type === "youtube" ? "YouTube Audio" : "Haunted Waltz Library"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSelectedPreview}
                      className="px-3.5 py-1.5 rounded-full bg-[#152026] text-[#90C9C6] text-xs font-bold border border-[#90C9C6]/50 shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {previewTrackId === selectedTrack.id || (selectedTrack.type === "youtube" && isYtTesting) ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-[#90C9C6]" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#90C9C6]" />
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
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black/90 border border-[#2E414A] shadow-md relative">
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
                <div className="p-4 rounded-2xl bg-[#152026] border border-[#2E414A] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#EDF1ED]">
                      <Clock className="w-3.5 h-3.5 text-[#90C9C6]" />
                      <span>Start song playback from:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0B1015] text-[#90C9C6] font-mono font-bold text-xs">
                        {formatTime(trackStartAt)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8B9DA6]">
                      Total length: {formatTime(selectedTrack.duration || 300)}
                    </span>
                  </div>

                  {/* Interactive Waveform Visualizer & Scrubber */}
                  {selectedTrack.waveform && selectedTrack.waveform.length > 0 && (
                    <div
                      className="relative h-12 rounded-xl bg-[#0B1015] border border-[#2E414A] overflow-hidden cursor-pointer select-none"
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
                                backgroundColor: isPastStart ? "#90C9C6" : "#2E414A",
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
                          backgroundColor: "#90C9C6",
                          boxShadow: "0 0 8px rgba(144, 201, 198, 0.6)",
                        }}
                      >
                        <div className="absolute -top-1 -left-2 px-1.5 py-0.5 rounded-full bg-[#90C9C6] text-[#0B1015] text-[9px] font-bold shadow-xs whitespace-nowrap">
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
                    className="w-full accent-[#90C9C6] h-1.5 rounded-lg cursor-pointer bg-[#2E414A]"
                  />

                  {/* Exact MM:SS & Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#B8C6CE]">
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#0B1015] border border-[#2E414A] font-bold text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                          placeholder="00"
                        />
                        <span className="font-bold text-[#90C9C6]">:</span>
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#0B1015] border border-[#2E414A] font-bold text-[#EDF1ED] focus:outline-none focus:border-[#90C9C6]"
                          placeholder="00"
                        />
                        <span className="text-[10px] text-[#8B9DA6]">(mm:ss)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#8B9DA6]">Presets:</span>
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
                                ? "bg-[#90C9C6] text-[#0B1015] shadow-2xs"
                                : "bg-[#0B1015] text-[#B8C6CE] border border-[#2E414A] hover:bg-[#172B31]"
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

            {/* Tab switch: Curated Library vs YouTube */}
            <div className="flex gap-2 p-1 bg-[#0B1015] rounded-2xl border border-[#2E414A] max-w-xs">
              <button
                type="button"
                onClick={() => setMusicTab("catalog")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "catalog"
                    ? "bg-[#90C9C6] text-[#0B1015] shadow-xs"
                    : "text-[#B8C6CE] hover:bg-[#152026]"
                }`}
              >
                🕯️ Gothic Library
              </button>
              <button
                type="button"
                onClick={() => setMusicTab("youtube")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "youtube"
                    ? "bg-[#90C9C6] text-[#0B1015] shadow-xs"
                    : "text-[#B8C6CE] hover:bg-[#152026]"
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
                  {GOTHIC_MUSIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        void fetchMusic(cat.query);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] shadow-xs"
                          : "bg-[#0B1015] border border-[#2E414A] text-[#B8C6CE] hover:bg-[#172B31]"
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
                    placeholder="Search tracks by keyword (e.g. waltz, moonlight, cello, ambient, piano)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] placeholder:text-[#8B9DA6]/60 focus:outline-none focus:border-[#90C9C6]"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchMusic(musicSearchQuery)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Loading indicator */}
                {loadingMusic ? (
                  <div className="p-8 text-center text-xs font-bold text-[#90C9C6] animate-pulse flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#90C9C6] border-t-transparent animate-spin" />
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
                              ? "bg-[#172B31] border-[#90C9C6] shadow-md shadow-[#90C9C6]/20"
                              : "bg-[#0B1015] border-[#2E414A] hover:border-[#90C9C6]/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {thumb ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-[#2E414A]">
                                <Image
                                  src={thumb}
                                  alt={t.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#152026] flex items-center justify-center text-base shrink-0 border border-[#2E414A]">
                                🕯️
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-[#EDF1ED] truncate">
                                {t.title}
                              </h5>
                              <p className="text-[11px] text-[#8B9DA6] truncate">
                                {artist} • {formatTime(t.duration)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePreviewMusic(t)}
                              className="w-8 h-8 rounded-full bg-[#152026] hover:bg-[#1C363E] text-[#90C9C6] flex items-center justify-center transition-all cursor-pointer"
                              title="Preview Track"
                            >
                              {isThisPreviewing ? (
                                <Pause className="w-3.5 h-3.5 fill-[#90C9C6]" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-[#90C9C6]" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectTrack(t)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#90C9C6] text-[#0B1015] shadow-xs"
                                  : "bg-[#152026] text-[#B8C6CE] border border-[#2E414A] hover:text-[#EDF1ED]"
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

            {/* Tab Content: YouTube Custom Link */}
            {musicTab === "youtube" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube video or music URL (e.g. https://www.youtube.com/watch?v=...)"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#0B1015] border border-[#2E414A] text-xs text-[#EDF1ED] placeholder:text-[#8B9DA6]/60 focus:outline-none focus:border-[#90C9C6]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyYoutube}
                    disabled={youtubeLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] text-xs font-bold hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    {youtubeLoading ? "Checking..." : "Attach"}
                  </button>
                </div>
                {youtubeError && (
                  <p className="text-xs text-rose-400 font-semibold">{youtubeError}</p>
                )}
                <p className="text-[11px] text-[#8B9DA6]">
                  Paste any public YouTube link. Our system extracts the audio track and embeds seamless background playback.
                </p>
              </div>
            )}

            <PurchaseDetails productSlug="spooky-the-haunted-waltz" />

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#2E414A]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-full bg-[#0B1015] border border-[#2E414A] text-xs font-bold text-[#B8C6CE] hover:bg-[#172B31] cursor-pointer"
              >
                ← Back to Gallery
              </button>

              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-8 py-3 rounded-full text-[#0B1015] font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99]"
              >
                <Ghost className="w-4 h-4 fill-[#0B1015]" />
                <span>{isCreating ? "Forging Your Haunted Waltz..." : "Create Haunted Waltz Story 🕯️"}</span>
              </button>
            </div>

            {creationError && (
              <p className="text-xs text-rose-400 font-semibold text-center">{creationError}</p>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 4: SHARE LINK & COMPLETION
        ───────────────────────────────────────────── */}
        {step === 4 && generatedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#152026] border border-[#90C9C6]/40 shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#172B31] border border-[#90C9C6] flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(144,201,198,0.3)]">
              🕯️
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#90C9C6]">
                Your Adventure is Ready
              </span>
              <h2 className="text-2xl sm:text-4xl font-mystical-horror text-[#EDF1ED]">
                &quot;The Haunted Waltz&quot; is Live!
              </h2>
              <p className="text-xs text-[#B8C6CE]">
                Send this private secret link to {partnerName}. When they open it, their midnight waltz experience begins.
              </p>
            </div>

            {/* Short Code & Link Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1015] border border-[#2E414A] space-y-3 max-w-lg mx-auto text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#90C9C6]">Shareable Story Link:</span>
                <span className="font-mono text-[11px] text-[#8B9DA6]">Code: {generatedCode}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#152026] border border-[#2E414A] text-xs font-mono text-[#EDF1ED] truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95 transition-all"
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
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#90C9C6] via-[#A4DAD7] to-[#FFCC99] text-[#0B1015] font-bold text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open &amp; Test Story</span>
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `I created a Haunted Waltz just for us: ${generatedUrl} 🕯️🖤`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#0B1015] border border-[#2E414A] text-xs font-bold text-[#EDF1ED] hover:bg-[#172B31] flex items-center gap-2 transition-all"
              >
                <span>Share via WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `A midnight haunted waltz, just for us 🕯️✨ ${generatedUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#0B1015] border border-[#2E414A] text-xs font-bold text-[#EDF1ED] hover:bg-[#172B31] flex items-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-[#90C9C6]" />
                <span>Share on X</span>
              </a>
            </div>

            {/* Manage Link Card */}
            {generatedManageUrl && (
              <div className="p-4 rounded-2xl bg-[#0B1015] border border-[#2E414A] max-w-lg mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#90C9C6]">Your Secret Creator Management Link:</span>
                  <span className="text-[10px] text-[#8B9DA6]">Private to you</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedManageUrl}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#152026] border border-[#2E414A] text-[11px] font-mono text-[#B8C6CE] truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyManageLink}
                    className="px-3 py-1.5 rounded-xl bg-[#172B31] hover:bg-[#1C363E] text-xs font-bold text-[#90C9C6] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedManage ? <Check className="w-3 h-3 text-[#90C9C6]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedManage ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#8B9DA6]">
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
