"use client";

import { SenderAnswerField, SenderPollChoices } from "@/components/tools/SenderSetupFields";
import VenueEditor from "@/components/tools/VenueEditor";
import { buildVenue } from "@/lib/template-venue";
import DateSlotEditor from "@/components/tools/DateSlotEditor";
import type { InvitationSlot } from "@/lib/supabase/coupleTemplates";
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
  HelpCircle,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Share2,
  Smartphone,
  ShieldCheck,
  Sliders,
  MapPin,
  BarChart2,
  Wand2,
  BookOpen,
  Compass,
  Upload,
  Quote as QuoteIcon,
  ImageIcon,
  Moon,
  RotateCcw,
} from "lucide-react";
import {
  STARLIT_STORY_SCENES,
  STARLIT_STORY_CONFIG,
  STARLIT_STORY_PALETTE,
  DEFAULT_STARLIT_STORY_GALLERY_ITEMS,
} from "@/lib/constants/starlitStoryTemplate";
import {
  FloatingQuoteGallery,
  type FloatingGalleryItem,
} from "@/components/templates/FloatingQuoteGallery";
import type { MusicTrack, TemplateTool } from "@/lib/supabase/coupleTemplates";
import type { FreeTouseTrack } from "@/lib/freetouse";
import { artistName } from "@/lib/freetouse";
import { CURATED_TRACKS } from "@/lib/curatedTracks";
import StoreHeader from "@/components/storefront/StoreHeader";
import PurchaseDetails from "@/components/commerce/PurchaseDetails";
import {publishTemplate} from "@/lib/publish-template";

const STARLIT_MUSIC_CATEGORIES = [
  { id: "celestial", label: "✨ Starlit Night", query: "ambient" },
  { id: "fairytale", label: "🎻 Fairytale Romance", query: "classical" },
  { id: "romantic", label: "💕 Warm Romance", query: "romantic" },
  { id: "piano", label: "🎹 Midnight Piano", query: "piano" },
  { id: "lofi", label: "☕ Cozy Twilight Lofi", query: "lofi" },
  { id: "acoustic", label: "🎸 Acoustic Dusk", query: "guitar" },
];

export default function StarlitStoryStudio() {
  const [step, setStep] = useState(0); // 0 = Story & Names, 1 = Tools Selection, 2 = Floating Gallery, 3 = Soundtrack & Expiry, 4 = Share

  // Step 1: Couple & Message
  const [partnerName, setPartnerName] = useState("");
  const [yourName, setYourName] = useState("");
  const [openingTagline, setOpeningTagline] = useState(
    STARLIT_STORY_CONFIG.defaultOpening
  );
  const [personalMessage, setPersonalMessage] = useState(
    STARLIT_STORY_CONFIG.defaultMessage
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
  const [dateSlots, setDateSlots] = useState<InvitationSlot[]>([]);

  // 3. T03 Date Location & Venue Map
  const [locationToolEnabled, setLocationToolEnabled] = useState(false);
  const [dateFormat, setDateFormat] = useState<"in_person" | "online">("in_person");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [reservationUrl, setReservationUrl] = useState("");
  const [dateLocation, setDateLocation] = useState(
    "Rooftop Terrace Under Fairy Lights"
  );

  // 4. T04 Vibe Check & Choice Polls
  const [pollToolEnabled, setPollToolEnabled] = useState(false);
  const [senderPollChoices,setSenderPollChoices]=useState<string[]>([]);
  const [senderQuestionAnswer,setSenderQuestionAnswer]=useState("");
  const [senderSecretAnswer,setSenderSecretAnswer]=useState("");
  const [pollQuestion, setPollQuestion] = useState(
    "What should we do on our next evening together?"
  );
  const [pollOptions, setPollOptions] = useState([
    "Rooftop dinner with glowing fairy lights",
    "Stargazing with warm blankets and acoustic music",
    "Late night scenic drive overlooking the city lights",
  ]);
  const [newPollOption, setNewPollOption] = useState("");

  // 5. T05 Heart-to-Heart Question Prompt
  const [questionToolEnabled, setQuestionToolEnabled] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState(
    "When you look up at the stars, what is the first wish that comes to your mind?"
  );

  // 6. T06 Synchronized Secret Reveal
  const [revealToolEnabled, setRevealToolEnabled] = useState(false);
  const [revealPrompt, setRevealPrompt] = useState(
    "A starlit secret waiting to be unlocked together under one sky..."
  );

  // 7. T07 Scratch-to-Reveal Card
  const [scratchToolEnabled, setScratchToolEnabled] = useState(false);
  const [scratchTitle, setScratchTitle] = useState(
    "A starlit surprise for my favorite person ✨"
  );
  const [scratchSecret, setScratchSecret] = useState(
    "Out of billions of stars across the universe, my eyes and my heart will always choose you. Forever my brightest light."
  );

  // 8. T08 Sweet Love Coupon Voucher
  const [couponToolEnabled, setCouponToolEnabled] = useState(false);
  const [couponTitle, setCouponTitle] = useState(
    "One Cozy Stargazing Night & Rooftop Dinner"
  );
  const [couponDesc, setCouponDesc] = useState(
    "Redeemable anytime you want warm blankets, sweet whispers, and all my undivided attention under the stars."
  );

  // 9. T09 Open When Sealed Letter
  const [openWhenEnabled, setOpenWhenEnabled] = useState(false);
  const [openWhenOccasion, setOpenWhenOccasion] = useState(
    "Open when you miss me or feel alone at night"
  );
  const [openWhenLetter, setOpenWhenLetter] = useState(
    "Look up at the night sky. We are both living beneath the very same stars, and my heart is always holding yours tight."
  );

  // 10. T10 Our Story Timeline Memories
  const [ourStoryEnabled, setOurStoryEnabled] = useState(false);
  const [storyCards, setStoryCards] = useState([
    {
      photo_url: "/templates/starlit-story/01-the-meeting.png",
      caption: "Where it began — stepping into the rooftop garden.",
    },
    {
      photo_url: "/templates/starlit-story/02-a-rose-for-you.png",
      caption: "A single pink rose to see your face light up with a smile.",
    },
    {
      photo_url: "/templates/starlit-story/06-our-evening-together.png",
      caption: "Side by side under the fairy lights and starry sky.",
    },
  ]);

  // 11. T11 Couple Bucket List
  const [bucketListEnabled, setBucketListEnabled] = useState(false);
  const [bucketItems, setBucketItems] = useState([
    "Watch the sunset from our favorite rooftop spot",
    "Midnight stargazing picnic with hot tea and blankets",
    "Spontaneous late night drive overlooking the city skyline",
  ]);
  const [newBucketItem, setNewBucketItem] = useState("");

  // Floating Photo & Quote Gallery State
  const [floatingGalleryEnabled, setFloatingGalleryEnabled] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("Our Starlit Memories & Whispers");
  const [gallerySubtitle, setGallerySubtitle] = useState(
    "Hover over each memory to reveal the secret quote inside my heart ✨"
  );
  const [galleryItems, setGalleryItems] = useState<FloatingGalleryItem[]>(
    DEFAULT_STARLIT_STORY_GALLERY_ITEMS
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 3: Music & Expiry
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [musicTab, setMusicTab] = useState<"catalog" | "youtube">("catalog");
  const [selectedCategory, setSelectedCategory] = useState("celestial");
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
    void fetchMusic("ambient");
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
      if (!res.ok)
        throw new Error(data?.error || "Could not load YouTube track.");
      const startSec = data.track?.startAt || 0;
      const track: MusicTrack = data.track || {
        id: `yt-${data.videoId}`,
        title: data.title || "YouTube Starlit Track",
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
          "Invalid YouTube link. Please check and try again."
      );
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleAddPollOption = () => {
    if (!newPollOption.trim()) return;
    setPollOptions((prev) => [...prev, newPollOption.trim()]);
    setNewPollOption("");
  };

  const handleRemovePollOption = (index: number) => {
    setSenderPollChoices([]);
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
        quote: "Beneath the starry sky, with you is where I belong.",
        author: yourName.trim() || "My Love",
      };

      setGalleryItems((prev) => [newItem, ...prev]);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Error uploading image.");
    } finally {
      setIsUploadingPhoto(false);
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
    setGalleryItems(DEFAULT_STARLIT_STORY_GALLERY_ITEMS);
  };

  // Compile all tools into valid payload
  const senderSetupError = pollToolEnabled && !senderPollChoices.some(id=>pollOptions.some((_,index)=>id===`opt_${index+1}`)) ? "Choose your own answer in Vibe Check & Poll." : questionToolEnabled && !senderQuestionAnswer.trim() ? "Write your answer in Heart-to-Heart Q&A." : revealToolEnabled && !senderSecretAnswer.trim() ? "Write your private answer in Synchronized Secret." : "";

  const buildToolsPayload = (): TemplateTool[] => {
    if(senderSetupError)throw new Error(senderSetupError);
    const tools: TemplateTool[] = [];
    const venue = locationToolEnabled ? buildVenue(dateFormat, dateLocation, meetingUrl, reservationUrl) : null;
    if (venue) tools.push(venue);

    // 1. T01: Reply Tool
    if (replyToolEnabled) {
      tools.push({
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: `Leave a starlit note or whisper for ${
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
        quickReactions: ["✨", "❤️", "🌹", "🌙", "🥰", "💌"],
      });
    }

    // 2 & 3. T02 & T03: Date Invitation & Location
    if (dateToolEnabled) {
      if (!dateSlots.length) throw new Error("Add at least one exact date in Date Night & RSVP, or turn that tool off.");
      tools.push({
        id: "invitation_t02",
        type: "invitation",
        enabled: true,
        activity: "Our Next Starlit Date",
        invitationMessage: STARLIT_STORY_CONFIG.finalQuestion,
        format: venue?.format || "in_person",
        location: venue?.location,
        meetingUrl: venue?.meetingUrl,
        reservationUrl: venue?.reservationUrl,
        dateMode: "slots",
        durationMinutes: 180,
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
          pollQuestion.trim() ||
          "What should we do on our next evening together?",
        description: "Vote for your dream evening together beneath the stars!",
        selectionMode: "both_vote",
        senderOptionIds: senderPollChoices,
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
        title: "A Starlit Question For You",
        description: "Share your heartfelt thoughts with me.",
        questions: [
          {
            id: "q_starlit_1",
            prompt:
              questionPrompt.trim() ||
              "When you look up at the stars, what is the first wish that comes to your mind?",
            type: "short",
            skippable: true,
            reveal_mode: "after_partner_answers",
            sender_answer: senderQuestionAnswer.trim(),
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
          "A starlit secret waiting to be unlocked together under one sky...",
        description: "Locked surprise unlocked together under the night sky.",
        countdownSeconds: 3,
        senderAnswers: {main:senderSecretAnswer.trim()},
      });
    }

    // 7. T07: Scratch-to-Reveal Card
    if (scratchToolEnabled) {
      tools.push({
        id: "scratch_t07",
        type: "scratch_reveal",
        enabled: true,
        coverTitle:
          scratchTitle.trim() ||
          "A starlit surprise for my favorite person ✨",
        coverInstruction: "Scratch with your finger or mouse to reveal",
        contentType: "message",
        hiddenMessage:
          scratchSecret.trim() ||
          "Out of billions of stars across the universe, my eyes and my heart will always choose you. Forever my brightest light.",
      });
    }

    // 8. T08: Sweet Love Coupon
    if (couponToolEnabled) {
      tools.push({
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title:
          couponTitle.trim() || "One Cozy Stargazing Night & Rooftop Dinner",
        description:
          couponDesc.trim() ||
          "Redeemable anytime you want warm blankets, sweet whispers, and all my undivided attention under the stars.",
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
        description: "A letter for when you need a hug or miss me.",
        attachReply: true,
        envelopes: [
          {
            id: "env_starlit_1",
            occasion:
              openWhenOccasion.trim() ||
              "Open when you miss me or feel alone at night",
            message:
              openWhenLetter.trim() ||
              "Look up at the night sky. We are both living beneath the very same stars, and my heart is always holding yours tight.",
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
        title: "Starlit Couple Bucket List",
        description:
          "Dream dates, adventures, and rooftop nights we will share together.",
        items: bucketItems.map((item, idx) => ({
          id: `b_item_${idx + 1}`,
          title: item.trim(),
          status: "wished" as const,
          created_by: "creator" as const,
        })),
      });
    }

    // 12. Floating Photo Gallery
    if (floatingGalleryEnabled && galleryItems.length > 0) {
      tools.push({
        id: "floating_gallery",
        type: "floating_gallery",
        enabled: true,
        title: galleryTitle.trim() || "Our Starlit Memories & Whispers",
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
      alert("Please fill in both your partner's name and your name.");
      setStep(0);
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      const toolsPayload = buildToolsPayload();

      const payload = {
        theme: "starlit-story",
        scene_index: 0,
        partner_name: partnerName.trim(),
        partner_from: yourName.trim(),
        message: personalMessage.trim() || STARLIT_STORY_CONFIG.defaultMessage,
        sender_gender: "male" as const,
        music_track: selectedTrack
          ? { ...selectedTrack, startAt: trackStartAt }
          : null,
        has_media: false,
        media_items: [],
        expiry_hours: expiryHours,
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
        (err as Error).message ||
          "An error occurred during template creation."
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
      className="min-h-screen text-[#3A231C] selection:bg-[#C26D7A] selection:text-white"
      style={{ backgroundColor: STARLIT_STORY_PALETTE.background }}
    >
      <StoreHeader />
      <div className="max-w-4xl mx-auto px-4 pt-6"><PurchaseDetails productSlug="starlit-story" /></div>

      <main id="main-content" className="max-w-4xl mx-auto scroll-mt-28 pt-5 pb-20 px-4 sm:px-6">
        {/* ─────────────────────────────────────────────
            HEADER & STEP INDICATOR
        ───────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#F0D5C9] text-xs font-bold text-[#C26D7A] hover:bg-[#FFF0EB] transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Templates</span>
          </Link>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#C26D7A] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D99443]" />
              <span>Contemporary 3D Fairytale Romance</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-starlit font-bold text-[#3A231C] tracking-tight mt-1">
              Create &quot;Starlit Story&quot;
            </h1>
            <p className="text-xs sm:text-sm text-[#75564C] font-medium mt-1">
              {STARLIT_STORY_CONFIG.tagline} • 6-scene rooftop garden date under fairy lights
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
                      ? "bg-[#C26D7A] text-white shadow-xs"
                      : idx < step
                      ? "bg-[#FFF0EB] text-[#C26D7A] cursor-pointer"
                      : "bg-white/60 text-[#75564C]/60"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 4 && <span className="text-[#F0D5C9] text-xs">→</span>}
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
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#F0D5C9] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#3A231C] flex items-center gap-2">
                    <Heart className="w-4 h-4 fill-[#C26D7A] text-[#C26D7A]" />
                    <span>Included 6-Scene Story Flow</span>
                  </h3>
                  <p className="text-xs text-[#75564C]">
                    Your partner will watch this 27.5-second rooftop date unfold.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#C26D7A] px-2.5 py-1 rounded-full bg-[#FFF0EB]">
                  Fixed 16:9 3D Artwork
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {STARLIT_STORY_SCENES.map((scene) => (
                  <div key={scene.order} className="space-y-1">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#F0D5C9] bg-[#FFF0EB]">
                      <Image
                        src={scene.file}
                        alt={scene.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-white text-[9px] font-bold">
                        #{scene.order}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-[#3A231C] truncate">
                      {scene.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Names & Personal Note Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#F0D5C9] shadow-sm space-y-6">
              <h3 className="text-base font-bold text-[#3A231C]">
                Personalize Your Story
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#3A231C] block mb-1">
                    Partner&#39;s Name <span className="text-[#C26D7A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="E.g., Maya, Emma, My Princess..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-semibold text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#3A231C] block mb-1">
                    Your Name <span className="text-[#C26D7A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="E.g., Alex, Noah, Your Romeo..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-semibold text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#3A231C] block mb-1">
                  Opening Story Tagline
                </label>
                <input
                  type="text"
                  value={openingTagline}
                  onChange={(e) => setOpeningTagline(e.target.value)}
                  placeholder="Under one sky, every moment is brighter with you."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-medium text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#3A231C] block mb-1">
                  Your Personal Message Card (Revealed in Scene 4)
                </label>
                <textarea
                  rows={3}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Pour your heart out here. This note will be revealed when the ivory envelope unseals..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-medium text-[#3A231C] focus:outline-none focus:border-[#C26D7A] leading-relaxed"
                />
                <p className="text-[11px] text-[#75564C] mt-1">
                  This note appears in an elegant card that never covers the characters&#39; faces.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!partnerName.trim() || !yourName.trim()}
                  className="px-7 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex items-center gap-2 bg-[#C26D7A] hover:bg-[#B55D6B]"
                >
                  <span>Continue to Tools Selection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────
            STEP 2: TOOLS SELECTION
        ───────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-2xl bg-[#FFF8F4] border border-[#F0D5C9] text-center space-y-1">
              <h3 className="text-base font-bold text-[#3A231C]">
                Select Interactive Tools for {partnerName || "your partner"}
              </h3>
              <p className="text-xs text-[#75564C] max-w-lg mx-auto">
                Toggle whichever moments you want included. Everything is pre-configured with sweet defaults so you can launch instantly without stress.
              </p>
            </div>

            {/* Tools Grid: 3 in a row on desktop (lg:grid-cols-3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tool 1: Voice & Photo Love Notes */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  replyToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        💌
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      1. Voice &amp; Photo Notes
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      Lets {partnerName || "your partner"} record voice memos, send selfies, and react with emojis privately to you.
                    </p>
                  </div>

                  {replyToolEnabled && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[#F0D5C9] text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#3A231C] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowVoice}
                          onChange={(e) => setReplyAllowVoice(e.target.checked)}
                          className="accent-[#C26D7A]"
                        />
                        <span>Voice Notes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#3A231C] font-medium">
                        <input
                          type="checkbox"
                          checked={replyAllowPhoto}
                          onChange={(e) => setReplyAllowPhoto(e.target.checked)}
                          className="accent-[#C26D7A]"
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
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        📅
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      2. Date Invitation &amp; Slots
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      Propose rooftop dinner or stargazing times for {partnerName || "your partner"} to accept or counter-propose.
                    </p>
                  </div>

                  {dateToolEnabled && (
                    <DateSlotEditor value={dateSlots} onChange={setDateSlots} palette={STARLIT_STORY_PALETTE} />
                  )}
                </div>
              </div>

              {/* Tool 3: Date Location & Venue Map */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  locationToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        📍
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      3. Date Location / Venue
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      Specify an in-person rooftop or cozy online date location.
                    </p>
                  </div>

                  {locationToolEnabled && (
                    <VenueEditor format={dateFormat} onFormat={setDateFormat} location={dateLocation} onLocation={setDateLocation} meetingUrl={meetingUrl} onMeetingUrl={setMeetingUrl} reservationUrl={reservationUrl} onReservationUrl={setReservationUrl} palette={STARLIT_STORY_PALETTE} />
                  )}
                </div>
              </div>

              {/* Tool 4: Vibe Check & Choice Polls */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  pollToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        📊
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
                        Fun Poll
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollToolEnabled}
                        onChange={(e) => setPollToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      4. Vibe Check &amp; Poll
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      Vote together on activities, treats, or scenic views.
                    </p>
                  </div>

                  {pollToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Poll question..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-semibold text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                      />

                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {pollOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C]"
                          >
                            <span className="truncate">{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePollOption(idx)}
                              className="text-[#C26D7A] hover:text-[#B55D6B] p-0.5 shrink-0"
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
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                        />
                        <button
                          type="button"
                          onClick={handleAddPollOption}
                          className="px-3 py-1.5 rounded-xl bg-[#C26D7A] text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs"
                        >
                          Add
                        </button>
                      </div>
                      <SenderPollChoices options={pollOptions} value={senderPollChoices} onChange={setSenderPollChoices} palette={STARLIT_STORY_PALETTE} />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 5: Heart-to-Heart Question Prompt */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  questionToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        💭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
                        Deep Bond
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={questionToolEnabled}
                        onChange={(e) => setQuestionToolEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      5. Heart-to-Heart Question
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      Ask a romantic question that reveals once {partnerName || "your partner"} answers.
                    </p>
                  </div>

                  {questionToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#F0D5C9]">
                      <label className="text-[10px] font-bold text-[#C26D7A] block">
                        Intimate Prompt:
                      </label>
                      <textarea
                        rows={2}
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        placeholder="When you look up at the stars, what wish comes to your mind?..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] leading-relaxed focus:outline-none focus:border-[#C26D7A]"
                      />
                      <SenderAnswerField kind="question" value={senderQuestionAnswer} onChange={setSenderQuestionAnswer} palette={STARLIT_STORY_PALETTE} />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 6: Synchronized Secret Reveal */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  revealToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        🔒
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      6. Secret Reveal
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      A locked surprise unlocked simultaneously with a 3-second synchronized countdown.
                    </p>
                  </div>

                  {revealToolEnabled && (
                    <div className="pt-2 space-y-1.5 border-t border-[#F0D5C9]">
                      <label className="text-[10px] font-bold text-[#C26D7A] block">
                        Locked Secret Note:
                      </label>
                      <textarea
                        rows={2}
                        value={revealPrompt}
                        onChange={(e) => setRevealPrompt(e.target.value)}
                        placeholder="A secret confession waiting to be unlocked under the stars..."
                        className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] leading-relaxed focus:outline-none focus:border-[#C26D7A]"
                      />
                      <SenderAnswerField kind="secret" value={senderSecretAnswer} onChange={setSenderSecretAnswer} palette={STARLIT_STORY_PALETTE} />
                    </div>
                  )}
                </div>
              </div>

              {/* Tool 7: Scratch Card Surprise */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  scratchToolEnabled
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        🪄
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      7. Scratch Card Surprise
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      A foil card {partnerName || "your partner"} scratches off using finger or mouse to uncover a hidden note.
                    </p>
                  </div>

                  {scratchToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          Foil Cover Title:
                        </label>
                        <input
                          type="text"
                          value={scratchTitle}
                          onChange={(e) => setScratchTitle(e.target.value)}
                          placeholder="A starlit surprise for you ✨..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          Hidden Secret Message:
                        </label>
                        <input
                          type="text"
                          value={scratchSecret}
                          onChange={(e) => setScratchSecret(e.target.value)}
                          placeholder="Out of billions of stars, my heart chooses you..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
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
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        🎟️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      8. Sweet Love Coupon
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      A cute redeemable voucher {partnerName || "your partner"} can claim anytime (e.g., stargazing night, warm backrub).
                    </p>
                  </div>

                  {couponToolEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          Coupon Voucher Title:
                        </label>
                        <input
                          type="text"
                          value={couponTitle}
                          onChange={(e) => setCouponTitle(e.target.value)}
                          placeholder="E.g. One Cozy Stargazing Night & Rooftop Dinner..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          Voucher Perk / Description:
                        </label>
                        <input
                          type="text"
                          value={couponDesc}
                          onChange={(e) => setCouponDesc(e.target.value)}
                          placeholder="Redeemable whenever you want warm tea, blankets, and stargazing..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
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
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        ✉️
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      9. Open When Letter
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      A sealed digital envelope {partnerName || "your partner"} saves and opens whenever they feel lonely, miss you, or need love.
                    </p>
                  </div>

                  {openWhenEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          When to open:
                        </label>
                        <input
                          type="text"
                          value={openWhenOccasion}
                          onChange={(e) => setOpenWhenOccasion(e.target.value)}
                          placeholder="E.g. Open when you miss me or feel alone at night..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#C26D7A] block mb-0.5">
                          Letter content:
                        </label>
                        <textarea
                          rows={2}
                          value={openWhenLetter}
                          onChange={(e) => setOpenWhenLetter(e.target.value)}
                          placeholder="Whenever you feel lonely, look up at the stars and remember my heart is holding yours..."
                          className="w-full px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] leading-relaxed focus:outline-none focus:border-[#C26D7A]"
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
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        📖
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      10. Our Story Memories
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      3 milestone cards taking {partnerName || "your partner"} through your favorite moments together.
                    </p>
                  </div>

                  {ourStoryEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {storyCards.map((card, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9]"
                          >
                            <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-[#F0D5C9]">
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
                              className="flex-1 px-2 py-1 rounded-lg bg-white border border-[#F0D5C9] text-[11px] text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
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
                    ? "bg-white border-[#C26D7A] shadow-sm"
                    : "bg-[#FFF8F4]/60 border-[#F0D5C9]/80 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] flex items-center justify-center text-lg shadow-2xs">
                        🧭
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[10px] font-bold text-[#C26D7A]">
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
                      <div className="w-10 h-5 bg-[#F0D5C9] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C26D7A]"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A231C]">
                      11. Couple Bucket List
                    </h4>
                    <p className="text-xs text-[#75564C] mt-1 leading-snug">
                      A shared wishlist of future dream dates, rooftop adventures, and stargazing moments you want to tick off together.
                    </p>
                  </div>

                  {bucketListEnabled && (
                    <div className="pt-2 space-y-2 border-t border-[#F0D5C9]">
                      <div className="text-[11px] font-bold text-[#C26D7A]">
                        Dream Adventures:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {bucketItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C]"
                          >
                            <span className="truncate">{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBucketItem(idx)}
                              className="text-[#C26D7A] hover:text-[#B55D6B] p-0.5 shrink-0"
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
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                        />
                        <button
                          type="button"
                          onClick={handleAddBucketItem}
                          className="px-3 py-1.5 rounded-xl bg-[#C26D7A] text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {senderSetupError && <p className="text-sm leading-relaxed" role="status">{senderSetupError} Complete your side before continuing.</p>}
            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-5 py-2.5 rounded-full bg-white border border-[#F0D5C9] text-xs font-bold text-[#3A231C] hover:bg-[#FFF0EB] transition-all cursor-pointer"
              >
                ← Back to Message
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!!senderSetupError}
                title={senderSetupError || undefined}
                className="px-7 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-[#C26D7A] hover:bg-[#B55D6B]"
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
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#F0D5C9] shadow-sm space-y-6"
          >
            {/* Header + Master Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0D5C9]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0EB] text-[#C26D7A]">
                    Floating Mosaic Wall
                  </span>
                  <span className="text-xs text-[#75564C] font-semibold">Hover Quotes • Zero-Gravity</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#3A231C] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D99443]" />
                  <span>Floating Photo &amp; Quote Gallery</span>
                </h3>
                <p className="text-xs text-[#75564C]">
                  Display an organic floating mosaic of your memories. When your partner hovers or taps each photo, a romantic quote and note will appear on top ✨
                </p>
              </div>

              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-auto bg-[#FFF8F4] px-4 py-2 rounded-2xl border border-[#F0D5C9] hover:border-[#C26D7A] transition-all">
                <input
                  type="checkbox"
                  checked={floatingGalleryEnabled}
                  onChange={(e) => setFloatingGalleryEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C26D7A] relative"></div>
                <span className="text-xs font-bold text-[#3A231C]">
                  {floatingGalleryEnabled ? "Gallery Enabled" : "Gallery Disabled"}
                </span>
              </label>
            </div>

            {floatingGalleryEnabled && (
              <div className="space-y-6">
                {/* Gallery Title & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#3A231C]">Gallery Section Title</label>
                    <input
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      placeholder="Our Starlit Memories & Whispers"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0D5C9] bg-[#FFF8F4] text-xs font-medium text-[#3A231C] focus:outline-hidden focus:border-[#C26D7A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#3A231C]">Gallery Subtitle</label>
                    <input
                      type="text"
                      value={gallerySubtitle}
                      onChange={(e) => setGallerySubtitle(e.target.value)}
                      placeholder="Hover over each memory to reveal the secret quote inside my heart ✨"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0D5C9] bg-[#FFF8F4] text-xs font-medium text-[#3A231C] focus:outline-hidden focus:border-[#C26D7A]"
                    />
                  </div>
                </div>

                {/* Upload & Preset toolbar */}
                <div className="p-4 rounded-2xl bg-[#FFF8F4] border border-dashed border-[#F0D5C9] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C26D7A] text-white text-xs font-bold shadow-xs hover:bg-[#B55D6B] cursor-pointer transition-all">
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
                      className="px-3 py-2 rounded-xl border border-[#F0D5C9] bg-white text-xs font-semibold text-[#75564C] hover:bg-[#FFF0EB] transition-colors"
                      title="Reset gallery items to romantic fairytale preset"
                    >
                      Reset Default Memories
                    </button>
                  </div>

                  <span className="text-[11px] text-[#75564C]">
                    PNG, JPG, WEBP • Auto-optimized • {galleryItems.length} memories
                  </span>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {uploadError}
                  </p>
                )}

                {/* Items Manager List */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#3A231C] block">
                    Custom Memories &amp; Secret Whispers ({galleryItems.length})
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {galleryItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-[#F0D5C9] bg-[#FFF8F4] flex gap-3 items-start"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#F0D5C9] bg-white">
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
                                      ? "bg-[#C26D7A] text-white"
                                      : "bg-white text-[#75564C] border border-[#F0D5C9]"
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
                            className="w-full px-2.5 py-1 rounded-lg border border-[#F0D5C9] bg-white text-xs text-[#3A231C] focus:outline-hidden focus:border-[#C26D7A]"
                          />

                          {/* Author / Tagline */}
                          <input
                            type="text"
                            value={item.author || ""}
                            onChange={(e) => handleUpdateItemAuthor(item.id, e.target.value)}
                            placeholder="Tag (e.g. My Princess, Starlit Night)..."
                            className="w-full px-2.5 py-1 rounded-lg border border-[#F0D5C9] bg-white text-[11px] text-[#75564C] focus:outline-hidden focus:border-[#C26D7A]"
                          />
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryItem(item.id)}
                          className="text-[#C26D7A] hover:text-[#B55D6B] p-1 shrink-0"
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
                    <span className="text-xs font-bold text-[#3A231C] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D99443]" />
                      <span>Live Interactive Wall Preview</span>
                    </span>
                    <span className="text-[11px] text-[#75564C]">
                      Hover photos to test quotes &amp; tap to zoom
                    </span>
                  </div>

                  <div className="rounded-3xl border border-[#F0D5C9] overflow-hidden bg-white">
                    <FloatingQuoteGallery
                      items={galleryItems}
                      title={galleryTitle}
                      subtitle={gallerySubtitle}
                      theme="starlit-story"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#F0D5C9]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-white border border-[#F0D5C9] text-xs font-bold text-[#3A231C] hover:bg-[#FFF0EB] transition-all cursor-pointer"
              >
                ← Back to Tools
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-7 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 bg-[#C26D7A] hover:bg-[#B55D6B]"
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
            className="p-6 sm:p-8 rounded-3xl bg-white border border-[#F0D5C9] shadow-sm space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#3A231C] flex items-center gap-2">
                <Music className="w-4 h-4 text-[#C26D7A]" />
                <span>Starlit Soundtrack &amp; Expiry</span>
              </h3>
              <p className="text-xs text-[#75564C]">
                Pick a gentle melody that plays softly under the stars when {partnerName || "your partner"} opens their letter.
              </p>
            </div>

            {/* Selected Track Banner & Timestamp Picker */}
            {selectedTrack && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#FFF8F4] border-2 border-[#F0D5C9] shadow-xs space-y-4">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedTrack.thumbnailUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-[#F0D5C9] shadow-2xs">
                        <Image
                          src={selectedTrack.thumbnailUrl}
                          alt={selectedTrack.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 border border-[#F0D5C9]">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C26D7A] uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-[#D99443]" />
                        <span>Active Soundtrack</span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[#3A231C] truncate">
                        {selectedTrack.title}
                      </h4>
                      <p className="text-[11px] text-[#75564C] truncate">
                        {selectedTrack.artist} • {selectedTrack.type === "youtube" ? "YouTube Audio" : "Starlit Library"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSelectedPreview}
                      className="px-3.5 py-1.5 rounded-full bg-white text-[#C26D7A] text-xs font-bold border border-[#F0D5C9] shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {previewTrackId === selectedTrack.id || (selectedTrack.type === "youtube" && isYtTesting) ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-[#C26D7A]" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#C26D7A]" />
                          <span>Test from {formatTime(trackStartAt)}</span>
                        </>
                      )}
                    </button>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      ✓ Active
                    </span>
                  </div>
                </div>

                {/* YouTube Preview Frame (when testing YouTube audio) */}
                {selectedTrack.type === "youtube" && isYtTesting && selectedTrack.youtubeId && (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black/90 border border-[#F0D5C9] shadow-md relative">
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
                <div className="p-4 rounded-2xl bg-white border border-[#F0D5C9] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#3A231C]">
                      <Clock className="w-3.5 h-3.5 text-[#C26D7A]" />
                      <span>Start song playback from:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#FFF0EB] text-[#C26D7A] font-mono font-bold text-xs">
                        {formatTime(trackStartAt)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#75564C]">
                      Total length: {formatTime(selectedTrack.duration || 300)}
                    </span>
                  </div>

                  {/* Interactive Waveform Visualizer & Scrubber */}
                  <div
                    className="relative h-12 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] overflow-hidden cursor-pointer select-none"
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
                              backgroundColor: isPastStart ? "#C26D7A" : "#F0D5C9",
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
                        backgroundColor: "#C26D7A",
                        boxShadow: "0 0 8px rgba(194, 109, 122, 0.6)",
                      }}
                    >
                      <div className="absolute -top-1 -left-2 px-1.5 py-0.5 rounded-full bg-[#C26D7A] text-white text-[9px] font-bold shadow-xs whitespace-nowrap">
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
                    className="w-full accent-[#C26D7A] h-1.5 rounded-lg cursor-pointer bg-[#FFF0EB]"
                  />

                  {/* Precise Minutes & Seconds Input + Preset Moments */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#75564C]">
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#FFF8F4] border border-[#F0D5C9] font-bold text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                          placeholder="00"
                        />
                        <span className="font-bold text-[#C26D7A]">:</span>
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
                          className="w-11 px-2 py-1 text-center rounded-lg bg-[#FFF8F4] border border-[#F0D5C9] font-bold text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                          placeholder="00"
                        />
                        <span className="text-[10px] text-[#75564C]">(mm:ss)</span>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#75564C]">Presets:</span>
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
                                ? "bg-[#C26D7A] text-white shadow-2xs"
                                : "bg-[#FFF8F4] text-[#3A231C] border border-[#F0D5C9] hover:bg-[#FFF0EB]"
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
            <div className="flex gap-2 p-1 bg-[#FFF0EB] rounded-2xl border border-[#F0D5C9] max-w-xs">
              <button
                type="button"
                onClick={() => setMusicTab("catalog")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "catalog"
                    ? "bg-[#C26D7A] text-white shadow-xs"
                    : "text-[#75564C] hover:bg-white"
                }`}
              >
                🎵 Starlit Library
              </button>
              <button
                type="button"
                onClick={() => setMusicTab("youtube")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  musicTab === "youtube"
                    ? "bg-[#C26D7A] text-white shadow-xs"
                    : "text-[#75564C] hover:bg-white"
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
                  {STARLIT_MUSIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        void fetchMusic(cat.query);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-[#C26D7A] text-white shadow-2xs"
                          : "bg-[#FFF8F4] text-[#75564C] border border-[#F0D5C9] hover:bg-white"
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
                    placeholder="Search library by keyword (e.g. ambient, acoustic, sweet, piano, lofi)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] placeholder:text-[#75564C]/60 focus:outline-none focus:border-[#C26D7A]"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchMusic(musicSearchQuery)}
                    className="px-4 py-2 rounded-xl bg-[#C26D7A] text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Loading indicator */}
                {loadingMusic ? (
                  <div className="p-8 text-center text-xs font-bold text-[#C26D7A] animate-pulse flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#C26D7A] border-t-transparent animate-spin" />
                    <span>Finding ambient melodies...</span>
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
                              ? "bg-[#FFF0EB] border-[#C26D7A] shadow-xs"
                              : "bg-[#FFF8F4] border-[#F0D5C9] hover:border-[#C26D7A]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {thumb ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden relative shrink-0 border border-[#F0D5C9]">
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
                                className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center text-[#C26D7A] hover:scale-105 transition-transform shrink-0 border border-[#F0D5C9] cursor-pointer"
                                title={isPreviewing ? "Stop" : "Preview song"}
                              >
                                {isPreviewing ? <Pause className="w-4 h-4 fill-[#C26D7A]" /> : <Play className="w-4 h-4 fill-[#C26D7A]" />}
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-[#3A231C] truncate">
                                {t.title}
                              </h5>
                              <p className="text-[10px] text-[#75564C] truncate">
                                {artist} • {formatTime(t.duration)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePreviewMusic(t)}
                              className="w-7 h-7 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#C26D7A] hover:scale-105 transition-transform border border-[#F0D5C9] cursor-pointer"
                              title={isPreviewing ? "Stop preview" : "Listen"}
                            >
                              {isPreviewing ? <Pause className="w-3 h-3 fill-[#C26D7A]" /> : <Play className="w-3 h-3 fill-[#C26D7A]" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectTrack(t)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#C26D7A] text-white shadow-xs"
                                  : "bg-white text-[#C26D7A] border border-[#F0D5C9] hover:bg-[#FFF0EB]"
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
                  <label className="text-xs font-bold text-[#3A231C] block">
                    Paste YouTube Song or Video URL:
                  </label>
                  <p className="text-[11px] text-[#75564C]">
                    Supports any standard YouTube link, mobile share link (youtu.be), or Shorts.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs text-[#3A231C] focus:outline-none focus:border-[#C26D7A]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyYoutube}
                    disabled={youtubeLoading || !youtubeUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#C26D7A] text-white text-xs font-bold disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer"
                  >
                    {youtubeLoading ? "Verifying..." : "Load Song"}
                  </button>
                </div>

                {youtubeError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                    {youtubeError}
                  </div>
                )}

                {selectedTrack?.type === "youtube" && (
                  <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/80 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedTrack.thumbnailUrl && (
                        <div className="w-14 h-10 rounded-lg overflow-hidden relative shrink-0 border border-gray-200">
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
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          ✓ YouTube Audio Loaded
                        </span>
                        <h4 className="text-xs font-bold text-[#3A231C] truncate">
                          {selectedTrack.title}
                        </h4>
                        <p className="text-[10px] text-[#75564C] truncate">
                          Channel: {selectedTrack.artist}
                        </p>
                      </div>
                    </div>

                    <a
                      href={selectedTrack.youtubeUrl || `https://www.youtube.com/watch?v=${selectedTrack.youtubeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#C26D7A] hover:underline shrink-0"
                    >
                      Open Link ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            <PurchaseDetails productSlug="starlit-story" />

            {/* Stepper Navigation */}
            <div className="pt-4 flex items-center justify-between border-t border-[#F0D5C9]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-full bg-white border border-[#F0D5C9] text-xs font-bold text-[#3A231C] hover:bg-[#FFF0EB] transition-all cursor-pointer"
              >
                ← Back to Gallery
              </button>

              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={isCreating}
                className="px-8 py-3 rounded-full text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2 bg-[#C26D7A] hover:bg-[#B55D6B]"
              >
                {isCreating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing Starlit Story...</span>
                  </>
                ) : (
                  <>
                    <span>Publish &amp; Create Starlit Story</span>
                    <Sparkles className="w-3.5 h-3.5" />
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
            className="p-6 sm:p-10 rounded-3xl bg-white border border-[#F0D5C9] shadow-sm text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-[#FFF0EB] text-[#C26D7A] flex items-center justify-center text-3xl mx-auto shadow-xs">
              ✨
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C26D7A]">
                Successfully Created
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#3A231C]">
                Your Starlit Story is Ready!
              </h2>
              <p className="text-xs sm:text-sm text-[#75564C] max-w-md mx-auto">
                Share this link with {partnerName || "your partner"}. When they open it, their romantic rooftop evening under fairy lights will begin.
              </p>
            </div>

            {/* Short Code Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#FFF0EB] text-xs font-extrabold text-[#C26D7A] tracking-wider border border-[#F0D5C9]">
              SHORT CODE: {generatedCode}
            </div>

            {/* Share Link Input */}
            <div className="max-w-md mx-auto flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl || ""}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#FFF8F4] border border-[#F0D5C9] text-xs font-medium text-[#3A231C] select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-5 py-2.5 rounded-xl bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
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
                  className="px-6 py-2.5 rounded-full bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Open Starlit Story</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {generatedUrl && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `I created something special for you beneath the stars ✨: ${generatedUrl}`
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
                    `Created our rooftop starlit story ✨: ${generatedUrl}`
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
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#FFF8F4] border border-[#F0D5C9] text-left space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C26D7A]" />
                  <span className="text-xs font-bold text-[#3A231C]">
                    Secret Creator Management Link:
                  </span>
                </div>
                <p className="text-[11px] text-[#75564C] leading-snug">
                  Bookmark this private link! It allows you to view {partnerName || "your partner"}&#39;s voice note replies, photos, date RSVPs, and intimate confessions.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={generatedManageUrl}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#F0D5C9] text-[11px] text-[#75564C] select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyManageLink}
                    className="px-3 py-1.5 rounded-lg bg-[#C26D7A] hover:bg-[#B55D6B] text-white text-xs font-bold shrink-0 shadow-2xs cursor-pointer"
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
