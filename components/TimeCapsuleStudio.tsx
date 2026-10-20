"use client";

import { useState, useEffect, useEffectEvent, useRef, useMemo } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import confetti from "canvas-confetti";
import Image from "next/image";
import CapsuleDashboard from "@/components/capsules/CapsuleDashboard";
import CapsuleDialog from "@/components/capsules/CapsuleDialog";
import styles from "@/components/capsules/capsules.module.css";
import { formatCapsuleDate } from "@/lib/capsule-display";
import {
  Lock,
  Unlock,
  Plus,
  Clock,
  FileText,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Play,
  Pause,
  RotateCw,
  Send,
  Eye,
  Check,
  ArrowRight,
  Star,
  Fingerprint,
  RefreshCw,
  Trash2,
  FolderPlus,
  Folder,
  Edit3,
  Maximize2,
  ChevronLeft,
  Layers,
  Save,
  StickyNote,
  Users,
  UserCheck,
  UserX,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  TimeCapsuleRecord,
  CapsuleSealRequest,
  PolaroidData,
  GalleryFolder,
  VoiceNoteData,
  VideoNoteData,
  TextNoteData,
  FuturePredictionData,
  fetchTimeCapsulesFromDB,
  createTimeCapsuleInDB,
  updateTimeCapsuleInDB,
  updateCapsuleLockInDB,
  deleteTimeCapsuleFromDB,
  subscribeToTimeCapsulesRealtime,
  deduplicateCapsules,
  purgeCloudinaryAssets,
  createCapsuleSealRequest,
  fetchPendingCapsuleSealRequests,
  fetchCapsuleUnlockVotes,
  respondToCapsuleSealRequest,
  voteToCapsuleUnlock,
  subscribeToCapsuleRequests,
  reRequestCapsuleSeal,
  fetchSealRequestsForUser,
  fetchIncomingUnlockRequests,
  resetCapsuleUnlockVotes,
} from "@/lib/supabase/timeCapsules";

// ─── Web Audio API Sound Synthesizer ───
class SoundFXEngine {
  private ctx: AudioContext | null = null;
  private isAmbientPlaying: boolean = false;
  private ambientInterval: ReturnType<typeof setInterval> | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.08);

      gain.gain.setValueAtTime(0.0001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 1.3);
    });
  }

  playSealSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.8);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  playHeartbeat() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const playBeat = (timeOffset: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(40, now + timeOffset + duration);

      gain.gain.setValueAtTime(0.2, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + duration);
    };

    playBeat(0, 85, 0.12);
    playBeat(0.18, 75, 0.15);
  }

  toggleAmbient(enable: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!enable) {
      if (this.ambientInterval) clearInterval(this.ambientInterval);
      this.ambientInterval = null;
      this.isAmbientPlaying = false;
      return;
    }

    this.isAmbientPlaying = true;
    const chordProgressions = [
      [261.63, 329.63, 392.0, 493.88],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 220.0, 261.63, 329.63],
      [196.0, 246.94, 293.66, 392.0],
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.isAmbientPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = chordProgressions[chordIdx % chordProgressions.length];
      chordIdx++;

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.015, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 6);
      });
    };

    playChord();
    this.ambientInterval = setInterval(playChord, 5500);
  }
}

const sfx = new SoundFXEngine();

export default function TimeCapsuleStudio({sharedOnly=false}: {sharedOnly?:boolean}={}) {
  const { user, couple, fullName } = useAuth();
  const supabase = createClient();

  // ─── Realtime Database State ───
  const [capsules, setCapsules] = useState<TimeCapsuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsuleRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAmbientAudioOn, setIsAmbientAudioOn] = useState(false);

  // Unlocking simulator state
  const [isHoldingUnlock, setIsHoldingUnlock] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [activeMemoryTab, setActiveMemoryTab] = useState<
    "letter" | "gallery" | "predictions"
  >("gallery");
  
  // Folder Explorer State inside Capsule
  const [openedFolderId, setOpenedFolderId] = useState<string | null>(null);
  const [isAddingFolderInCapsule, setIsAddingFolderInCapsule] = useState(false);
  const [newFolderNameInCapsule, setNewFolderNameInCapsule] = useState("");
  const [newFolderIconInCapsule, setNewFolderIconInCapsule] = useState("📁");

  // In-capsule media upload to active folder
  const [isAddingTextNote, setIsAddingTextNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  // Audio & Video in-capsule editing
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitleText, setEditingVideoTitleText] = useState("");

  // Predictions Editing inside Capsule
  const [isEditingPredictions, setIsEditingPredictions] = useState(false);
  const [editablePredictions, setEditablePredictions] = useState<FuturePredictionData[]>([]);

  // Lightbox / Fullscreen Polaroid State
  const [lightboxPolaroid, setLightboxPolaroid] = useState<PolaroidData | null>(null);
  const [isLightboxFlipped, setIsLightboxFlipped] = useState(false);
  const [isEditingPolaroid, setIsEditingPolaroid] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editNoteOnBack, setEditNoteOnBack] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFolderId, setEditFolderId] = useState("");

  // Audio Playback
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState(0);

  // ─── Create Capsule Wizard State ───
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<
    "milestone" | "anniversary" | "open_when" | "predictions" | "memories"
  >("milestone");
  const [newUnlockDate, setNewUnlockDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newLetterAuthor, setNewLetterAuthor] = useState(fullName || "Me");
  const [newLetterGreeting, setNewLetterGreeting] = useState("Dear future me,");
  const [newLetterBody, setNewLetterBody] = useState("");
  const [newLetterSignOff, setNewLetterSignOff] = useState("Until next time,");
  const newPaperTheme = "parchment" as const;
  const [newSealColor, setNewSealColor] = useState<"crimson" | "gold" | "velvet" | "emerald" | "rose">("rose");
  const [newSealStamp, setNewSealStamp] = useState("💌");

  // Multi-Folder Gallery Structure in Wizard
  const [wizardFolders, setWizardFolders] = useState<GalleryFolder[]>([
    { id: "f-memories", name: "Memories", icon: "📸" },
    { id: "f-letters", name: "Notes & letters", icon: "💌" },
  ]);
  const [activeWizardFolderId, setActiveWizardFolderId] = useState<string>("f-memories");
  const [isAddingWizardFolder, setIsAddingWizardFolder] = useState(false);
  const [newWizardFolderName, setNewWizardFolderName] = useState("");
  const [newWizardFolderIcon, setNewWizardFolderIcon] = useState("📁");

  // Multi-Media in Wizard Step 3
  const [uploadedPolaroids, setUploadedPolaroids] = useState<PolaroidData[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [wizardVideos, setWizardVideos] = useState<VideoNoteData[]>([]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const [wizardVoiceNotes, setWizardVoiceNotes] = useState<VoiceNoteData[]>([]);
  const [wizardTextNotes, setWizardTextNotes] = useState<TextNoteData[]>([]);
  const [isAddingWizardTextNote, setIsAddingWizardTextNote] = useState(false);
  const [wizardNoteTitle, setWizardNoteTitle] = useState("");
  const [wizardNoteContent, setWizardNoteContent] = useState("");

  // Live Microphone Audio Recording in Wizard
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [liveRecordSeconds, setLiveRecordSeconds] = useState(0);
  const [liveVoiceTitle, setLiveVoiceTitle] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const cancelledRecordingRef = useRef(false);
  useEffect(() => () => {
    cancelledRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);
  // Guard against React StrictMode double-invocation creating duplicate capsules
  const isFinalizingRef = useRef(false);
  const savedWizardCapsuleRef = useRef<string | null>(null);
  const wizardCapsuleIdRef = useRef<string | null>(null);

  // Predictions in Wizard Step 4
  const [wizardPredictions, setWizardPredictions] = useState<FuturePredictionData[]>([
    {
      id: "pred-1",
      question: "What would you like to experience next?",
      partner1Answer: "",
      partner2Answer: "",
      status: "pending",
    },
    {
      id: "pred-2",
      question: "What do you hope to have achieved a year from now?",
      partner1Answer: "",
      partner2Answer: "",
      status: "pending",
    },
  ]);

  // Sealing Hold State
  const [isHoldingToSeal, setIsHoldingToSeal] = useState(false);
  const [sealProgress, setSealProgress] = useState(0);
  const [isSubmittingCapsule, setIsSubmittingCapsule] = useState(false);

  // ─── Seal Mode (solo vs couple) ───
  const [newSealMode, setNewSealMode] = useState<"solo" | "couple">(sharedOnly?"couple":"solo");
  // After couple seal is submitted: show the waiting screen
  const [sealRequestSent, setSealRequestSent] = useState(false);
  const [lastCreatedCapsuleId, setLastCreatedCapsuleId] = useState<string | null>(null);

  // ─── Pending Seal Requests (incoming from partner to co-seal) ───
  const [pendingSealRequests, setPendingSealRequests] = useState<CapsuleSealRequest[]>([]);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  // ─── Pending Unlock Requests (incoming notification that partner wants to open capsule) ───
  const [pendingUnlockRequests, setPendingUnlockRequests] = useState<CapsuleSealRequest[]>([]);
  const [respondingUnlockRequestId, setRespondingUnlockRequestId] = useState<string | null>(null);

  // ─── Map of all seal requests for user (tracks pending / rejected status for creator capsules) ───
  const [sealRequestMap, setSealRequestMap] = useState<Record<string, CapsuleSealRequest>>({});
  const [resendingCapsuleId, setResendingCapsuleId] = useState<string | null>(null);

  // ─── Couple Unlock Request state (inside detail modal) ───
  const [coupleUnlockRequest, setCoupleUnlockRequest] = useState<CapsuleSealRequest | null>(null);
  const [coupleUnlockVoteLoading, setCoupleUnlockVoteLoading] = useState(false);
  const [myUnlockVoteCast, setMyUnlockVoteCast] = useState(false);

  // 1. Initial Load & Synchronize with Supabase DB
  useEffect(() => {
    let active = true;
    const loadCapsules = async () => {
      setLoading(true);
      try {
        const data = await fetchTimeCapsulesFromDB(supabase, couple?.id, user?.id);
        if (active) { setCapsules(deduplicateCapsules(data)); setLoadError(null); }
      } catch {
        if (active) setLoadError("Please try again to load your saved capsules.");
      } finally { if (active) setLoading(false); }
    };

    loadCapsules();

    // Subscribe to real-time changes on time_capsules
    const channel = subscribeToTimeCapsulesRealtime(supabase, couple?.id, () => {
      loadCapsules();
    });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, couple?.id, user?.id, reloadVersion]);

  // 2. Load pending seal requests, unlock requests + realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const loadRequests = async () => {
      // A. Incoming seal requests (partner asked current user to co-seal)
      const sealReqs = await fetchPendingCapsuleSealRequests(supabase, user.id);
      const enrichedSeal = await Promise.all(
        sealReqs.map(async (req) => {
          const capsule = await supabase
            .from("time_capsules")
            .select("title")
            .eq("id", req.capsule_id)
            .maybeSingle();
          return {
            ...req,
            capsule_title: capsule.data?.title || "Untitled Capsule",
          };
        })
      );
      setPendingSealRequests(enrichedSeal);

      // B. Incoming unlock requests (other partner requested to open, waiting for user's approval)
      const unlockReqs = await fetchIncomingUnlockRequests(supabase, user.id);
      const enrichedUnlock = await Promise.all(
        unlockReqs.map(async (req) => {
          const capsule = await supabase
            .from("time_capsules")
            .select("title")
            .eq("id", req.capsule_id)
            .maybeSingle();
          return {
            ...req,
            capsule_title: capsule.data?.title || "Untitled Capsule",
          };
        })
      );
      setPendingUnlockRequests(enrichedUnlock);

      // C. All seal requests for current user (tracks pending / rejected status for creator capsules)
      const allUserReqs = await fetchSealRequestsForUser(supabase, user.id);
      const map: Record<string, CapsuleSealRequest> = {};
      allUserReqs.forEach((r) => {
        if (!map[r.capsule_id] || (r.updated_at && map[r.capsule_id].updated_at && r.updated_at > map[r.capsule_id].updated_at!)) {
          map[r.capsule_id] = r;
        }
      });
      setSealRequestMap(map);
    };

    loadRequests().catch(() => setOperationError("Capsule approvals could not be loaded. Please refresh and try again."));

    // Subscribe to new/updated seal requests for this user
    const sealChannel = subscribeToCapsuleRequests(supabase, user.id, () => {
      loadRequests().catch(() => setOperationError("Capsule approvals could not be loaded. Please refresh and try again."));
      // Also reload capsules in case a partner just co-sealed or unlocked one
      fetchTimeCapsulesFromDB(supabase, couple?.id, user.id).then((data) => {
        setCapsules(deduplicateCapsules(data));
      }).catch(() => setOperationError("Your memories could not be refreshed."));
    });

    return () => {
      supabase.removeChannel(sealChannel);
    };
  }, [supabase, user?.id, couple?.id]);

  // Reset shared UI immediately when membership changes. Personal drafts survive.
  const [previousConnection, setPreviousConnection] = useState(couple?.is_connected);
  if (previousConnection !== couple?.is_connected) {
    setPreviousConnection(couple?.is_connected);
    if (!couple?.is_connected) {
      setPendingSealRequests([]);
      setPendingUnlockRequests([]);
      if (selectedCapsule?.seal_mode === "couple") {
        setIsDetailModalOpen(false);
        setSelectedCapsule(null);
      }
    }
  }

  // Lock body scrolling when any full-screen modal is open to prevent background bleed and scroll leaks
  useEffect(() => {
    if (isDetailModalOpen || isCreateModalOpen || !!lightboxPolaroid) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDetailModalOpen, isCreateModalOpen, lightboxPolaroid]);

  useEffect(() => () => { sfx.toggleAmbient(false); }, []);

  // Sound FX ambient toggle
  const toggleAmbientSound = () => {
    const nextState = !isAmbientAudioOn;
    setIsAmbientAudioOn(nextState);
    sfx.toggleAmbient(nextState);
    if (nextState) sfx.playChime();
  };

  

  // ─── Cloudinary Upload Helper ───
  const uploadToCloudinary = async (
    file: Blob | File,
    resourceType: "auto" | "image" | "video" = "auto",
    folder: string = "bonded/time_capsules"
  ): Promise<{ success: boolean; secure_url?: string; duration?: number; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resource_type", resourceType);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Upload failed");
      }

      return {
        success: true,
        secure_url: data.secure_url || data.url,
        duration: data.duration,
      };
    } catch (err: unknown) {
      console.error("Cloudinary upload error:", err);
      return { success: false, error: (err instanceof Error ? err.message : "Please try again.") || "Upload error" };
    }
  };

  // ─── Live Microphone Audio Recording Handlers ───
  const startLiveAudioRecording = async () => {
    try {
      sfx.playChime();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      cancelledRecordingRef.current = false;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (cancelledRecordingRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
        const startTime = recordingStartTimeRef.current;
        const elapsedMs = startTime !== null ? Date.now() - startTime : 0;
        const calculatedSecs = Math.round(elapsedMs / 1000);
        const mins = Math.floor(calculatedSecs / 60);
        const remainingSecs = calculatedSecs % 60;
        const formattedDuration = mins > 0 
          ? `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`
          : `${calculatedSecs}s`;

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        // Upload directly to Cloudinary
        setIsAudioUploading(true);
        const res = await uploadToCloudinary(audioBlob, "video", "bonded/voice_notes");
        setIsAudioUploading(false);
        if (res.success && res.secure_url) {
          const finalDuration = (res.duration && res.duration > 0) 
            ? `${Math.round(res.duration)}s` 
            : formattedDuration;

          const voiceData: VoiceNoteData = {
            id: `vn-${Date.now()}`,
            title: liveVoiceTitle.trim() || `Voice Memo (${new Date().toLocaleDateString()})`,
            duration: finalDuration,
            audioUrl: res.secure_url,
            audioDesc: "Recorded voice note",
            speaker: newLetterAuthor || "Me",
            folder_id: activeWizardFolderId || "f-letters",
          };

          setWizardVoiceNotes((prev) => [...prev, voiceData]);
          setLiveVoiceTitle("");
          try {
            confetti({ disableForReducedMotion: true, particleCount: 20, spread: 35 });
          } catch {}
        }
      };

      recorder.start();
      setIsLiveRecording(true);
      setLiveRecordSeconds(0);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone permission denied or not supported on this browser.");
    }
  };

  const stopLiveAudioRecording = () => {
    if (mediaRecorderRef.current && isLiveRecording) {
      sfx.playChime();
      mediaRecorderRef.current.stop();
      recordingStartTimeRef.current = null;
      setIsLiveRecording(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLiveRecording) {
      timer = setInterval(() => {
        setLiveRecordSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLiveRecording]);

  // Handle Photo Uploads to Cloudinary
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFolderId?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    sfx.playChime();

    try {
      const newPolaroidsList: PolaroidData[] = [];
      const folderId = targetFolderId || activeWizardFolderId || "f-memories";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadToCloudinary(file, "image", "bonded/polaroids");
        if (res.success && res.secure_url) {
          newPolaroidsList.push({
            id: `p-${Date.now()}-${i}`,
            image: res.secure_url,
            caption: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            location: "",
            noteOnBack: "Write a special love quote or memory here...",
            rotation: Math.floor(Math.random() * 6) - 3,
            folder_id: folderId,
          });
        }
      }

      if (isDetailModalOpen && selectedCapsule) {
        const updated = [...(selectedCapsule.polaroids || []), ...newPolaroidsList];
        await updateTimeCapsuleInDB(supabase, selectedCapsule.id, { polaroids: updated });
        const updatedCapsule = { ...selectedCapsule, polaroids: updated };
        setSelectedCapsule(updatedCapsule);
        setCapsules((prev) => prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c)));
      } else {
        setUploadedPolaroids((prev) => [...prev, ...newPolaroidsList]);
      }

      try {
        confetti({ disableForReducedMotion: true, particleCount: 25, spread: 40 });
      } catch {}
    } catch (err: unknown) {
      alert("Your photos couldn’t be uploaded: " + (err instanceof Error ? err.message : "Please try again."));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Video Upload to Cloudinary
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFolderId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    sfx.playChime();

    try {
      const res = await uploadToCloudinary(file, "video", "bonded/videos");
      if (res.success && res.secure_url) {
        const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const folderId = targetFolderId || activeWizardFolderId || "f-memories";

        const videoData: VideoNoteData = {
          id: `v-${Date.now()}`,
          title: title,
          videoUrl: res.secure_url,
          speaker: newLetterAuthor || "Partner",
          folder_id: folderId,
        };

        if (isDetailModalOpen && selectedCapsule) {
          const updatedVideos = [...(selectedCapsule.video_notes || []), videoData];
          await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
            video_notes: updatedVideos,
            video_note: videoData,
          });
          const updatedCapsule = {
            ...selectedCapsule,
            video_notes: updatedVideos,
            video_note: videoData,
          };
          setSelectedCapsule(updatedCapsule);
          setCapsules((prev) => prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c)));
        } else {
          setWizardVideos((prev) => [...prev, videoData]);
        }

        try {
          confetti({ disableForReducedMotion: true, particleCount: 30, spread: 50 });
        } catch {}
      } else {
        alert("Video upload failed: " + res.error);
      }
    } catch (err: unknown) {
      alert("Error uploading video: " + (err instanceof Error ? err.message : "Please try again."));
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Add Wizard Text Note to Active Folder
  const handleAddWizardTextNote = () => {
    if (!wizardNoteContent.trim()) return;
    sfx.playChime();

    const newNote: TextNoteData = {
      id: `wnote-${Date.now()}`,
      title: wizardNoteTitle.trim() || "Secret Note & Vow",
      content: wizardNoteContent.trim(),
      author: newLetterAuthor || "Partner",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      folder_id: activeWizardFolderId || "f-letters",
    };

    setWizardTextNotes((prev) => [...prev, newNote]);
    setWizardNoteTitle("");
    setWizardNoteContent("");
    setIsAddingWizardTextNote(false);
  };

  // Save edited Video Title inside Capsule
  const saveVideoTitleEdit = async (videoId: string) => { try {
    if (!selectedCapsule || !editingVideoTitleText.trim()) return;
    sfx.playChime();

    const updatedVideos = (selectedCapsule.video_notes || []).map((v) =>
      v.id === videoId ? { ...v, title: editingVideoTitleText.trim() } : v
    );

    const mainVideo = selectedCapsule.video_note
      ? { ...selectedCapsule.video_note, title: editingVideoTitleText.trim() }
      : null;

    await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
      video_notes: updatedVideos,
      video_note: mainVideo,
    });

    const updatedCapsule = {
      ...selectedCapsule,
      video_notes: updatedVideos,
      video_note: mainVideo,
    };

    setSelectedCapsule(updatedCapsule);
    setCapsules((prev) => prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c)));
    setEditingVideoId(null);
    setEditingVideoTitleText("");
    try {
      confetti({ disableForReducedMotion: true, particleCount: 20, spread: 30 });
    } catch {}
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Save edited Predictions inside Capsule
  const savePredictionsEdit = async () => { try {
    if (!selectedCapsule) return;
    sfx.playChime();

    await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
      predictions: editablePredictions,
    });

    const updatedCapsule = {
      ...selectedCapsule,
      predictions: editablePredictions,
    };

    setSelectedCapsule(updatedCapsule);
    setCapsules((prev) => prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c)));
    setIsEditingPredictions(false);
    try {
      confetti({ disableForReducedMotion: true, particleCount: 40, spread: 60 });
    } catch {}
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Open Fullscreen Lightbox for Polaroid
  const openPolaroidLightbox = (p: PolaroidData) => {
    sfx.playChime();
    setLightboxPolaroid(p);
    setIsLightboxFlipped(false);
    setIsEditingPolaroid(false);
    setEditCaption(p.caption);
    setEditNoteOnBack(p.noteOnBack || "");
    setEditLocation(p.location || "");
    setEditDate(p.date || "");
    setEditFolderId(p.folder_id || "f-memories");
  };

  // Save edits to Polaroid
  const savePolaroidEdits = async () => { try {
    if (!selectedCapsule || !lightboxPolaroid) return;
    sfx.playChime();

    const updatedPolaroids = selectedCapsule.polaroids.map((p) => {
      if (p.id === lightboxPolaroid.id) {
        return {
          ...p,
          caption: editCaption,
          noteOnBack: editNoteOnBack,
          location: editLocation,
          date: editDate,
          folder_id: editFolderId,
        };
      }
      return p;
    });

    const updatedCapsule = {
      ...selectedCapsule,
      polaroids: updatedPolaroids,
    };

    await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
      polaroids: updatedPolaroids,
    });

    setSelectedCapsule(updatedCapsule);
    setCapsules((prev) =>
      prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c))
    );

    setLightboxPolaroid({
      ...lightboxPolaroid,
      caption: editCaption,
      noteOnBack: editNoteOnBack,
      location: editLocation,
      date: editDate,
      folder_id: editFolderId,
    });

    setIsEditingPolaroid(false);
    try {
      confetti({ disableForReducedMotion: true, particleCount: 20, spread: 30 });
    } catch {}
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Add Folder inside active Capsule
  const handleAddFolderToCapsule = async () => { try {
    if (!selectedCapsule || !newFolderNameInCapsule.trim()) return;
    sfx.playChime();

    const newFolder: GalleryFolder = {
      id: `f-${Date.now()}`,
      name: newFolderNameInCapsule.trim(),
      icon: newFolderIconInCapsule || "📁",
      created_at: new Date().toISOString(),
    };

    const updatedFolders = [...(selectedCapsule.folders || []), newFolder];

    await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
      folders: updatedFolders,
    });

    const updatedCapsule = {
      ...selectedCapsule,
      folders: updatedFolders,
    };

    setSelectedCapsule(updatedCapsule);
    setCapsules((prev) =>
      prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c))
    );

    setNewFolderNameInCapsule("");
    setIsAddingFolderInCapsule(false);
    setOpenedFolderId(newFolder.id);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Add Text Note inside Capsule Folder
  const handleAddTextNoteToCapsule = async () => { try {
    if (!selectedCapsule || !newNoteContent.trim()) return;
    sfx.playChime();

    const newNote: TextNoteData = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim() || "Secret Note & Vow",
      content: newNoteContent.trim(),
      author: selectedCapsule.letter.author || "Partner",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      folder_id: openedFolderId || "f-letters",
    };

    const updatedNotes = [...(selectedCapsule.text_notes || []), newNote];

    await updateTimeCapsuleInDB(supabase, selectedCapsule.id, {
      text_notes: updatedNotes,
    });

    const updatedCapsule = {
      ...selectedCapsule,
      text_notes: updatedNotes,
    };

    setSelectedCapsule(updatedCapsule);
    setCapsules((prev) =>
      prev.map((c) => (c.id === updatedCapsule.id ? updatedCapsule : c))
    );

    setNewNoteTitle("");
    setNewNoteContent("");
    setIsAddingTextNote(false);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Decorative hold gesture; the server enforces ownership and the unlock date.
  

  async function handleUnlockSuccess() {
    setIsHoldingUnlock(false);
    sfx.playChime();
    try {
      if (!selectedCapsule) return;
      const opened = await updateCapsuleLockInDB(supabase, selectedCapsule.id, false);
      setCapsules(prev => prev.map(c => c.id === opened.id ? opened : c));
      setSelectedCapsule(opened);
      confetti({ disableForReducedMotion: true,
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f43f5e", "#fb7185", "#fbcfe8", "#d97706", "#ffffff"],
      });
    } catch (error) { setOperationError(error instanceof Error ? error.message : "This capsule could not be opened."); }
  };

  // Run sealing once from the timer, outside React state updaters.
  

  // FINAL SEAL: Saves capsule as SEALED/LOCKED, closes wizard, does NOT auto-open modal!
  async function finalizeNewCapsule() {
    if (isUploadingImage || isUploadingVideo || isAudioUploading || isLiveRecording) { setIsHoldingToSeal(false); setOperationError("Finish recording and uploading your memories before sealing."); return; }
    // Guard: prevent double-invocation from StrictMode or rapid seal triggers
    if (isFinalizingRef.current) return;
    isFinalizingRef.current = true;

    setIsHoldingToSeal(false);
    setIsSubmittingCapsule(true);
    sfx.playChime();

    const firstVoice = wizardVoiceNotes[0] || null;
    const firstVideo = wizardVideos[0] || null;
    const isCoupleMode = newSealMode === "couple";

    const newCapsuleItem: Omit<TimeCapsuleRecord, "id"> & { id?: string } = {
      id: wizardCapsuleIdRef.current || (wizardCapsuleIdRef.current = crypto.randomUUID()),
      title: newTitle || "A moment worth keeping",
      category: newCategory,
      sealed_date: new Date().toISOString().split("T")[0],
      unlock_date: newCategory === "open_when" ? "Open when you need it" : newUnlockDate,
      // For couple mode: save as UNLOCKED until partner co-seals
      is_locked: !isCoupleMode,
      seal_mode: newSealMode,
      seal_color: newSealColor,
      seal_stamp: newSealStamp,
      folders: wizardFolders,
      letter: {
        author: newLetterAuthor,
        greeting: newLetterGreeting,
        body:
          newLetterBody ||
          "A memory from today, saved for another day.",
        signOff: newLetterSignOff,
        paperTheme: newPaperTheme,
      },
      voice_note: firstVoice,
      voice_notes: wizardVoiceNotes,
      video_note: firstVideo,
      video_notes: wizardVideos,
      polaroids: uploadedPolaroids,
      text_notes: wizardTextNotes,
      predictions: wizardPredictions.filter((p) => p.question.trim() !== ""),
      secret_token: {
        type: "vow",
        title: "A memory for later",
        description: "Saved in your time capsule.",
        badge: "Personal keepsake",
      },
    };

    try {
      const created = await createTimeCapsuleInDB(
        supabase,
        newCapsuleItem,
        couple?.id,
        user?.id
      );
      savedWizardCapsuleRef.current = created.id;

      setCapsules((prev) => deduplicateCapsules([created, ...prev.filter((c) => c.id !== created.id)]));

      if (isCoupleMode) {
        // ── Couple Mode: create a seal request and show waiting screen ──
        const partnerId =
          couple?.partner_1_id === user?.id
            ? couple?.partner_2_id
            : couple?.partner_1_id;

        if (partnerId && user?.id) {
          const reqRes = await createCapsuleSealRequest(supabase, created.id, user.id, partnerId);
          if (reqRes.data) {
            setSealRequestMap((prev) => ({
              ...prev,
              [created.id]: reqRes.data!,
            }));
          }
        }

        // Show "waiting for partner" screen — keep wizard open on step 5
        setLastCreatedCapsuleId(created.id);
        setSealRequestSent(true);
        setIsSubmittingCapsule(false);
        isFinalizingRef.current = false;
        return; // Don't reset wizard yet — user sees waiting screen
      }

      // ── Solo Mode: normal confetti + close ──
      try {
        confetti({ disableForReducedMotion: true,
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#00aef0", "#9be3fc", "#16232d", "#ffffff"],
        });
      } catch {}

      // Reset Form Wizard and CLOSE WITHOUT AUTO-OPENING
      setIsCreateModalOpen(false);
      setCreateStep(1);
      setNewTitle("");
      setNewLetterBody("");
      setUploadedPolaroids([]);
      setWizardVideos([]);
      setWizardVoiceNotes([]);
      setWizardTextNotes([]);
      setLiveRecordSeconds(0);
      setNewSealMode(sharedOnly?"couple":"solo");
      setSealRequestSent(false);
      setLastCreatedCapsuleId(null);
      savedWizardCapsuleRef.current = null;
      wizardCapsuleIdRef.current = null;

      // Do NOT open detail modal automatically
      setIsDetailModalOpen(false);
      setSelectedCapsule(null);
    } catch (err: unknown) {
      alert("Failed to save time capsule: " + (err instanceof Error ? err.message : "Please try again."));
    } finally {
      setIsSubmittingCapsule(false);
      isFinalizingRef.current = false;
    }
  }

  const completeUnlock = useEffectEvent(() => { void handleUnlockSuccess(); });
  const completeSeal = useEffectEvent(() => { void finalizeNewCapsule(); });
  useEffect(() => {
    if (!isHoldingUnlock || !selectedCapsule) return;
    const startedAt = performance.now();
    sfx.playHeartbeat();
    const interval = setInterval(() => {
      const progress = Math.min(Math.round((performance.now() - startedAt) / 2000 * 100), 100);
      setUnlockProgress(progress);
      if (progress >= 100) { clearInterval(interval); completeUnlock(); }
    }, 40);
    return () => clearInterval(interval);
  }, [isHoldingUnlock, selectedCapsule]);

  useEffect(() => {
    if (!isHoldingToSeal) return;
    const startedAt = performance.now();
    sfx.playSealSound();
    const interval = setInterval(() => {
      const progress = Math.min(Math.round((performance.now() - startedAt) / 2000 * 100), 100);
      setSealProgress(progress);
      if (progress >= 100) { clearInterval(interval); completeSeal(); }
    }, 45);
    return () => clearInterval(interval);
  }, [isHoldingToSeal]);
;

  // Close wizard and purge unsealed assets if user cancels
  const handleCloseCreateWizard = async () => { try {
    if (isUploadingImage || isUploadingVideo || isAudioUploading || isSubmittingCapsule) { setOperationError("Wait for the current upload or save to finish before closing."); return; }
    setIsHoldingToSeal(false); setSealProgress(0);
    cancelledRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsLiveRecording(false);
    const unsealedUrls: string[] = [
      ...uploadedPolaroids.map((p) => p.image),
      ...wizardVideos.map((v) => v.videoUrl),
      ...wizardVoiceNotes.map((vn) => vn.audioUrl || ""),
    ].filter(Boolean);

    if (!savedWizardCapsuleRef.current && unsealedUrls.length > 0) {
      await purgeCloudinaryAssets(unsealedUrls);
    }

    setIsCreateModalOpen(false);
    setCreateStep(1);
    setNewTitle("");
    setNewLetterBody("");
    setUploadedPolaroids([]);
    setWizardVideos([]);
    setWizardVoiceNotes([]);
    setWizardTextNotes([]);
    setLiveRecordSeconds(0);
    setNewSealMode(sharedOnly?"couple":"solo");
    setSealRequestSent(false);
    setLastCreatedCapsuleId(null);
    savedWizardCapsuleRef.current = null;
    wizardCapsuleIdRef.current = null;
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Delete Capsule Handler
  const handleDeleteCapsule = async (capsule: TimeCapsuleRecord) => { try {
    if (!confirm("Permanently delete this time capsule and its photos, audio, and videos? This cannot be undone.")) return;
    sfx.playChime();
    await deleteTimeCapsuleFromDB(supabase, capsule.id, capsule);
    // Only remove the exact capsule by ID — same-named capsules must survive
    setCapsules((prev) => prev.filter((c) => c.id !== capsule.id));
    setIsDetailModalOpen(false);
    setSelectedCapsule(null);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Partner accepts the couple seal request → capsule becomes locked ───
  const handleAcceptSealRequest = async (req: CapsuleSealRequest) => { try {
    if (!user?.id) return;
    setRespondingRequestId(req.id);
    sfx.playSealSound();

    // 1. Mark request as accepted
    await respondToCapsuleSealRequest(supabase, req.id, "accepted");

    // 2. Seal the capsule (lock it) now that both parties agree
    await updateCapsuleLockInDB(supabase, req.capsule_id, true);

    // 3. Remove from pending list locally
    setPendingSealRequests((prev) => prev.filter((r) => r.id !== req.id));

    // 4. Update local seal request map
    setSealRequestMap((prev) => ({
      ...prev,
      [req.capsule_id]: { ...req, status: "accepted" },
    }));

    // 5. Refresh capsule list
    const data = await fetchTimeCapsulesFromDB(supabase, couple?.id, user.id);
    setCapsules(deduplicateCapsules(data));

    setRespondingRequestId(null);
    try {
      confetti({ disableForReducedMotion: true, particleCount: 80, spread: 80, origin: { y: 0.5 },
        colors: ["#00aef0", "#9be3fc", "#16232d", "#ffffff"] });
    } catch {}
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Partner declines the couple seal request → draft capsule is PRESERVED so creator can re-request ───
  const handleDeclineSealRequest = async (req: CapsuleSealRequest) => { try {
    if (!user?.id) return;
    if (!confirm("Decline this capsule seal request? Your partner will be notified and can request again.")) return;
    setRespondingRequestId(req.id);

    // 1. Mark as rejected in DB (do NOT delete capsule!)
    await respondToCapsuleSealRequest(supabase, req.id, "rejected");

    // 2. Remove from pending banner locally
    setPendingSealRequests((prev) => prev.filter((r) => r.id !== req.id));

    // 3. Update local seal request map
    setSealRequestMap((prev) => ({
      ...prev,
      [req.capsule_id]: { ...req, status: "rejected" },
    }));

    setRespondingRequestId(null);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Re-request couple seal after partner decline ───
  const handleResendSealRequest = async (capsuleId: string) => { try {
    if (!user?.id) return;
    const partnerId =
      couple?.partner_1_id === user.id ? couple?.partner_2_id : couple?.partner_1_id;
    if (!partnerId) {
      alert("Partner not found. Please ensure you are connected with your partner.");
      return;
    }

    setResendingCapsuleId(capsuleId);
    sfx.playChime();

    const res = await reRequestCapsuleSeal(supabase, capsuleId, user.id, partnerId);
    if (res.success && res.data) {
      setSealRequestMap((prev) => ({
        ...prev,
        [capsuleId]: res.data!,
      }));
      try {
        confetti({ disableForReducedMotion: true, particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else {
      alert("Could not re-send seal request: " + (res.error || "Unknown error"));
    }
    setResendingCapsuleId(null);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Partner approves an incoming unlock request from the top notification banner ───
  const handleApproveUnlockRequest = async (req: CapsuleSealRequest) => { try {
    if (!user?.id) return;
    setRespondingUnlockRequestId(req.id);
    sfx.playHeartbeat();

    const isRequester = req.requester_id === user.id;
    const role: "requester" | "partner" = isRequester ? "requester" : "partner";

    const result = await voteToCapsuleUnlock(supabase, req.id, role, true);

    if (result.bothVoted) {
      // Both partners have consented! Unlock the capsule in DB
      const opened = await updateCapsuleLockInDB(supabase, req.capsule_id, false);
      const updated = capsules.map((c) =>
        c.id === req.capsule_id ? opened : c
      );
      setCapsules(deduplicateCapsules(updated));

      // Open the unlocked capsule in the theater modal right away
      const target = updated.find((c) => c.id === req.capsule_id);
      if (target) {
        setSelectedCapsule(target);
        setActiveMemoryTab("letter");
        setIsDetailModalOpen(true);
      }

      try {
        confetti({ disableForReducedMotion: true, particleCount: 120, spread: 100, origin: { y: 0.5 },
          colors: ["#00aef0", "#9be3fc", "#16232d", "#ffffff"] });
      } catch {}
      sfx.playSealSound();
    }

    // Remove from pending unlock requests banner locally
    setPendingUnlockRequests((prev) => prev.filter((r) => r.id !== req.id));
    setRespondingUnlockRequestId(null);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Partner declines / postpones an incoming unlock request ───
  const handleDeclineUnlockRequest = async (req: CapsuleSealRequest) => { try {
    if (!confirm("Postpone opening this capsule? Your partner's unlock request will be reset.")) return;
    setRespondingUnlockRequestId(req.id);

    await resetCapsuleUnlockVotes(supabase, req.id);
    setPendingUnlockRequests((prev) => prev.filter((r) => r.id !== req.id));
    setRespondingUnlockRequestId(null);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // ─── Load couple unlock state when opening a couple capsule modal ───
  const loadCoupleUnlockState = async (capsule: TimeCapsuleRecord) => {
    if (capsule.seal_mode !== "couple") return;
    const voteRow = await fetchCapsuleUnlockVotes(supabase, capsule.id);
    setCoupleUnlockRequest(voteRow);
    if (voteRow && user?.id) {
      const isRequester = voteRow.requester_id === user.id;
      setMyUnlockVoteCast(isRequester ? voteRow.unlock_vote_requester : voteRow.unlock_vote_partner);
    } else {
      setMyUnlockVoteCast(false);
    }
  };

  // ─── User requests to open a couple capsule (from inside the detail modal) ───
  const handleRequestCoupleUnlock = async () => { try {
    if (!coupleUnlockRequest || !user?.id) return;
    setCoupleUnlockVoteLoading(true);
    sfx.playHeartbeat();

    const isRequester = coupleUnlockRequest.requester_id === user.id;
    const role: "requester" | "partner" = isRequester ? "requester" : "partner";

    const result = await voteToCapsuleUnlock(supabase, coupleUnlockRequest.id, role, true);
    setMyUnlockVoteCast(true);

    if (result.bothVoted && selectedCapsule) {
      // Both have voted — unlock the capsule
      const opened = await updateCapsuleLockInDB(supabase, selectedCapsule.id, false);
      const updated = capsules.map((c) =>
        c.id === selectedCapsule.id ? opened : c
      );
      setCapsules(deduplicateCapsules(updated));
      setSelectedCapsule(opened);
      try {
        confetti({ disableForReducedMotion: true, particleCount: 100, spread: 90, origin: { y: 0.5 },
          colors: ["#00aef0", "#9be3fc", "#16232d", "#ffffff"] });
      } catch {}
      sfx.playChime();
    }

    // Refresh lock state
    await loadCoupleUnlockState({ ...selectedCapsule!, seal_mode: "couple" });
    setCoupleUnlockVoteLoading(false);
  } catch (error) { setOperationError(error instanceof Error ? error.message : "The operation could not be completed. Please try again."); } finally { setRespondingRequestId(null); setRespondingUnlockRequestId(null); setResendingCapsuleId(null); setCoupleUnlockVoteLoading(false); } };

  // Visible Capsules: hides partner's solo capsules and unsealed couple drafts if not creator
  const visibleCapsules = useMemo(() => {
    const clean = deduplicateCapsules(capsules);
    return clean.filter((c) => {
      if(sharedOnly&&c.seal_mode!=="couple")return false;
      // Solo capsules are private to creator only
      if (c.seal_mode === "solo" && c.creator_id && user?.id && c.creator_id !== user.id) {
        return false;
      }
      // Unsealed couple draft capsules (awaiting co-seal or declined) only visible to creator
      if (c.seal_mode === "couple" && !c.is_locked && sealRequestMap[c.id]?.status !== "accepted") {
        const isCreator = c.creator_id
          ? c.creator_id === user?.id
          : (sealRequestMap[c.id]?.requester_id === user?.id);
        if (!isCreator) return false;
      }
      return true;
    });
  }, [capsules, user, sealRequestMap, sharedOnly]);

  // Non-empty folders helper for selected capsule
  const nonEmptyFoldersInSelectedCapsule = useMemo(() => {
    if (!selectedCapsule) return [];

    const allFolders = selectedCapsule.folders || [{ id: "f-memories", name: "Memories", icon: "📸" }];
    const polaroids = selectedCapsule.polaroids || [];
    const textNotes = selectedCapsule.text_notes || [];
    const videoNotes = selectedCapsule.video_notes || (selectedCapsule.video_note ? [selectedCapsule.video_note] : []);
    const voiceNotes = selectedCapsule.voice_notes || (selectedCapsule.voice_note ? [selectedCapsule.voice_note] : []);

    const filtered = allFolders.filter((folder) => {
      const hasPhoto = polaroids.some((p) => (p.folder_id || "f-memories") === folder.id);
      const hasNote = textNotes.some((n) => (n.folder_id || "f-letters") === folder.id);
      const hasVideo = videoNotes.some((v) => (v.folder_id || "f-memories") === folder.id);
      const hasVoice = voiceNotes.some((vn) => (vn.folder_id || "f-letters") === folder.id);
      return hasPhoto || hasNote || hasVideo || hasVoice;
    });

    // If all folders are empty, show all defined folders so user can add assets
    return filtered.length > 0 ? filtered : allFolders;
  }, [selectedCapsule]);

  const getSealStyles = (color: string) => ({
    crimson: "bg-[#b5354d] border-[#ecb5be] text-white",
    gold: "bg-[#c39a44] border-[#ead4a1] text-[#30220c]",
    velvet: "bg-[#7752a1] border-[#c4b0dd] text-white",
    emerald: "bg-[#398371] border-[#a9d6c8] text-white",
    rose: "bg-[#df6b87] border-[#f4c2cf] text-white",
  } as Record<string, string>)[color] || "bg-[#df6b87] border-[#f4c2cf] text-white";

  return (
    <MotionConfig reducedMotion="user"><div className={styles.studio}>
      {operationError && <div role="alert" className="max-w-5xl mx-auto p-4 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">{operationError}</div>}

      {/* ─── Pending Couple Seal Requests Banner ─── */}
      {couple?.is_connected && pendingSealRequests.length > 0 && (
        <div className={`${styles.requestList} max-w-5xl mx-auto px-4 pt-4 space-y-3`}>
          {pendingSealRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-sky-50 border border-amber-300/80 shadow-md"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                  <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Couple Seal Request
                  </div>
                  <p className="text-sm font-semibold text-[#16232d] mt-0.5 line-clamp-1">
                    Your partner wants to seal <span className="text-sky-600">&quot;{req.capsule_title || "a capsule"}&quot;</span> together with you
                  </p>
                  <p className="text-[11px] text-[#617c8b] mt-0.5">
                    Accept to co-seal this capsule — it will lock for both of you. If you decline, your partner can adjust and request again.
                  </p>
                </div>
              </div>
              <div className={`${styles.requestActions} flex items-center gap-2 shrink-0`}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={respondingRequestId === req.id}
                  onClick={() => handleAcceptSealRequest(req)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-60"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Accept & Co-Seal
                </motion.button>
                <button
                  disabled={respondingRequestId === req.id}
                  onClick={() => handleDeclineSealRequest(req)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Decline
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Pending Couple Unlock Requests Banner (Partner Notification) ─── */}
      {couple?.is_connected && pendingUnlockRequests.length > 0 && (
        <div className={`${styles.requestList} max-w-5xl mx-auto px-4 pt-4 space-y-3`}>
          {pendingUnlockRequests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-50 via-sky-50 to-amber-50 border border-sky-300 shadow-lg shadow-sky-100/70"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0 border border-sky-200">
                  <Unlock className="w-5 h-5 text-sky-600 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                    <span>Capsule Unlock Request</span>
                  </div>
                  <p className="text-sm font-semibold text-[#16232d] mt-0.5 line-clamp-1">
                    Your partner is requesting to open <span className="text-sky-600 font-bold">&quot;{req.capsule_title || "a capsule"}&quot;</span> together with you!
                  </p>
                  <p className="text-[11px] text-[#617c8b] mt-0.5">
                    Both partners must agree to unlock. Approve to open your shared memories when the opening date arrives.
                  </p>
                </div>
              </div>
              <div className={`${styles.requestActions} flex items-center gap-2 shrink-0`}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={respondingUnlockRequestId === req.id}
                  onClick={() => handleApproveUnlockRequest(req)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-love-primary text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-60"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{respondingUnlockRequestId === req.id ? "Unlocking..." : "Approve & Unlock"}</span>
                </motion.button>
                <button
                  disabled={respondingUnlockRequestId === req.id}
                  onClick={() => {
                    const target = capsules.find((c) => c.id === req.capsule_id);
                    if (target) {
                      setSelectedCapsule(target);
                      setActiveMemoryTab("letter");
                      setIsDetailModalOpen(true);
                      loadCoupleUnlockState(target);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
                <button
                  disabled={respondingUnlockRequestId === req.id}
                  onClick={() => handleDeclineUnlockRequest(req)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                >
                  <span>Not Yet</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CapsuleDashboard sharedOnly={sharedOnly} capsules={visibleCapsules} loading={loading} loadError={loadError} connected={Boolean(couple?.is_connected)}
        requests={sealRequestMap} unlockRequests={pendingUnlockRequests} resendingId={resendingCapsuleId}
        ambient={isAmbientAudioOn} onToggleAmbient={toggleAmbientSound} onRetry={() => setReloadVersion(value => value + 1)}
        onCreate={prompt => { if (prompt) setNewLetterBody(`${prompt}\n\n`); setIsCreateModalOpen(true); }}
        onOpen={capsule => {
          setSelectedCapsule(capsule); setActiveMemoryTab("letter"); setOpenedFolderId(null);
          setEditablePredictions(capsule.predictions || []); setIsEditingPredictions(false); setIsDetailModalOpen(true);
          if (capsule.seal_mode === "couple" && capsule.is_locked) {
            setCoupleUnlockRequest(null); setMyUnlockVoteCast(false);
            void loadCoupleUnlockState(capsule).catch(() => setOperationError("The approval status couldn’t be loaded. Close the capsule and try again."));
          }
        }}
        onDelete={capsule => void handleDeleteCapsule(capsule)} onResend={id => void handleResendSealRequest(id)} />

      {/* ─── FULLSCREEN CAPSULE THEATER MODAL ─── */}
      <AnimatePresence>
        {isDetailModalOpen && selectedCapsule && (
          <CapsuleDialog label={`Capsule: ${selectedCapsule.title}`} onClose={() => { setIsHoldingUnlock(false); setIsDetailModalOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className={`${styles.dialogPanel} relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-sky-200 overflow-hidden my-auto max-h-[92vh] flex flex-col`}
            >
              {/* Modal Top Header */}
              <div className={`${styles.dialogHeader} p-4 sm:p-5 bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 border-b border-sky-200 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border shadow-xs ${getSealStyles(
                      selectedCapsule.seal_color
                    )}`}
                  >
                    {selectedCapsule.seal_stamp}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-[#16232d] line-clamp-1">
                      {selectedCapsule.title}
                    </h2>
                    <div className={`${styles.dialogMeta} text-[11px] text-[#5f7b8c] font-medium flex items-center gap-2`}>
                      <span>Sealed: {selectedCapsule.sealed_date}</span>
                      <span>•</span>
                      <span className="font-bold text-sky-600">
                        {selectedCapsule.is_locked ? "Sealed capsule" : "Opened memory"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteCapsule(selectedCapsule)}
                    title="Delete capsule"
                    aria-label="Delete capsule"
                    className="w-8 h-8 rounded-full bg-white/80 hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors cursor-pointer border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setIsHoldingUnlock(false); setIsDetailModalOpen(false); }}
                    aria-label="Close capsule"
                    className="w-8 h-8 rounded-full bg-white/80 hover:bg-sky-100 text-sky-900 flex items-center justify-center transition-colors cursor-pointer border border-sky-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className={`${styles.dialogBody} p-5 sm:p-7 overflow-y-auto flex-1 space-y-6`}>
                {operationError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{operationError}</p>}
                {/* CASE A: CAPSULE IS LOCKED */}
                {selectedCapsule.is_locked ? (
                  <div className="py-6 text-center space-y-6">
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="absolute inset-0 rounded-full bg-sky-200 blur-md"
                      />
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-xl relative z-10">
                        <Lock className="w-10 h-10" />
                      </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-2">
                      <h3 className="text-2xl font-extrabold text-[#16232d]">
                        {selectedCapsule.seal_mode === "couple" ? "💑 Couple Vault — Sealed Together" : "Private Solo Capsule"}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#526e7e] font-medium leading-relaxed">
                        This time capsule is sealed until{" "}
                        <span className="font-bold text-sky-600">
                          {selectedCapsule.unlock_date.includes("T")
                            ? new Date(selectedCapsule.unlock_date).toLocaleDateString()
                            : selectedCapsule.unlock_date}
                        </span>
                        {selectedCapsule.seal_mode === "couple"
                          ? ". Both partners must consent to open this shared capsule."
                          : ". Only you can open this solo capsule once the date arrives."}
                      </p>
                    </div>

                    {/* ── COUPLE CAPSULE: Dual-Vote Unlock Panel ── */}
                    {selectedCapsule.seal_mode === "couple" ? (
                      <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-50 to-cyan-50/50 border border-sky-200/80 max-w-md mx-auto space-y-5">
                        <div className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-3.5 h-3.5" />
                          Couple Unlock — Dual Consent Required
                        </div>

                        {coupleUnlockRequest ? (
                          <>
                            {/* Partner requested unlock callout banner */}
                            {((coupleUnlockRequest.requester_id === user?.id && coupleUnlockRequest.unlock_vote_partner && !coupleUnlockRequest.unlock_vote_requester) ||
                              (coupleUnlockRequest.partner_id === user?.id && coupleUnlockRequest.unlock_vote_requester && !coupleUnlockRequest.unlock_vote_partner)) && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-100 to-sky-100 border border-sky-300 flex items-center gap-3 text-left shadow-xs"
                              >
                                <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Bell className="w-4 h-4 animate-bounce" />
                                </div>
                                <div>
                                  <div className="text-xs font-extrabold text-sky-950">Partner Requested Unlock!</div>
                                  <p className="text-[11px] text-sky-800 font-medium">Your partner wants to open this capsule together. Cast your vote below to unlock!</p>
                                </div>
                              </motion.div>
                            )}

                            {/* Vote status indicators */}
                            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                              <div className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                                coupleUnlockRequest.unlock_vote_requester
                                  ? "bg-emerald-50 border-emerald-300"
                                  : "bg-white border-sky-200"
                              }`}>
                                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                  coupleUnlockRequest.unlock_vote_requester
                                    ? "bg-emerald-500 text-white"
                                    : "bg-sky-100 text-sky-400"
                                }`}>
                                  {coupleUnlockRequest.unlock_vote_requester
                                    ? <Check className="w-4 h-4" />
                                    : <Clock className="w-4 h-4" />}
                                </div>
                                <div className="text-[10px] font-bold text-[#16232d]">
                                  {coupleUnlockRequest.requester_id === user?.id ? "You (Creator)" : "Partner (Creator)"}
                                </div>
                                <div className={`text-[10px] font-semibold ${
                                  coupleUnlockRequest.unlock_vote_requester ? "text-emerald-700" : "text-sky-500"
                                }`}>
                                  {coupleUnlockRequest.unlock_vote_requester ? "✓ Approved" : "Pending..."}
                                </div>
                              </div>

                              <div className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                                coupleUnlockRequest.unlock_vote_partner
                                  ? "bg-emerald-50 border-emerald-300"
                                  : "bg-white border-sky-200"
                              }`}>
                                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                                  coupleUnlockRequest.unlock_vote_partner
                                    ? "bg-emerald-500 text-white"
                                    : "bg-sky-100 text-sky-400"
                                }`}>
                                  {coupleUnlockRequest.unlock_vote_partner
                                    ? <Check className="w-4 h-4" />
                                    : <Clock className="w-4 h-4" />}
                                </div>
                                <div className="text-[10px] font-bold text-[#16232d]">
                                  {coupleUnlockRequest.partner_id === user?.id ? "You (Partner)" : "Partner"}
                                </div>
                                <div className={`text-[10px] font-semibold ${
                                  coupleUnlockRequest.unlock_vote_partner ? "text-emerald-700" : "text-sky-500"
                                }`}>
                                  {coupleUnlockRequest.unlock_vote_partner ? "✓ Approved" : "Pending..."}
                                </div>
                              </div>
                            </div>

                            {/* My vote button */}
                            {!myUnlockVoteCast ? (
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={coupleUnlockVoteLoading}
                                onClick={handleRequestCoupleUnlock}
                                className="w-full py-3 rounded-2xl btn-love-primary text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                              >
                                <Fingerprint className="w-4 h-4" />
                                {coupleUnlockVoteLoading ? "Casting your vote..." : (coupleUnlockRequest.unlock_vote_requester || coupleUnlockRequest.unlock_vote_partner ? "Approve & Unlock Together 🔓" : "I Want to Open This Capsule")}
                              </motion.button>
                            ) : (
                              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                                <p className="text-xs font-bold text-emerald-700">✓ Your unlock vote has been cast!</p>
                                <p className="text-[11px] text-emerald-600 mt-0.5">Waiting for your partner to approve...</p>
                              </div>
                            )}
                          </>
                        ) : (
                          /* No accepted seal request found — capsule might be awaiting co-seal still or was declined */
                          sealRequestMap[selectedCapsule.id]?.status === "rejected" ? (
                            <div className="text-center space-y-4 py-4">
                              <div className="w-14 h-14 rounded-full bg-red-100 mx-auto flex items-center justify-center border border-red-200">
                                <UserX className="w-7 h-7 text-red-600" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-extrabold text-[#16232d]">Partner Declined Co-Seal</h4>
                                <p className="text-xs text-[#526e7e] font-medium max-w-xs mx-auto">
                                  Your partner declined the initial request to seal this capsule together. You can send the request again whenever you are ready!
                                </p>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={resendingCapsuleId === selectedCapsule.id}
                                onClick={() => handleResendSealRequest(selectedCapsule.id)}
                                className="px-6 py-2.5 rounded-2xl btn-love-primary text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                              >
                                <Send className={`w-3.5 h-3.5 ${resendingCapsuleId === selectedCapsule.id ? "animate-spin" : ""}`} />
                                <span>{resendingCapsuleId === selectedCapsule.id ? "Sending..." : "Send Request Again"}</span>
                              </motion.button>
                            </div>
                          ) : (
                            <div className="text-center space-y-3 py-4">
                              <div className="w-14 h-14 rounded-full bg-amber-100 mx-auto flex items-center justify-center border border-amber-200">
                                <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-extrabold text-[#16232d]">Awaiting Partner Co-Seal</h4>
                                <p className="text-xs text-[#526e7e] font-medium max-w-xs mx-auto">
                                  Your partner received a notification to co-seal this capsule. It will lock as soon as they accept.
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      /* ── SOLO CAPSULE: Fingerprint Hold-to-Unlock ── */
                      <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-50 to-cyan-50/50 border border-sky-200/80 max-w-md mx-auto space-y-4">
                        <div className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                          Hold to Open Your Solo Capsule
                        </div>

                        <div className="relative flex justify-center">
                          <motion.button
                            onMouseDown={() => { setUnlockProgress(0); setIsHoldingUnlock(true); }}
                            onMouseUp={() => setIsHoldingUnlock(false)}
                            onMouseLeave={() => setIsHoldingUnlock(false)}
                            onTouchStart={() => { setUnlockProgress(0); setIsHoldingUnlock(true); }}
                            onTouchEnd={() => setIsHoldingUnlock(false)}
                            onTouchCancel={() => setIsHoldingUnlock(false)}
                            onContextMenu={event => event.preventDefault()}
                            onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); setIsHoldingUnlock(true); } }}
                            onKeyUp={() => setIsHoldingUnlock(false)}
                            onBlur={() => setIsHoldingUnlock(false)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`${styles.holdToOpen} w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden select-none ${
                              isHoldingUnlock
                                ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/40"
                                : "border-sky-300 bg-white text-sky-600 hover:border-sky-400"
                            }`}
                          >
                            <Fingerprint className="w-10 h-10 animate-pulse" />
                            <span className="text-[10px] font-bold mt-1">
                              {isHoldingUnlock ? "Opening…" : "Press & Hold"}
                            </span>

                            {isHoldingUnlock && (
                              <div
                                className="absolute bottom-0 left-0 right-0 bg-sky-700/60 transition-all duration-75"
                                style={{ height: `${unlockProgress}%` }}
                              />
                            )}
                          </motion.button>
                        </div>

                        <div className="text-[11px] text-[#617c8b] font-medium">
                          {isHoldingUnlock
                            ? `Opening your capsule (${unlockProgress}%)`
                            : "Hold for 2 seconds to open. The opening date must have arrived."}
                        </div>
                      </div>
                    )}
                  </div>

                ) : (
                  /* CASE B: CAPSULE IS UNLOCKED */
                  <div className="space-y-6">
                    {/* Navigation Tabs (Handwritten Letter Shows First) */}
                    <div className={`${styles.memoryTabs} flex items-center justify-center gap-2 border-b border-sky-200 pb-3 flex-wrap`}>
                      <button
                        onClick={() => {
                          sfx.playChime();
                          setActiveMemoryTab("letter");
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeMemoryTab === "letter"
                            ? "bg-sky-500 text-white shadow-xs"
                            : "bg-sky-50 text-[#617c8b] hover:bg-sky-100"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Handwritten Letter</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.playChime();
                          setActiveMemoryTab("gallery");
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeMemoryTab === "gallery"
                            ? "bg-sky-500 text-white shadow-xs"
                            : "bg-sky-50 text-[#617c8b] hover:bg-sky-100"
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Memory Folders ({nonEmptyFoldersInSelectedCapsule.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.playChime();
                          setActiveMemoryTab("predictions");
                          setEditablePredictions(selectedCapsule.predictions || []);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeMemoryTab === "predictions"
                            ? "bg-sky-500 text-white shadow-xs"
                            : "bg-sky-50 text-[#617c8b] hover:bg-sky-100"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Predictions ({selectedCapsule.predictions?.length || 0})</span>
                      </button>
                    </div>

                    {/* TAB 1: Handwritten Letter (Default First View) */}
                    {activeMemoryTab === "letter" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${styles.memoryLetter} p-6 sm:p-8 rounded-3xl bg-[#fbf7ee] border border-[#e6d8be] shadow-inner text-[#3d2716] relative overflow-hidden`}
                      >
                        <div className="absolute top-4 right-4 opacity-15 text-5xl">💌</div>
                        <div className="font-script text-2xl sm:text-3xl text-[#881337] mb-4">
                          {selectedCapsule.letter.greeting}
                        </div>
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line font-serif">
                          {selectedCapsule.letter.body}
                        </p>
                        <div className="mt-6 pt-4 border-t border-[#dfcfb0] font-script text-xl sm:text-2xl text-[#881337] text-right">
                          <p>{selectedCapsule.letter.signOff}</p>
                          <p className="text-2xl sm:text-3xl font-bold">{selectedCapsule.letter.author}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: REAL FOLDER GALLERY SYSTEM */}
                    {activeMemoryTab === "gallery" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* VIEW A: INSIDE A SPECIFIC FOLDER */}
                        {openedFolderId ? (
                          <div className="space-y-6">
                            {/* Breadcrumb Header */}
                            <div className={`${styles.folderToolbar} flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200`}>
                              <button
                                onClick={() => setOpenedFolderId(null)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-sky-200 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5 text-sky-500" />
                                <span>Back to All Folders</span>
                              </button>

                              <div className="text-xs font-extrabold text-[#16232d] flex items-center gap-1.5">
                                <span>
                                  {selectedCapsule.folders?.find((f) => f.id === openedFolderId)?.icon || "📁"}
                                </span>
                                <span>
                                  {selectedCapsule.folders?.find((f) => f.id === openedFolderId)?.name || "Folder"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="btn-love-primary px-3 py-1 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs inline-flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  <span>Add Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handlePhotoUpload(e, openedFolderId)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>

                            {/* 1. Photos in this Folder */}
                            {selectedCapsule.polaroids.filter((p) => (p.folder_id || "f-memories") === openedFolderId).length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Photos & Polaroids</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
                                  {selectedCapsule.polaroids
                                    .filter((p) => (p.folder_id || "f-memories") === openedFolderId)
                                    .map((p) => (
                                      <div
                                        key={p.id}
                                        onClick={() => openPolaroidLightbox(p)}
                                        className="cursor-pointer group select-none"
                                        style={{ transform: `rotate(${p.rotation || 0}deg)` }}
                                      >
                                        <motion.div
                                          whileHover={{ scale: 1.04, rotate: 0 }}
                                          className="bg-white p-3 pb-4 rounded-xl shadow-lg border border-stone-200 transition-all relative overflow-hidden"
                                        >
                                          <div className="relative w-full h-44 rounded-md overflow-hidden bg-sky-50 mb-3">
                                            <Image unoptimized
                                              src={p.image}
                                              alt={p.caption}
                                              fill
                                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Maximize2 className="w-3 h-3" />
                                              <span>Fullsize</span>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <p className="font-script text-xl text-[#16232d] line-clamp-1 font-bold">
                                              {p.caption || "Untitled memory"}
                                            </p>
                                            <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                                              {p.date} • {p.location || ""}
                                            </p>
                                          </div>
                                        </motion.div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* 2. Videos in this Folder */}
                            {(selectedCapsule.video_notes || (selectedCapsule.video_note ? [selectedCapsule.video_note] : []))
                              .filter((v) => (v.folder_id || "f-memories") === openedFolderId)
                              .length > 0 && (
                              <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                                  <VideoIcon className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Video memories</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {(selectedCapsule.video_notes || (selectedCapsule.video_note ? [selectedCapsule.video_note] : []))
                                    .filter((v) => (v.folder_id || "f-memories") === openedFolderId)
                                    .map((vid) => (
                                      <div key={vid.id || vid.videoUrl} className="p-3 bg-white rounded-2xl border border-sky-200 shadow-sm space-y-2">
                                        <div className="rounded-xl overflow-hidden bg-black aspect-video">
                                          <video src={vid.videoUrl} controls className="w-full h-full object-cover" />
                                        </div>
                                        {editingVideoId === vid.id ? (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={editingVideoTitleText}
                                              onChange={(e) => setEditingVideoTitleText(e.target.value)}
                                              placeholder="Video Title"
                                              className="flex-1 px-2 py-1 rounded-lg border border-sky-300 text-xs font-bold"
                                            />
                                            <button
                                              onClick={() => saveVideoTitleEdit(vid.id || "")}
                                              className="btn-love-primary px-3 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingVideoId(null)}
                                              className="text-xs text-sky-700 font-bold"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#16232d] line-clamp-1">{vid.title}</span>
                                            <button
                                              onClick={() => {
                                                setEditingVideoId(vid.id || null);
                                                setEditingVideoTitleText(vid.title || "");
                                              }}
                                              className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                              <span>Edit Name</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* 3. Retro Animated Cassette Tape Audio Player */}
                            {(selectedCapsule.voice_notes || (selectedCapsule.voice_note ? [selectedCapsule.voice_note] : []))
                              .filter((vn) => (vn.folder_id || "f-letters") === openedFolderId)
                              .length > 0 && (
                              <div className="space-y-4 pt-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Voice Tape Recordings</span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(selectedCapsule.voice_notes || (selectedCapsule.voice_note ? [selectedCapsule.voice_note] : []))
                                    .filter((vn) => (vn.folder_id || "f-letters") === openedFolderId)
                                    .map((vn) => {
                                      const isCurrentPlaying = playingAudioUrl === vn.audioUrl;
                                      return (
                                        <div
                                          key={vn.id || vn.audioUrl}
                                          className="p-5 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 text-white shadow-xl border-2 border-stone-700 space-y-4 relative overflow-hidden"
                                        >
                                          {/* Hidden Audio Element */}
                                          {vn.audioUrl && (
                                            <audio
                                              id={`audio-${vn.id || vn.audioUrl}`}
                                              src={vn.audioUrl}
                                              onEnded={() => setPlayingAudioUrl(null)}
                                              onTimeUpdate={(e) => {
                                                if (isCurrentPlaying) {
                                                  const target = e.currentTarget;
                                                  const prog = (target.currentTime / (target.duration || 1)) * 100;
                                                  setAudioPlaybackProgress(prog || 0);
                                                }
                                              }}
                                            />
                                          )}

                                          {/* Cassette Header Label */}
                                          <div className="flex items-center justify-between border-b border-stone-700/80 pb-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                                              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 line-clamp-1">
                                                {vn.title}
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-stone-400">
                                              {vn.duration}
                                            </span>
                                          </div>

                                          {/* Retro Cassette Spools Center Window */}
                                          <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-stone-700 flex items-center justify-around relative">
                                            {/* Left Tape Reel */}
                                            <motion.div
                                              animate={{ rotate: isCurrentPlaying ? 360 : 0 }}
                                              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                                              className="w-12 h-12 rounded-full border-4 border-dashed border-sky-400 flex items-center justify-center bg-stone-900 shadow-inner"
                                            >
                                              <div className="w-4 h-4 rounded-full bg-stone-700 border border-stone-600" />
                                            </motion.div>

                                            {/* Magnetic Tape Visual Strip */}
                                            <div className="flex-1 mx-3 h-2 rounded-full bg-stone-800 border border-stone-700 relative overflow-hidden">
                                              <div
                                                className="h-full bg-gradient-to-r from-amber-700 to-amber-900 opacity-80"
                                                style={{ width: "100%" }}
                                              />
                                            </div>

                                            {/* Right Tape Reel */}
                                            <motion.div
                                              animate={{ rotate: isCurrentPlaying ? 360 : 0 }}
                                              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                                              className="w-12 h-12 rounded-full border-4 border-dashed border-cyan-400 flex items-center justify-center bg-stone-900 shadow-inner"
                                            >
                                              <div className="w-4 h-4 rounded-full bg-stone-700 border border-stone-600" />
                                            </motion.div>
                                          </div>

                                          {/* Scrubber Progress Bar */}
                                          <div className="space-y-1">
                                            <div className="w-full h-1.5 rounded-full bg-stone-700 overflow-hidden">
                                              <div
                                                className="h-full bg-gradient-to-r from-sky-500 via-cyan-500 to-amber-400 transition-all duration-150"
                                                style={{ width: isCurrentPlaying ? `${audioPlaybackProgress}%` : "0%" }}
                                              />
                                            </div>
                                          </div>

                                          {/* Cassette Controls */}
                                          <div className="flex items-center justify-between pt-1">
                                            <div className="text-[11px] text-stone-400">
                                              Recorded by <span className="text-white font-bold">{vn.speaker || "Partner"}</span>
                                            </div>

                                            <button
                                              onClick={() => {
                                                sfx.playChime();
                                                const audioElement = document.getElementById(
                                                  `audio-${vn.id || vn.audioUrl}`
                                                ) as HTMLAudioElement | null;

                                                if (audioElement) {
                                                  if (isCurrentPlaying) {
                                                    audioElement.pause();
                                                    setPlayingAudioUrl(null);
                                                  } else {
                                                    // Pause any other playing audio
                                                    document.querySelectorAll("audio").forEach((a) => a.pause());
                                                    audioElement.play();
                                                    setPlayingAudioUrl(vn.audioUrl || null);
                                                  }
                                                }
                                              }}
                                              className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                                            >
                                              {isCurrentPlaying ? (
                                                <>
                                                  <Pause className="w-3.5 h-3.5" />
                                                  <span>Pause Tape</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Play className="w-3.5 h-3.5 fill-white" />
                                                  <span>Play Tape</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* 4. Secret Notes & Vows in this Folder */}
                            <div className="space-y-3 pt-4 border-t border-sky-100">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                                  <StickyNote className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Written notes in this folder</span>
                                </h4>

                                <button
                                  onClick={() => setIsAddingTextNote(!isAddingTextNote)}
                                  className="px-3 py-1 rounded-xl bg-white border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-all cursor-pointer"
                                >
                                  {isAddingTextNote ? "Cancel Note" : "+ Write Note"}
                                </button>
                              </div>

                              {isAddingTextNote && (
                                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                                  <input
                                    type="text"
                                    placeholder="Note Title (e.g. A Promise for Rainy Days)"
                                    value={newNoteTitle}
                                    onChange={(e) => setNewNoteTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold"
                                  />
                                  <textarea
                                    rows={4}
                                    placeholder="Write your secret note or message here..."
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-amber-200 bg-white font-serif text-xs leading-relaxed"
                                  />
                                  <button
                                    onClick={handleAddTextNoteToCapsule}
                                    className="btn-love-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                                  >
                                    Save Note to Folder
                                  </button>
                                </div>
                              )}

                              {(selectedCapsule.text_notes || []).filter((n) => n.folder_id === openedFolderId).map((note) => (
                                <div key={note.id} className="p-4 rounded-2xl bg-[#fffcf5] border border-amber-200/80 shadow-xs space-y-1.5 text-left font-serif">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-sm text-[#2b4351]">{note.title}</h5>
                                    <span className="text-[10px] text-stone-500 font-sans">{note.date}</span>
                                  </div>
                                  <p className="text-xs text-[#496777] leading-relaxed whitespace-pre-line">{note.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* VIEW B: ALL FOLDERS (SHOWING ONLY NON-EMPTY FOLDERS) */
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-[#16232d] flex items-center gap-2">
                                <Layers className="w-4 h-4 text-sky-500" />
                                <span>Memory Folders ({nonEmptyFoldersInSelectedCapsule.length})</span>
                              </h3>

                              <button
                                onClick={() => setIsAddingFolderInCapsule(true)}
                                className="px-3.5 py-1.5 rounded-full bg-white border border-sky-300 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
                                <span>+ Create New Folder</span>
                              </button>
                            </div>

                            {/* Create Folder Drawer */}
                            {isAddingFolderInCapsule && (
                              <div className="p-4 rounded-2xl bg-white border border-sky-300 shadow-md flex items-center gap-2 max-w-lg mx-auto">
                                <input
                                  type="text"
                                  placeholder="Folder Name (e.g. Paris Trip 2025)"
                                  value={newFolderNameInCapsule}
                                  onChange={(e) => setNewFolderNameInCapsule(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-xl border border-sky-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                                <select
                                  value={newFolderIconInCapsule}
                                  onChange={(e) => setNewFolderIconInCapsule(e.target.value)}
                                  className="px-2.5 py-2 rounded-xl border border-sky-200 text-xs font-bold bg-sky-50"
                                >
                                  <option value="📁">📁 General</option>
                                  <option value="📸">📸 Photos</option>
                                  <option value="🏖️">🏖️ Vacation</option>
                                  <option value="🍷">🍷 Date Night</option>
                                  <option value="💍">💍 Milestones</option>
                                  <option value="💌">💌 Notes</option>
                                  <option value="✈️">✈️ Travel</option>
                                  <option value="🎥">🎥 Videos</option>
                                  <option value="🎙️">🎙️ Voice</option>
                                </select>
                                <button
                                  onClick={handleAddFolderToCapsule}
                                  className="btn-love-primary px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                                >
                                  Create
                                </button>
                                <button
                                  onClick={() => setIsAddingFolderInCapsule(false)}
                                  className="px-2 py-2 rounded-xl text-xs font-bold text-sky-700 hover:bg-sky-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {/* Folders Grid - ONLY NON-EMPTY */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {nonEmptyFoldersInSelectedCapsule.map((f) => {
                                const photoCount = (selectedCapsule.polaroids || []).filter(
                                  (p) => (p.folder_id || "f-memories") === f.id
                                ).length;
                                const noteCount = (selectedCapsule.text_notes || []).filter(
                                  (n) => n.folder_id === f.id
                                ).length;
                                const videoCount = (selectedCapsule.video_notes || (selectedCapsule.video_note ? [selectedCapsule.video_note] : [])).filter(
                                  (v) => (v.folder_id || "f-memories") === f.id
                                ).length;
                                const voiceCount = (selectedCapsule.voice_notes || (selectedCapsule.voice_note ? [selectedCapsule.voice_note] : [])).filter(
                                  (vn) => (vn.folder_id || "f-letters") === f.id
                                ).length;

                                const badges: string[] = [];
                                if (photoCount > 0) badges.push(`${photoCount} Photos`);
                                if (videoCount > 0) badges.push(`${videoCount} Videos`);
                                if (voiceCount > 0) badges.push(`${voiceCount} Audio`);
                                if (noteCount > 0) badges.push(`${noteCount} Notes`);

                                return (
                                  <div
                                    key={f.id}
                                    onClick={() => {
                                      sfx.playChime();
                                      setOpenedFolderId(f.id);
                                    }}
                                    className="p-5 rounded-3xl bg-gradient-to-br from-white to-sky-50/60 border border-sky-200/90 shadow-md hover:shadow-xl hover:border-sky-300 transition-all cursor-pointer group flex flex-col justify-between"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="w-12 h-12 rounded-2xl bg-sky-100/80 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {f.icon || "📁"}
                                      </div>
                                      <span className="px-2.5 py-1 rounded-full bg-white border border-sky-200 text-[10px] font-bold text-sky-700">
                                        {badges.join(" • ") || "Empty"}
                                      </span>
                                    </div>

                                    <div className="mt-4">
                                      <h4 className="text-base font-extrabold text-[#16232d] group-hover:text-sky-600 transition-colors">
                                        {f.name}
                                      </h4>
                                      <p className="text-[11px] text-[#5f7b8c] mt-1 font-medium">
                                        Click to open & view contents →
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* TAB 3: Future Predictions & Bets */}
                    {activeMemoryTab === "predictions" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/80 border border-sky-200">
                          <div className="text-xs text-[#5f7b8c] font-medium">
                            {isEditingPredictions
                              ? "Edit questions, update partner answers, or check off predictions!"
                              : "Review your sealed predictions and mark what came true!"}
                          </div>

                          <button
                            onClick={() => {
                              if (isEditingPredictions) {
                                savePredictionsEdit();
                              } else {
                                setIsEditingPredictions(true);
                              }
                            }}
                            className="btn-love-primary px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            {isEditingPredictions ? (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Save All Prediction Answers</span>
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit / Answer Predictions</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* List of Predictions */}
                        <div className="space-y-3.5 max-w-2xl mx-auto">
                          {(isEditingPredictions ? editablePredictions : (selectedCapsule.predictions || [])).map((pred, i) => (
                            <div
                              key={i}
                              className="p-5 rounded-2xl bg-white border border-sky-200 shadow-sm space-y-3 text-left"
                            >
                              {isEditingPredictions ? (
                                <div className="space-y-2">
                                  <label className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
                                    Prediction Question #{i + 1}
                                  </label>
                                  <input
                                    type="text"
                                    value={pred.question}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditablePredictions((prev) =>
                                        prev.map((p, idx) => (idx === i ? { ...p, question: val } : p))
                                      );
                                    }}
                                    className="w-full px-3 py-1.5 rounded-xl border border-sky-300 text-xs font-bold bg-sky-50/30"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-extrabold text-[#16232d]">
                                    🔮 &ldquo;{pred.question}&rdquo;
                                  </h4>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                      pred.status === "came_true"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : pred.status === "plot_twist"
                                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {pred.status === "came_true"
                                      ? "✅ Came True!"
                                      : pred.status === "plot_twist"
                                      ? "🎭 Plot Twist!"
                                      : "⏳ Sealed Guess"}
                                  </span>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
                                <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100">
                                  <span className="text-[10px] font-bold text-sky-600 block mb-1">
                                    Partner 1 Guess / Answer:
                                  </span>
                                  {isEditingPredictions ? (
                                    <input
                                      type="text"
                                      placeholder="Partner 1's prediction..."
                                      value={pred.partner1Answer}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditablePredictions((prev) =>
                                          prev.map((p, idx) => (idx === i ? { ...p, partner1Answer: val } : p))
                                        );
                                      }}
                                      className="w-full px-2 py-1 rounded-lg border border-sky-200 bg-white text-xs"
                                    />
                                  ) : (
                                    <span className="text-[#253e4d]">
                                      {pred.partner1Answer || "No answer recorded yet."}
                                    </span>
                                  )}
                                </div>

                                <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100">
                                  <span className="text-[10px] font-bold text-cyan-600 block mb-1">
                                    Partner 2 Guess / Answer:
                                  </span>
                                  {isEditingPredictions ? (
                                    <input
                                      type="text"
                                      placeholder="Partner 2's prediction..."
                                      value={pred.partner2Answer}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditablePredictions((prev) =>
                                          prev.map((p, idx) => (idx === i ? { ...p, partner2Answer: val } : p))
                                        );
                                      }}
                                      className="w-full px-2 py-1 rounded-lg border border-cyan-200 bg-white text-xs"
                                    />
                                  ) : (
                                    <span className="text-[#253e4d]">
                                      {pred.partner2Answer || "No answer recorded yet."}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isEditingPredictions && (
                                <div className="flex items-center justify-between pt-1 border-t border-sky-100 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-stone-600">Status:</span>
                                    <select
                                      value={pred.status || "pending"}
                                      onChange={(e) => {
                                        const val = e.target.value as NonNullable<FuturePredictionData["status"]>;
                                        setEditablePredictions((prev) =>
                                          prev.map((p, idx) => (idx === i ? { ...p, status: val } : p))
                                        );
                                      }}
                                      className="px-2 py-1 rounded-lg border border-sky-200 text-xs font-bold bg-white"
                                    >
                                      <option value="pending">⏳ Sealed Guess</option>
                                      <option value="came_true">✅ Came True!</option>
                                      <option value="plot_twist">🎭 Plot Twist</option>
                                    </select>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setEditablePredictions((prev) => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="text-xs font-bold text-red-600 hover:underline"
                                  >
                                    Delete Question
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {isEditingPredictions && (
                            <button
                              onClick={() => {
                                setEditablePredictions((prev) => [
                                  ...prev,
                                  {
                                    id: `pred-${Date.now()}`,
                                    question: "Our new prediction question...",
                                    partner1Answer: "",
                                    partner2Answer: "",
                                    status: "pending",
                                  },
                                ]);
                              }}
                              className="w-full py-2.5 rounded-2xl border border-dashed border-sky-300 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Add Another Prediction Question</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Bottom Actions */}
              <div className={`${styles.dialogFooter} p-4 bg-sky-50/50 border-t border-sky-100 flex items-center justify-between shrink-0`}>
                <button
                  onClick={() => { setIsHoldingUnlock(false); setIsDetailModalOpen(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-sky-800 hover:bg-sky-100/70 transition-colors cursor-pointer"
                >
                  Close Vault
                </button>

                <span className="text-xs text-slate-500 flex items-center gap-2"><Lock className="w-3.5 h-3.5" aria-hidden="true" />{selectedCapsule.seal_mode === "couple" ? "Shared with your connected partner" : "Visible only to you"}</span>
              </div>
            </motion.div>
          </CapsuleDialog>
        )}
      </AnimatePresence>

      {/* ─── FULLSCREEN POLAROID THEATER & 3D FLIP LIGHTBOX ─── */}
      <AnimatePresence>
        {lightboxPolaroid && (
          <CapsuleDialog label={"Photo memory"} onClose={() => setLightboxPolaroid(null)} className="z-[120]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`${styles.lightboxPanel} relative w-full max-w-xl flex flex-col items-center justify-center my-auto`}
            >
              {/* Top Controls Bar */}
              <div className={`${styles.lightboxToolbar} w-full flex items-center justify-between text-white mb-4`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sfx.playChime();
                      setIsLightboxFlipped(!isLightboxFlipped);
                    }}
                    className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-all border border-white/30"
                  >
                    <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                    <span>{isLightboxFlipped ? "Show Front Photo" : "Flip to Back Quote 🔄"}</span>
                  </button>

                  <button
                    onClick={() => setIsEditingPolaroid(!isEditingPolaroid)}
                    className="px-4 py-2 rounded-full bg-sky-500/80 hover:bg-sky-500 text-xs font-bold backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-all border border-sky-400"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingPolaroid ? "Done Editing" : "Edit Name & Quote"}</span>
                  </button>
                </div>

                <button
                  onClick={() => setLightboxPolaroid(null)}
                  aria-label="Close photo"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all border border-white/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3D Flippable Polaroid Card Container */}
              <div className="w-full relative" style={{ perspective: "1200px" }}>
                <motion.div
                  animate={{ rotateY: isLightboxFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 25 }}
                  className="relative w-full bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* FRONT SIDE */}
                  <div
                    className={`${isLightboxFlipped ? "hidden" : "block"} space-y-4`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className={`${styles.lightboxPhoto} relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden bg-stone-900 border border-stone-200`}>
                      <Image unoptimized
                        src={lightboxPolaroid.image}
                        alt={lightboxPolaroid.caption}
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>

                    {isEditingPolaroid ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                            Photo Name / Title
                          </label>
                          <input
                            type="text"
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-sky-300 font-script text-xl text-[#16232d]"
                          />
                        </div>
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Location</label>
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Date</label>
                            <input
                              type="text"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          onClick={savePolaroidEdits}
                          className="w-full py-2 rounded-xl btn-love-primary text-xs font-bold text-white cursor-pointer shadow-md"
                        >
                          Save Changes to Memory
                        </button>
                      </div>
                    ) : (
                      <div className="text-center pt-2">
                        <h3 className="font-script text-3xl sm:text-4xl text-[#16232d] font-bold">
                          {lightboxPolaroid.caption || "Untitled memory"}
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-1">
                          📍 {lightboxPolaroid.location || ""} • {lightboxPolaroid.date}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BACK SIDE (Quotation / Love Note) */}
                  <div
                    className={`${!isLightboxFlipped ? "hidden" : "block"} space-y-4`}
                    style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                  >
                    <div className="w-full min-h-[380px] sm:min-h-[440px] rounded-2xl bg-[#fffdf7] border border-amber-200/80 p-6 sm:p-8 flex flex-col justify-between text-left relative overflow-hidden shadow-inner">
                      <div className="absolute top-4 right-4 text-3xl opacity-20">💌</div>
                      <div>
                        <div className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-3">
                          Back-Side Handwritten Love Quote
                        </div>

                        {isEditingPolaroid ? (
                          <div className="space-y-3">
                            <textarea
                              rows={6}
                              value={editNoteOnBack}
                              onChange={(e) => setEditNoteOnBack(e.target.value)}
                              placeholder="Write your heartfelt quote, whisper, or memory here..."
                              className="w-full p-3 rounded-xl border border-sky-300 font-serif text-sm leading-relaxed text-[#16232d] bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                            <button
                              onClick={savePolaroidEdits}
                              className="btn-love-primary px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                            >
                              Save Quote
                            </button>
                          </div>
                        ) : (
                          <p className="font-serif text-base sm:text-lg text-[#2c4655] leading-relaxed italic whitespace-pre-line">
                            {lightboxPolaroid.noteOnBack || "No note added yet."}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-amber-200/70 flex items-center justify-between text-xs text-stone-500 font-medium">
                        <span>📍 {lightboxPolaroid.location || ""}</span>
                        <span>{lightboxPolaroid.date}</span>
                      </div>
                    </div>

                    <div className="text-center text-xs text-stone-500 font-medium">
                      💡 Click &apos;Show Front Photo&apos; to view the image again.
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </CapsuleDialog>
        )}
      </AnimatePresence>

      {/* ─── 5-STEP CREATE CAPSULE WIZARD MODAL ─── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CapsuleDialog label={"Create a time capsule"} onClose={() => void handleCloseCreateWizard()}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className={`${styles.dialogPanel} relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-sky-200 overflow-hidden my-auto max-h-[92vh] flex flex-col`}
            >
              <div className={`${styles.dialogHeader} p-5 bg-gradient-to-r from-sky-50 via-cyan-50 to-sky-50 border-b border-sky-200 flex items-center justify-between shrink-0`}>
                <div>
                  <h2 className="text-lg font-extrabold text-[#16232d]">
                    Create a time capsule
                  </h2>
                  <p className="text-xs text-[#5f7b8c] font-medium">
                    Step {createStep} of 5:{" "}
                    {createStep === 1 && "The essentials"}
                    {createStep === 2 && "Your letter"}
                    {createStep === 3 && "Photos & more"}
                    {createStep === 4 && "Predictions"}
                    {createStep === 5 && "Review & seal"}
                  </p>
                </div>

                <button
                  onClick={handleCloseCreateWizard}
                  aria-label="Close capsule editor"
                  className="w-8 h-8 rounded-full bg-white hover:bg-sky-100 text-sky-900 flex items-center justify-center transition-colors cursor-pointer border border-sky-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className={styles.wizardProgress} aria-label="Capsule creation progress">{["Essentials", "Letter", "Memories", "Predictions", "Seal"].map((label, index) => <span key={label} aria-current={createStep === index + 1 ? "step" : undefined} data-complete={createStep > index + 1}><i>{createStep > index + 1 ? <Check size={11} aria-hidden="true" /> : index + 1}</i>{label}</span>)}</nav>
              <div className={`${styles.dialogBody} p-6 sm:p-8 overflow-y-auto flex-1 space-y-6`}>
                {operationError && <p role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">{operationError}</p>}
                {/* STEP 1: Capsule Type & Title */}
                {createStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="capsule-title" className="text-xs font-bold text-[#16232d] uppercase tracking-wider block mb-1.5">
                        Capsule Title
                      </label>
                      <input id="capsule-title"
                        type="text"
                        placeholder="e.g. A letter for next year"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-xs sm:text-sm font-semibold text-[#16232d] focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#16232d] uppercase tracking-wider block mb-2">
                        Capsule Type
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          {
                            id: "milestone",
                            title: "Milestone",
                            desc: "Save a milestone to open on a future date.",
                          },
                          {
                            id: "open_when",
                            title: "Open when",
                            desc: "Keep something for a moment when you need it.",
                          },
                          {
                            id: "predictions",
                            title: "Predictions",
                            desc: "Guess where you will be in 3 to 5 years.",
                          },
                          {
                            id: "memories",
                            title: "Memories",
                            desc: "Keep photos, letters, and recordings together.",
                          },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setNewCategory(cat.id as TimeCapsuleRecord["category"])}
                            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                              newCategory === cat.id
                                ? "bg-sky-50 border-sky-500 ring-2 ring-sky-400/30"
                                : "bg-white border-sky-100 hover:bg-sky-50/50"
                            }`}
                          >
                            <div className="text-xs font-bold text-[#16232d]">{cat.title}</div>
                            <div className="text-[11px] text-[#617c8b] mt-0.5">{cat.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {newCategory !== "open_when" && (
                      <div>
                        <label htmlFor="capsule-date" className="text-xs font-bold text-[#16232d] uppercase tracking-wider block mb-1.5">
                          Unlock Reveal Date
                        </label>
                        <input id="capsule-date"
                          type="date"
                          value={newUnlockDate}
                          onChange={(e) => setNewUnlockDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50/40 text-xs sm:text-sm font-semibold text-[#16232d] focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Letter Editor */}
                {createStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="capsule-author" className="text-xs font-bold text-[#16232d] block mb-1">Author Name</label>
                        <input id="capsule-author"
                          type="text"
                          value={newLetterAuthor}
                          onChange={(e) => setNewLetterAuthor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label htmlFor="capsule-greeting" className="text-xs font-bold text-[#16232d] block mb-1">Greeting</label>
                        <input id="capsule-greeting"
                          type="text"
                          value={newLetterGreeting}
                          onChange={(e) => setNewLetterGreeting(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="capsule-message" className="text-xs font-bold text-[#16232d] block mb-1">
                        Your message
                      </label>
                      <textarea id="capsule-message"
                        rows={5}
                        placeholder="What would you like to remember when you open this? Write to yourself or someone important to you."
                        value={newLetterBody}
                        onChange={(e) => setNewLetterBody(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-sky-200 bg-[#fffdfa] text-xs sm:text-sm font-serif leading-relaxed text-[#16232d] focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="capsule-signoff" className="text-xs font-bold text-[#16232d] block mb-1">Sign-Off</label>
                      <input id="capsule-signoff"
                        type="text"
                        value={newLetterSignOff}
                        onChange={(e) => setNewLetterSignOff(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs font-semibold"
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Multi-Folder Gallery & Multi-Media in Wizard */}
                {createStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Folder Tabs in Wizard */}
                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-sky-500" />
                          <span>Active Folder & Album Selector</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsAddingWizardFolder(true)}
                          className="px-3 py-1 rounded-full bg-white border border-sky-300 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
                          <span>+ Add Folder</span>
                        </button>
                      </div>

                      {isAddingWizardFolder && (
                        <div className="p-3 rounded-xl bg-white border border-sky-300 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="New Folder Name (e.g. Rome 2025)"
                            value={newWizardFolderName}
                            onChange={(e) => setNewWizardFolderName(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-sky-200 text-xs font-semibold"
                          />
                          <select
                            value={newWizardFolderIcon}
                            onChange={(e) => setNewWizardFolderIcon(e.target.value)}
                            className="px-2 py-1.5 rounded-lg border border-sky-200 text-xs font-bold bg-sky-50"
                          >
                            <option value="📁">📁</option>
                            <option value="📸">📸</option>
                            <option value="🏖️">🏖️</option>
                            <option value="🍷">🍷</option>
                            <option value="💍">💍</option>
                            <option value="💌">💌</option>
                            <option value="✈️">✈️</option>
                            <option value="🎥">🎥</option>
                            <option value="🎙️">🎙️</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (newWizardFolderName.trim()) {
                                const folderId = `f-${Date.now()}`;
                                setWizardFolders((prev) => [
                                  ...prev,
                                  {
                                    id: folderId,
                                    name: newWizardFolderName.trim(),
                                    icon: newWizardFolderIcon || "📁",
                                  },
                                ]);
                                setActiveWizardFolderId(folderId);
                                setNewWizardFolderName("");
                                setIsAddingWizardFolder(false);
                              }
                            }}
                            className="btn-love-primary px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingWizardFolder(false)}
                            className="px-2 py-1.5 text-xs text-sky-700 font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Folder tabs */}
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {wizardFolders.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setActiveWizardFolderId(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              activeWizardFolderId === f.id
                                ? "bg-sky-500 text-white shadow-xs ring-2 ring-sky-300"
                                : "bg-white border border-sky-200 text-sky-900 hover:bg-sky-100"
                            }`}
                          >
                            <span>{f.icon || "📁"}</span>
                            <span>{f.name}</span>
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] text-[#5f7b8c] font-medium pt-1">
                        👉 Adding assets into: <span className="font-bold text-sky-700">
                          {wizardFolders.find((f) => f.id === activeWizardFolderId)?.name || "Active Folder"}
                        </span>
                      </div>
                    </div>

                    {/* 1. Upload Photos in Active Folder */}
                    <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16232d] uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                          <span>1. Photos & Polaroids</span>
                        </span>
                        {isUploadingImage && (
                          <span className="text-xs text-sky-600 font-bold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Uploading your photos…
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handlePhotoUpload(e, activeWizardFolderId)}
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                      />

                      {uploadedPolaroids.filter((p) => (p.folder_id || "f-memories") === activeWizardFolderId).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {uploadedPolaroids
                            .filter((p) => (p.folder_id || "f-memories") === activeWizardFolderId)
                            .map((p) => (
                              <div key={p.id} className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/40 flex gap-2.5 items-start">
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                                  <Image unoptimized src={p.image} alt={p.caption} fill className="object-cover" />
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <input
                                    type="text"
                                    placeholder="Photo Caption"
                                    value={p.caption}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setUploadedPolaroids((prev) =>
                                        prev.map((item) => (item.id === p.id ? { ...item, caption: val } : item))
                                      );
                                    }}
                                    className="w-full px-2 py-0.5 rounded border border-sky-200 text-[11px] font-bold bg-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Back quote..."
                                    value={p.noteOnBack}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setUploadedPolaroids((prev) =>
                                        prev.map((item) => (item.id === p.id ? { ...item, noteOnBack: val } : item))
                                      );
                                    }}
                                    className="w-full px-2 py-0.5 rounded border border-sky-200 text-[10px] bg-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await purgeCloudinaryAssets([p.image]);
                                    setUploadedPolaroids((prev) => prev.filter((item) => item.id !== p.id));
                                  }}
                                  title="Remove photo"
                                  className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer self-start shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Upload Video in Active Folder */}
                    <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16232d] uppercase tracking-wider flex items-center gap-1.5">
                          <VideoIcon className="w-3.5 h-3.5 text-sky-500" />
                          <span>2. Video Vow / Video Message</span>
                        </span>
                        {isUploadingVideo && (
                          <span className="text-xs text-sky-600 font-bold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Uploading Video...
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload(e, activeWizardFolderId)}
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                      />

                      {wizardVideos.filter((v) => (v.folder_id || "f-memories") === activeWizardFolderId).length > 0 && (
                        <div className="space-y-2.5 pt-2">
                          {wizardVideos
                            .filter((v) => (v.folder_id || "f-memories") === activeWizardFolderId)
                            .map((v) => (
                              <div key={v.id || v.videoUrl} className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={v.title}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setWizardVideos((prev) =>
                                        prev.map((item) => (item.id === v.id ? { ...item, title: val } : item))
                                      );
                                    }}
                                    placeholder="Video Title (e.g. Our First Trip Vow)"
                                    className="flex-1 px-2.5 py-1 rounded-lg border border-emerald-300 text-xs font-bold bg-white text-emerald-950"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await purgeCloudinaryAssets([v.videoUrl]);
                                      setWizardVideos((prev) => prev.filter((item) => item.id !== v.id));
                                    }}
                                    title="Remove video"
                                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-xs mx-auto">
                                  <video src={v.videoUrl} controls className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Live Voice Recording in Active Folder */}
                    <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16232d] uppercase tracking-wider flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-sky-500" />
                          <span>3. Voice Tape Recording</span>
                        </span>
                        {isLiveRecording && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold animate-pulse">
                            ● Recording ({liveRecordSeconds}s)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Voice Title (e.g. Midnight Thoughts)"
                          value={liveVoiceTitle}
                          onChange={(e) => setLiveVoiceTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-sky-200 text-xs font-semibold"
                        />

                        {!isLiveRecording ? (
                          <button
                            type="button"
                            onClick={startLiveAudioRecording}
                            className="btn-love-primary px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>Record Voice</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopLiveAudioRecording}
                            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <MicOff className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </button>
                        )}
                      </div>

                      {wizardVoiceNotes.filter((vn) => (vn.folder_id || "f-letters") === activeWizardFolderId).length > 0 && (
                        <div className="space-y-2.5 pt-2">
                          {wizardVoiceNotes
                            .filter((vn) => (vn.folder_id || "f-letters") === activeWizardFolderId)
                            .map((vn) => (
                              <div key={vn.id || vn.audioUrl} className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={vn.title}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setWizardVoiceNotes((prev) =>
                                        prev.map((item) => (item.id === vn.id ? { ...item, title: val } : item))
                                      );
                                    }}
                                    placeholder="Voice Memo Title"
                                    className="flex-1 px-2.5 py-1 rounded-lg border border-purple-300 text-xs font-bold bg-white text-purple-950"
                                  />
                                  <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 text-[10px] font-bold font-mono">
                                    {vn.duration}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (vn.audioUrl) await purgeCloudinaryAssets([vn.audioUrl]);
                                      setWizardVoiceNotes((prev) => prev.filter((item) => item.id !== vn.id));
                                    }}
                                    title="Remove recording"
                                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {vn.audioUrl && (
                                  <audio src={vn.audioUrl} controls className="w-full h-8" />
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Write Secret Notes & Vows in Active Folder */}
                    <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16232d] uppercase tracking-wider flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-sky-500" />
                          <span>4. Written notes</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsAddingWizardTextNote(!isAddingWizardTextNote)}
                          className="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 cursor-pointer"
                        >
                          {isAddingWizardTextNote ? "Cancel" : "+ Write Note"}
                        </button>
                      </div>

                      {isAddingWizardTextNote && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                          <input
                            type="text"
                            placeholder="Note Title"
                            value={wizardNoteTitle}
                            onChange={(e) => setWizardNoteTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs font-bold bg-white"
                          />
                          <textarea
                            rows={3}
                            placeholder="Write secret note or vow here..."
                            value={wizardNoteContent}
                            onChange={(e) => setWizardNoteContent(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-amber-200 text-xs font-serif bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddWizardTextNote}
                            className="btn-love-primary px-3.5 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
                          >
                            Save Note in {wizardFolders.find((f) => f.id === activeWizardFolderId)?.name}
                          </button>
                        </div>
                      )}

                      {wizardTextNotes.filter((n) => n.folder_id === activeWizardFolderId).length > 0 && (
                        <div className="space-y-2 pt-2">
                          {wizardTextNotes
                            .filter((n) => n.folder_id === activeWizardFolderId)
                            .map((note) => (
                              <div key={note.id} className="p-2.5 rounded-xl bg-[#fffdf9] border border-amber-200/80 space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold text-[#2b4351]">
                                  <span>{note.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => setWizardTextNotes((prev) => prev.filter((item) => item.id !== note.id))}
                                    className="text-red-500 text-[10px] font-bold hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <p className="text-[11px] font-serif text-[#496777] line-clamp-2">{note.content}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Future Predictions & Bets Editor */}
                {createStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                        Hopes, predictions & possibilities
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardPredictions((prev) => [
                            ...prev,
                            {
                              id: `pred-${Date.now()}`,
                              question: "What will life look like in five years?",
                              partner1Answer: "",
                              partner2Answer: "",
                              status: "pending",
                            },
                          ]);
                        }}
                        className="px-3 py-1 rounded-full bg-white border border-sky-300 text-sky-700 text-xs font-bold hover:bg-sky-50 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Question</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {wizardPredictions.map((pred, idx) => (
                        <div key={pred.id || idx} className="p-4 rounded-2xl bg-white border border-sky-200 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              placeholder="Prediction question..."
                              value={pred.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardPredictions((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, question: val } : p))
                                );
                              }}
                              className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs font-bold bg-sky-50/30"
                            />
                            {wizardPredictions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setWizardPredictions((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              placeholder="Your prediction…"
                              value={pred.partner1Answer}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardPredictions((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, partner1Answer: val } : p))
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-sky-200 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Another perspective (optional)…"
                              value={pred.partner2Answer}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardPredictions((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, partner2Answer: val } : p))
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-cyan-200 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Review & seal */}
                {createStep === 5 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5 text-center"
                  >
                    {/* ── Waiting for partner screen (shown after couple seal request sent) ── */}
                    {sealRequestSent ? (
                      <div className="py-8 space-y-6">
                        {lastCreatedCapsuleId && sealRequestMap[lastCreatedCapsuleId]?.status === "rejected" ? (
                          <>
                            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-xl mx-auto border-2 border-red-200">
                              <UserX className="w-9 h-9" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-extrabold text-[#16232d]">Partner Declined Request</h3>
                              <p className="text-sm text-[#526e7e] font-medium max-w-xs mx-auto leading-relaxed">
                                Your partner declined this co-seal request. The draft is preserved in your collection. You can request again whenever you&#39;re ready!
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                disabled={resendingCapsuleId === lastCreatedCapsuleId}
                                onClick={() => handleResendSealRequest(lastCreatedCapsuleId)}
                                className="px-6 py-2.5 rounded-xl btn-love-primary text-white text-sm font-bold cursor-pointer shadow-md inline-flex items-center gap-2 disabled:opacity-60"
                              >
                                <Send className={`w-4 h-4 ${resendingCapsuleId === lastCreatedCapsuleId ? "animate-spin" : ""}`} />
                                <span>{resendingCapsuleId === lastCreatedCapsuleId ? "Sending..." : "Send Request Again"}</span>
                              </motion.button>
                              <button
                                onClick={handleCloseCreateWizard}
                                className="px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-[#526e7e] text-sm font-semibold border border-sky-200 cursor-pointer"
                              >
                                Return to Vault
                              </button>
                            </div>
                          </>
                        ) : lastCreatedCapsuleId && sealRequestMap[lastCreatedCapsuleId]?.status === "accepted" ? (
                          <>
                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xl mx-auto border-2 border-emerald-200">
                              <UserCheck className="w-9 h-9" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-extrabold text-[#16232d]">Co-Sealed & Locked! 💍</h3>
                              <p className="text-sm text-[#526e7e] font-medium max-w-xs mx-auto leading-relaxed">
                                Your partner accepted the request! Your capsule is now encrypted in the Couple Vault until your unlock date.
                              </p>
                            </div>
                            <button
                              onClick={handleCloseCreateWizard}
                              className="px-6 py-2.5 rounded-xl btn-love-primary text-white text-sm font-bold cursor-pointer shadow-md"
                            >
                              View in Vault
                            </button>
                          </>
                        ) : (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.15, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                              className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-xl mx-auto"
                            >
                              <Users className="w-9 h-9" />
                            </motion.div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-extrabold text-[#16232d]">Seal Request Sent! 💌</h3>
                              <p className="text-sm text-[#526e7e] font-medium max-w-xs mx-auto leading-relaxed">
                                Your partner has received a notification to co-seal this capsule.
                                The capsule will lock once they accept.
                              </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 max-w-xs mx-auto text-left space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-xs font-bold text-amber-900">Capsule saved as draft</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
                                <span className="text-xs font-bold text-amber-800">Waiting for partner acceptance</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-sky-300" />
                                <span className="text-xs font-medium text-amber-700">Capsule locks when partner agrees</span>
                              </div>
                            </div>
                            <button
                              onClick={handleCloseCreateWizard}
                              className="px-6 py-2.5 rounded-xl btn-love-primary text-white text-sm font-bold cursor-pointer shadow-md"
                            >
                              Close & Return to Vault
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5 w-full">
                    <section className={styles.reviewSummary} aria-label="Capsule summary"><p className={styles.eyebrow}>One last look</p><h3>{newTitle || "A moment worth keeping"}</h3><dl><div><dt>Visibility</dt><dd>{newSealMode === "couple" ? "Shared with your partner" : "Personal · only you"}</dd></div><div><dt>Opening</dt><dd>{newCategory === "open_when" ? "When you need it" : formatCapsuleDate(newUnlockDate)}</dd></div><div><dt>Memories</dt><dd>{uploadedPolaroids.length} photos · {wizardVideos.length} videos · {wizardVoiceNotes.length} recordings</dd></div><div><dt>Words</dt><dd>{newLetterBody.trim() ? "A letter" : "No letter yet"} · {wizardTextNotes.length} notes</dd></div></dl></section>
                    {/* ── Seal Mode Picker (shown before seal color) ── */}
                    {!sharedOnly && couple?.is_connected && (
                      <div className="space-y-3 text-left">
                        <label className="text-xs font-bold text-[#16232d] uppercase tracking-wider block">
                          Who is this capsule for?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Solo Option */}
                          <button
                            type="button"
                            onClick={() => setNewSealMode("solo")}
                            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              newSealMode === "solo"
                                ? "border-sky-500 bg-sky-50 shadow-md shadow-sky-100"
                                : "border-sky-200 bg-white hover:border-sky-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                                newSealMode === "solo" ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-500"
                              }`}>
                                🧍
                              </div>
                              <div>
                                <div className="text-sm font-extrabold text-[#16232d]">Solo Seal</div>
                                {newSealMode === "solo" && (
                                  <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Selected ✓</div>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-[#526e7e] leading-relaxed">
                              Only you can see and open this capsule. Completely private to you.
                            </p>
                          </button>

                          {/* Couple Option */}
                          <button
                            type="button"
                            onClick={() => setNewSealMode("couple")}
                            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              newSealMode === "couple"
                                ? "border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-100"
                                : "border-sky-200 bg-white hover:border-sky-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                                newSealMode === "couple" ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-500"
                              }`}>
                                💑
                              </div>
                              <div>
                                <div className="text-sm font-extrabold text-[#16232d]">Couple Seal</div>
                                {newSealMode === "couple" && (
                                  <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-wide">Selected ✓</div>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-[#526e7e] leading-relaxed">
                              Requires both partners to agree. Neither can open it alone. A shared secret.
                            </p>
                          </button>
                        </div>

                        {newSealMode === "couple" && (
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                            <Bell className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-cyan-700 font-medium leading-relaxed">
                              Your partner will receive a notification to co-seal. The capsule won&#39;t lock until they accept.
                              Opening it later also requires both of you to agree.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-[#16232d] uppercase tracking-wider block mb-2">
                        Choose Wax Seal Color
                      </label>
                      <div className="flex items-center justify-center gap-3">
                        {[
                          { id: "rose", label: "Petal Rose", color: "bg-[#df6b87]" },
                          { id: "crimson", label: "Crimson", color: "bg-red-700" },
                          { id: "gold", label: "Gold", color: "bg-amber-500" },
                          { id: "velvet", label: "Velvet", color: "bg-purple-700" },
                          { id: "emerald", label: "Emerald", color: "bg-emerald-600" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              sfx.playChime();
                              setNewSealColor(c.id as TimeCapsuleRecord["seal_color"]);
                            }}
                            className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center text-white transition-all cursor-pointer ${
                              newSealColor === c.id ? "ring-4 ring-sky-400 scale-110 shadow-md" : "opacity-80"
                            }`}
                          >
                            {newSealColor === c.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#16232d] uppercase tracking-wider block mb-2">
                        Wax Seal Stamp Icon
                      </label>
                      <div className="flex items-center justify-center gap-2.5">
                        {["💌", "❤️", "🔐", "🔮", "🕊️", "💍", "🍾", "✨"].map((stamp) => (
                          <button
                            key={stamp}
                            type="button"
                            onClick={() => {
                              sfx.playChime();
                              setNewSealStamp(stamp);
                            }}
                            className={`w-10 h-10 rounded-2xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                              newSealStamp === stamp
                                ? "bg-sky-100 border-sky-500 scale-110 shadow-xs"
                                : "bg-white border-sky-100 hover:bg-sky-50"
                            }`}
                          >
                            {stamp}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hold to Seal Action */}
                    <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-50 to-cyan-50 border border-sky-200 space-y-3">
                      <div className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                        Ready for another day
                      </div>
                      <p className="text-xs text-[#617c8b]">
                        Hold the button for 2 seconds to save and seal your capsule. Shared capsules stay as drafts until your partner accepts.
                      </p>

                      <div className="relative flex justify-center pt-2">
                        <motion.button
                          type="button"
                          disabled={isSubmittingCapsule}
                          onMouseDown={() => { setSealProgress(0); setIsHoldingToSeal(true); }}
                          onMouseUp={() => setIsHoldingToSeal(false)}
                          onMouseLeave={() => setIsHoldingToSeal(false)}
                          onTouchStart={() => { setSealProgress(0); setIsHoldingToSeal(true); }}
                          onTouchEnd={() => setIsHoldingToSeal(false)}
                          onTouchCancel={() => setIsHoldingToSeal(false)}
                          onContextMenu={event => event.preventDefault()}
                          onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) { setSealProgress(0); setIsHoldingToSeal(true); } } }}
                          onKeyUp={event => { if (event.key === " " || event.key === "Enter") setIsHoldingToSeal(false); }}
                          onBlur={() => setIsHoldingToSeal(false)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`${styles.sealAction} px-8 py-3.5 rounded-full font-bold text-sm text-white transition-all select-none cursor-pointer relative overflow-hidden shadow-lg ${
                            isHoldingToSeal ? "bg-sky-700 shadow-sky-600/40" : "btn-love-primary"
                          }`}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <span>{newSealStamp}</span>
                            <span>
                              {isHoldingToSeal
                                ? "Sealing your capsule…"
                                : newSealMode === "couple"
                                ? "Press & Hold to Send Couple Seal Request"
                                : "Press & Hold to Seal Capsule"}
                            </span>
                          </span>

                          {isHoldingToSeal && (
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-sky-700/30 transition-all duration-75"
                              style={{ width: `${sealProgress}%` }}
                            />
                          )}
                        </motion.button>
                      </div>

                      {isHoldingToSeal && (
                        <div className="text-[11px] font-bold text-sky-700">
                          Sealing your capsule ({sealProgress}%)...
                        </div>
                      )}
                    </div>
                    </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className={`${styles.wizardFooter} p-4 bg-sky-50/60 border-t border-sky-100 flex items-center justify-between shrink-0`}>
                {createStep > 1 && !sealRequestSent ? (
                  <button
                    onClick={() => setCreateStep((prev) => (prev - 1) as typeof createStep)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {createStep < 5 ? (
                  <button
                    onClick={() => {
                      sfx.playChime();
                      setCreateStep((prev) => (prev + 1) as typeof createStep);
                    }}
                    className="btn-love-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </motion.div>
          </CapsuleDialog>
        )}
      </AnimatePresence>
    </div></MotionConfig>
  );
}
