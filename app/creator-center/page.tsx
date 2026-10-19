"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Clock,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  MessageSquare,
  Calendar,
  CalendarCheck,
  HelpCircle,
  Lock,
  Compass,
  BookOpen,
  Mail,
  Gift,
  AlertCircle,
  Eye,
  Play,
  Pause,
  Search,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  Flame,
} from "lucide-react";
import FloatingHearts from "@/components/FloatingHearts";
import { SCENES } from "@/lib/constants/scenes";
import type { CreatorTemplateItem, TemplateReply, MediaItem } from "@/lib/supabase/coupleTemplates";
import { InlineMediaGallery } from "@/components/MediaViewer";

export default function CreatorCenterPage() {
  const [templates, setTemplates] = useState<CreatorTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "expired">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // ── Fetch Creator Templates ────────────────────────────────
  const fetchTemplates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Collect saved templates from localStorage (for guest creators & cross-device backup)
      let storedCodes: string[] = [];
      let storedTokens: string[] = [];
      try {
        const raw = localStorage.getItem("bonded_creator_templates");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            storedCodes = parsed.map((item) => item.code || item.short_code).filter(Boolean);
            storedTokens = parsed.map((item) => item.token || item.manage_token).filter(Boolean);
          }
        }
      } catch {
        // Ignore localStorage error
      }

      const params = new URLSearchParams();
      if (storedCodes.length > 0) params.set("codes", storedCodes.slice(0, 30).join(","));
      if (storedTokens.length > 0) params.set("tokens", storedTokens.slice(0, 30).join(","));

      const res = await fetch(`/api/creator-center?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();

      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
        // Expand first active template by default
        const firstActive = data.templates.find((t: CreatorTemplateItem) => !t.is_expired);
        if (firstActive) {
          setExpandedTemplateId(firstActive.id);
        } else if (data.templates.length > 0) {
          setExpandedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching creator center:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Copy Link Helper ───────────────────────────────────────
  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/t/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // ── Delete Template ────────────────────────────────────────
  const handleDelete = async (code: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.short_code !== code));
        // Also remove from localStorage if stored
        try {
          const raw = localStorage.getItem("bonded_creator_templates");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((item) => (item.code || item.short_code) !== code);
              localStorage.setItem("bonded_creator_templates", JSON.stringify(updated));
            }
          }
        } catch {
          // Ignore error
        }
        setDeleteConfirmCode(null);
      } else {
        alert("The template could not be deleted. Only original creators can delete active templates.");
      }
    } catch {
      alert("Network error while deleting template.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered Templates ─────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (filterTab === "active" && t.is_expired) return false;
      if (filterTab === "expired" && !t.is_expired) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = t.partner_name.toLowerCase().includes(q) || t.partner_from.toLowerCase().includes(q);
        const codeMatch = t.short_code.toLowerCase().includes(q);
        return nameMatch || codeMatch;
      }
      return true;
    });
  }, [templates, filterTab, searchQuery]);

  // ── Stats Summary ──────────────────────────────────────────
  const stats = useMemo(() => {
    const active = templates.filter((t) => !t.is_expired);
    const expired = templates.filter((t) => t.is_expired);
    const totalReplies = active.reduce((acc, t) => acc + (t.replies?.length || 0), 0);
    const totalRsvps = active.filter((t) => t.invitation && t.invitation.status !== "proposed").length;
    return {
      activeCount: active.length,
      expiredCount: expired.length,
      totalReplies,
      totalRsvps,
    };
  }, [templates]);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#fff5f7] via-[#fff0f4] to-[#ffeef2] text-[#280816] px-4 py-8 sm:py-12 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Ambient floating hearts */}
      <FloatingHearts />

      {/* Top Navigation Bar */}
      <div className="relative z-20 max-w-5xl mx-auto w-full flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-rose-200 text-xs font-bold text-rose-900 hover:bg-rose-50 transition-all shadow-xs group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Sanctuary</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchTemplates(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white border border-rose-200 text-xs font-semibold text-rose-800 transition-all cursor-pointer shadow-xs"
            title="Refresh responses"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/anime-template"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template</span>
          </Link>
        </div>
      </div>

      <div className="relative z-20 max-w-5xl mx-auto w-full space-y-8 pb-16">
        {/* Header Hero Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100/80 border border-rose-300 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Partner Inbox &amp; Responses</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#280816]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Creator Center
          </h1>
          <p className="text-sm sm:text-base text-rose-900/70 max-w-xl mx-auto">
            Live replies, RSVPs, poll votes, and interactive moments from the love templates you created for your partner.
          </p>
        </div>

        {/* Ephemeral Privacy Guarantee Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-rose-200/80 shadow-xs flex items-start sm:items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-300 text-rose-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs text-rose-900/80 space-y-0.5">
            <p className="font-bold text-rose-950 text-sm">
              Ephemeral Privacy &amp; Automatic Reply Expiry
            </p>
            <p className="leading-relaxed">
              Your partner&apos;s replies and messages are private and strictly ephemeral.
              <strong> The exact moment a template expires, all received replies, photos, and voice notes are automatically purged</strong> and can no longer be accessed.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-rose-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
              Active Templates
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#280816]">
                {stats.activeCount}
              </span>
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-rose-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
              Replies Received
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#280816]">
                {stats.totalReplies}
              </span>
              <MessageSquare className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-rose-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
              RSVP &amp; Date Plans
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#280816]">
                {stats.totalRsvps}
              </span>
              <CalendarCheck className="w-5 h-5 text-pink-500" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-rose-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
              Expired &amp; Purged
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#280816]">
                {stats.expiredCount}
              </span>
              <Clock className="w-5 h-5 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/60 border border-rose-200/60 shadow-2xs self-start">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-900/70 hover:text-rose-900 hover:bg-white/50"
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("active")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "active"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-900/70 hover:text-rose-900 hover:bg-white/50"
              }`}
            >
              Active ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("expired")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "expired"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-900/70 hover:text-rose-900 hover:bg-white/50"
              }`}
            >
              Expired ({stats.expiredCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by partner name or code..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/80 border border-rose-200 text-xs text-[#280816] placeholder-rose-900/40 focus:outline-none focus:border-rose-400 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Templates Feed */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 rounded-full border-3 border-rose-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-semibold text-rose-900/60">Loading your templates and replies...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-16 px-6 text-center rounded-3xl bg-white/60 border border-rose-200/80 shadow-sm space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8 fill-rose-300" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[#280816]">No templates found</h3>
              <p className="text-xs text-rose-900/70 max-w-sm mx-auto">
                {searchQuery
                  ? "No created templates match your search criteria."
                  : filterTab === "active"
                  ? "You don't have any active templates right now."
                  : "You haven't created any templates yet. Create your first romantic experience!"}
              </p>
            </div>
            <Link
              href="/anime-template"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Template</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTemplates.map((item) => {
              const scene = SCENES[item.scene_index] || SCENES[0];
              const isExpanded = expandedTemplateId === item.id;
              const hasReplies = item.replies && item.replies.length > 0;
              const hasToolData =
                Boolean(item.invitation) ||
                Boolean(item.poll) ||
                Boolean(item.questions?.partner_submission) ||
                Boolean(item.reveal?.partner_answer) ||
                Boolean(item.coupon?.requested_at) ||
                Boolean(item.open_when) ||
                Boolean(item.our_story?.partner_contributed_at) ||
                Boolean(item.bucket_list?.items?.some((i) => i.created_by === "partner" || i.partner_interested || i.status === "completed"));

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border transition-all overflow-hidden ${
                    item.is_expired
                      ? "bg-white/40 border-neutral-300/80 opacity-80"
                      : "bg-white/85 backdrop-blur-md border-rose-200/90 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left Title and Partner Details */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-white/60"
                          style={{ background: scene.palette.accent + "20" }}
                        >
                          {scene.emoji || "🌸"}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base sm:text-lg text-[#280816]">
                              For {item.partner_name}
                            </h3>
                            <span className="text-xs text-rose-800/70 font-medium">
                              from {item.partner_from}
                            </span>
                            {/* Scene tag */}
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                background: scene.palette.accent + "15",
                                borderColor: scene.palette.accent + "30",
                                color: scene.palette.accent,
                              }}
                            >
                              {scene.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-rose-900/60 font-medium flex-wrap">
                            <span>Code: <code className="font-mono font-bold text-rose-800">{item.short_code}</code></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-rose-400" />
                              Opened {item.view_count} {item.view_count === 1 ? "time" : "times"}
                            </span>
                            <span>•</span>
                            <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Expiration Status Badge */}
                      <div className="flex items-center gap-2 sm:self-start">
                        {item.is_expired ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-200/80 border border-neutral-300 text-neutral-700 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Expired • Replies Purged</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active: <ExpiryCountdown expiresAt={item.expires_at} /></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-rose-100 flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Copy Partner Link */}
                        <button
                          type="button"
                          onClick={() => handleCopy(item.short_code)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold transition-colors cursor-pointer border border-rose-200/70"
                        >
                          {copiedCode === item.short_code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied Link!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-rose-600" />
                              <span>Copy Partner Link</span>
                            </>
                          )}
                        </button>

                        {/* Open Viewer */}
                        <a
                          href={`/t/${item.short_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-800 font-semibold transition-colors border border-rose-200/70"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
                          <span>View Live Template</span>
                        </a>

                        {/* Secret Manage View if token is available */}
                        {item.manage_token && (
                          <a
                            href={`/t/${item.short_code}?manage=${item.manage_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold transition-colors border border-emerald-200"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Manage Drawer</span>
                          </a>
                        )}
                      </div>

                      {/* Right Delete Trigger */}
                      <div>
                        {deleteConfirmCode === item.short_code ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-red-600">Permanently delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.short_code)}
                              disabled={deleting}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                            >
                              {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmCode(null)}
                              className="px-2 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCode(item.short_code)}
                            className="inline-flex items-center gap-1 text-rose-800/60 hover:text-red-600 font-medium transition-colors cursor-pointer p-1"
                            title="Delete template and wipe all data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Partner Responses Section */}
                  <div className="bg-rose-50/40 border-t border-rose-100/80 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-rose-500" />
                        <h4 className="font-bold text-sm text-[#280816]">
                          Partner Responses &amp; Activity
                        </h4>
                        {!item.is_expired && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-800">
                            {(item.replies?.length || 0)} messages
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedTemplateId(isExpanded ? null : item.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                      >
                        {isExpanded ? "Collapse Details" : "Expand Details"}
                      </button>
                    </div>

                    {/* If Expired Notice */}
                    {item.is_expired ? (
                      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span>
                          This template expired on {new Date(item.expires_at).toLocaleDateString()}. Per the ephemeral privacy policy, all partner replies, photos, and interactive data have been completely wiped.
                        </span>
                      </div>
                    ) : !hasReplies && !hasToolData ? (
                      <div className="p-6 text-center rounded-2xl bg-white/60 border border-rose-200/60 text-xs space-y-2">
                        <Heart className="w-6 h-6 text-rose-300 mx-auto fill-rose-100" />
                        <p className="font-bold text-rose-900">
                          Waiting for {item.partner_name} to respond
                        </p>
                        <p className="text-rose-900/60 max-w-sm mx-auto">
                          Share the template link with {item.partner_name}. Once they send a love note, RSVP, or pick a poll, their responses will appear here in real time!
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.short_code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all shadow-xs cursor-pointer mt-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Partner Link</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 1. T01 Love Notes and Voice/Photo Replies */}
                        {item.replies && item.replies.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                              💌 Received Love Notes ({item.replies.length})
                            </span>
                            <div className="grid grid-cols-1 gap-3">
                              {item.replies.map((r: TemplateReply) => (
                                <div
                                  key={r.id}
                                  className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2.5 text-left"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-rose-950 flex items-center gap-1.5">
                                      <span>{r.reaction || "💌"}</span>
                                      <span>{r.author_name || item.partner_name}</span>
                                    </span>
                                    <span className="text-[11px] text-rose-900/50">
                                      {new Date(r.created_at).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Text Message */}
                                  {r.message && (
                                    <p className="text-xs sm:text-sm text-[#280816] leading-relaxed whitespace-pre-wrap font-sans bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                                      &ldquo;{r.message}&rdquo;
                                    </p>
                                  )}

                                  {/* Media Attachments: Photos, Voice Notes & Videos */}
                                  {Array.isArray(r.media_items) && r.media_items.length > 0 && (
                                    <InlineMediaGallery
                                      mediaItems={r.media_items}
                                      shortCode={item.short_code}
                                      authorName={r.author_name || item.partner_name}
                                      createdDate={new Date(r.created_at).toLocaleString()}
                                      paletteTheme="rose"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed Tool Interactions (shown when expanded) */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-rose-200/60 space-y-4">
                            {/* 2. T02 Date Invitation / RSVP */}
                            {item.invitation && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-pink-500" />
                                    <span className="font-bold text-rose-950">
                                      Date Invitation: {item.invitation.activity_title}
                                    </span>
                                  </div>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      item.invitation.status === "confirmed"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : item.invitation.status === "counterproposed"
                                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                                        : item.invitation.status === "declined"
                                        ? "bg-red-100 text-red-800 border border-red-300"
                                        : "bg-blue-100 text-blue-800 border border-blue-300"
                                    }`}
                                  >
                                    {item.invitation.status}
                                  </span>
                                </div>
                                {item.invitation.partner_counter_note && (
                                  <p className="text-xs text-rose-900/80 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                                    Partner note: &ldquo;{item.invitation.partner_counter_note}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 3. T04 Polls & Choices */}
                            {item.poll && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-purple-500" />
                                    <span className="font-bold text-rose-950">
                                      Poll: {item.poll.question}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                    {item.poll.status}
                                  </span>
                                </div>
                                {item.poll.partner_votes && item.poll.partner_votes.length > 0 && (
                                  <p className="text-xs text-rose-900/70">
                                    Partner picked an option! Check manage drawer for mutual agreement.
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 4. T05 Questions Card */}
                            {item.questions?.partner_submission && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className="font-bold text-rose-950">
                                    Questions Answered by {item.partner_name}
                                  </span>
                                </div>
                                <p className="text-xs text-rose-900/70">
                                  {item.partner_name} submitted answers to your personalized questions!
                                </p>
                              </div>
                            )}

                            {/* 5. T06 Reveal Together */}
                            {item.reveal && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    <span className="font-bold text-rose-950">
                                      Private Reveal: {item.reveal.prompt}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    {item.reveal.status}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* 6. T08 Love Coupon */}
                            {item.coupon && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-rose-500" />
                                    <span className="font-bold text-rose-950">
                                      Love Coupon: {item.coupon.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                    {item.coupon.status}
                                  </span>
                                </div>
                                {item.coupon.partner_request_note && (
                                  <p className="text-xs text-rose-900/80 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                                    Request note: &ldquo;{item.coupon.partner_request_note}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 7. T09 Open When Letters */}
                            {item.open_when && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <Mail className="w-4 h-4 text-amber-600" />
                                  <span className="font-bold text-rose-950">
                                    Open When Letters: {item.open_when.title}
                                  </span>
                                </div>
                                <div className="flex gap-2 flex-wrap pt-1">
                                  {item.open_when.envelopes?.map((env) => (
                                    <span
                                      key={env.id}
                                      className={`text-[11px] px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                                        env.opened_at
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                                          : "bg-neutral-50 border-neutral-200 text-neutral-600"
                                      }`}
                                    >
                                      {env.opened_at ? "✓ Opened" : "✉️ Sealed"} — {env.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 8. T10 Our Story Contribution */}
                            {item.our_story && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <BookOpen className="w-4 h-4 text-pink-600" />
                                  <span className="font-bold text-rose-950">
                                    Our Story: {item.our_story.title}
                                  </span>
                                </div>
                                {item.our_story.partner_contributed_at ? (
                                  <div className="space-y-2 pt-1">
                                    <span className="text-xs font-bold text-emerald-700 block">
                                      ✓ {item.partner_name} added their side of the story!
                                    </span>
                                    {item.our_story.partner_photo_url && (
                                      <div className="pt-1">
                                        <InlineMediaGallery
                                          mediaItems={[{
                                            url: item.our_story.partner_photo_url,
                                            type: "image",
                                            public_id: "our_story_photo",
                                          }]}
                                          shortCode={item.short_code}
                                          authorName={item.partner_name}
                                          createdDate={new Date(item.our_story.partner_contributed_at).toLocaleString()}
                                          paletteTheme="rose"
                                        />
                                      </div>
                                    )}
                                    {item.our_story.partner_caption && (
                                      <p className="text-xs italic text-rose-900/80 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                                        &ldquo;{item.our_story.partner_caption}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-rose-900/60">
                                    Waiting for {item.partner_name} to add their side at the ending.
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 9. T11 Mini Couple Bucket List */}
                            {item.bucket_list && (
                              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <Compass className="w-4 h-4 text-pink-600" />
                                  <span className="font-bold text-rose-950">
                                    Couple Bucket List: {item.bucket_list.title}
                                  </span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                  {item.bucket_list.items?.map((bi) => (
                                    <div
                                      key={bi.id}
                                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-rose-50/60 border border-rose-100"
                                    >
                                      <span className="font-medium text-[#280816]">
                                        {bi.status === "completed" ? "🎉" : bi.status === "planning" ? "🗓️" : "💭"} {bi.title}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {bi.created_by === "partner" && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-200/60 text-pink-800">
                                            Added by partner
                                          </span>
                                        )}
                                        {bi.partner_interested && (
                                          <span className="text-[10px] font-bold text-rose-600">
                                            Partner wants to do this! 💕
                                          </span>
                                        )}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                          {bi.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-20 text-center text-xs text-rose-800/60 pt-6">
        <p>© {new Date().getFullYear()} QubitSells. Designed with boundless love for couples worldwide.</p>
      </footer>
    </main>
  );
}

// ── Live Expiry Countdown Component ──────────────────────────
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired just now");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span>{timeLeft}</span>;
}
