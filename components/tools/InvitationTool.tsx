"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Globe,
  Send,
  CalendarCheck,
  CalendarDays,
} from "lucide-react";
import type {
  InvitationSlot,
  InvitationToolConfig,
  TemplateInvitation,
} from "@/lib/supabase/coupleTemplates";

interface InvitationToolProps {
  templateCode: string;
  partnerName: string;
  senderName: string;
  config?: InvitationToolConfig;
  palette: {
    accent: string;
    glow: string;
    text: string;
    dark: string;
    card?: string;
  };
  onStatusChanged?: (invitation: TemplateInvitation) => void;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Athens",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function formatSlotTime(
  slot: InvitationSlot,
  viewerTz: string,
  senderTz: string,
  dateMode: string
) {
  if (dateMode === "date_only") {
    // Pure calendar date: avoid midnight shift by parsing parts
    const parts = slot.start_time.split(/[-T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return {
        viewerText: d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        senderText: null,
        isDifferentTz: false,
      };
    }
  }

  // Full instant with time
  const date = new Date(slot.start_time);
  if (isNaN(date.getTime())) {
    return { viewerText: slot.start_time, senderText: null, isDifferentTz: false };
  }

  let viewerFormatted = "";
  try {
    viewerFormatted = new Intl.DateTimeFormat(undefined, {
      timeZone: viewerTz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    viewerFormatted = date.toLocaleString();
  }

  const isDifferentTz = viewerTz !== senderTz;
  let senderFormatted: string | null = null;
  if (isDifferentTz) {
    try {
      senderFormatted = new Intl.DateTimeFormat(undefined, {
        timeZone: senderTz,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date);
    } catch {
      senderFormatted = null;
    }
  }

  return {
    viewerText: viewerFormatted,
    senderText: senderFormatted,
    isDifferentTz,
  };
}

function generateIcsCalendar(inv: TemplateInvitation, slot: InvitationSlot) {
  let startStr = "";
  let endStr = "";

  if (inv.date_mode === "date_only") {
    const raw = slot.start_time.split("T")[0].replace(/-/g, "");
    startStr = `;VALUE=DATE:${raw}`;
    // Next day for full day end
    const d = new Date(slot.start_time);
    d.setDate(d.getDate() + 1);
    const endRaw = d.toISOString().split("T")[0].replace(/-/g, "");
    endStr = `;VALUE=DATE:${endRaw}`;
  } else {
    const start = new Date(slot.start_time);
    const durationMs = (inv.duration_minutes || 120) * 60 * 1000;
    const end = slot.end_time ? new Date(slot.end_time) : new Date(start.getTime() + durationMs);

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatUtc = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

    startStr = `:${formatUtc(start)}`;
    endStr = `:${formatUtc(end)}`;
  }

  const loc = inv.format === "online" ? inv.meeting_url || "Online Video Call" : inv.location || "";
  const desc = `${inv.invitation_message || "Romantic Date"}\\n\\nScheduled via QubitSells.`;

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QubitSells//Invitation Tool//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:bonded-${inv.id}-${Date.now()}@bonded.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART${startStr}`,
    `DTEND${endStr}`,
    `SUMMARY:${inv.activity}`,
    `DESCRIPTION:${desc}`,
    loc ? `LOCATION:${loc}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return icsLines.join("\r\n");
}

export function InvitationTool({
  templateCode,
  partnerName,
  senderName,
  config,
  palette,
  onStatusChanged,
}: InvitationToolProps) {
  const [invitation, setInvitation] = useState<TemplateInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Time zone selection
  const [viewerTimezone, setViewerTimezone] = useState<string>("UTC");
  const [showTzPicker, setShowTzPicker] = useState(false);

  // Slot selection & counterproposal state
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isCounterproposing, setIsCounterproposing] = useState(false);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("19:00");
  const [counterLabel, setCounterLabel] = useState("");
  const [partnerNote, setPartnerNote] = useState("");
  const selectId = useId();

  // Detect local timezone once on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setViewerTimezone(detected);
    } catch {
      // Fallback to UTC
    }
  }, []);

  // Fetch invitation details
  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invitation) {
          setInvitation(data.invitation);
          if (data.invitation.selected_slot) {
            setSelectedSlotId(data.invitation.selected_slot.id);
          } else if (data.invitation.proposed_slots?.length > 0) {
            setSelectedSlotId(data.invitation.proposed_slots[0].id);
          }
        }
      }
    } catch {
      // Offline or network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitation();
  }, [templateCode]);

  // Handle Partner RSVP
  const handleRespond = async (
    responseType: "accepted" | "counterproposed" | "declined" | "decide_later"
  ) => {
    if (!invitation) return;
    setSubmitting(true);
    setErrorMsg(null);
    setConflictWarning(null);

    let chosenSlot: InvitationSlot | null = null;
    let suggestedSlot: InvitationSlot | null = null;

    if (responseType === "accepted") {
      const match = invitation.proposed_slots.find((s) => s.id === selectedSlotId);
      if (!match) {
        setErrorMsg("Please select one of the offered dates/times.");
        setSubmitting(false);
        return;
      }
      chosenSlot = match;
    } else if (responseType === "counterproposed") {
      if (!counterDate) {
        setErrorMsg("Please choose your suggested date.");
        setSubmitting(false);
        return;
      }
      const isoStart =
        invitation.date_mode === "date_only"
          ? counterDate
          : new Date(`${counterDate}T${counterTime}:00`).toISOString();

      suggestedSlot = {
        id: `counter_${Date.now()}`,
        start_time: isoStart,
        label: counterLabel || "Suggested alternative",
      };
    }

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected_revision: invitation.revision,
          response_type: responseType,
          chosen_slot: chosenSlot,
          suggested_slot: suggestedSlot,
          partner_tz: viewerTimezone,
          partner_note_text: partnerNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Stale revision: prompt refresh
          setErrorMsg("The invitation schedule was recently updated. Refreshing the latest options...");
          setTimeout(fetchInvitation, 1200);
          return;
        }
        throw new Error(data.error || "Failed to submit response.");
      }

      // Success: update local state
      const updated: TemplateInvitation = {
        ...invitation,
        status: data.status,
        revision: data.revision,
        selected_slot: chosenSlot,
        counterproposal_slot: suggestedSlot,
        recipient_response: responseType,
        recipient_timezone: viewerTimezone,
        recipient_note: partnerNote.trim() || null,
        agreed_revision: responseType === "accepted" ? invitation.revision : null,
      };

      setInvitation(updated);
      setIsCounterproposing(false);
      if (onStatusChanged) onStatusChanged(updated);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadIcs = () => {
    if (!invitation || !invitation.selected_slot) return;
    const icsContent = generateIcsCalendar(invitation, invitation.selected_slot);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invitation.activity.toLowerCase().replace(/[^a-z0-9]/g, "-")}-date.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 text-center text-sm text-neutral-400">
        <Clock className="mx-auto h-5 w-5 animate-spin text-pink-400 mb-2" />
        Loading date details...
      </div>
    );
  }

  if (!invitation) return null;

  const isConfirmed = invitation.status === "confirmed";
  const isDeclined = invitation.status === "declined";
  const isDeferred = invitation.status === "deferred";
  const isCounterproposed = invitation.status === "counterproposed";
  const isCancelled = invitation.status === "cancelled";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 via-black/60 to-black/80 backdrop-blur-2xl shadow-2xl transition-all"
    >
      {/* Top Banner & Header */}
      <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${palette.accent}25`,
                color: palette.accent,
                border: `1px solid ${palette.accent}50`,
              }}
            >
              <Calendar className="h-3.5 w-3.5" />
              Special Invitation
            </span>

            {invitation.format === "online" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <Video className="h-3 w-3" /> Virtual Date
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <MapPin className="h-3 w-3" /> In-Person
              </span>
            )}
          </div>

          {/* Timezone Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTzPicker(!showTzPicker)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10 transition-colors"
              title="Click to change your time zone"
            >
              <Globe className="h-3 w-3 text-cyan-400" />
              <span>{viewerTimezone.replace("_", " ")}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showTzPicker && (
              <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-white/20 bg-neutral-900/95 p-2 shadow-2xl backdrop-blur-xl">
                <p className="px-2 py-1 text-[11px] font-medium text-neutral-400">
                  Select your time zone:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {COMMON_TIMEZONES.map((tz) => (
                    <button
                      key={tz}
                      type="button"
                      onClick={() => {
                        setViewerTimezone(tz);
                        setShowTzPicker(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                        viewerTimezone === tz
                          ? "bg-pink-500/30 text-white font-semibold"
                          : "text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      {tz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity & Message */}
        <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-white">
          {invitation.activity}
        </h2>

        {invitation.invitation_message && (
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed italic">
            &ldquo;{invitation.invitation_message}&rdquo;
          </p>
        )}

        {/* Location / Meeting / Venue Links */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-300">
          {invitation.location && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>{invitation.location}</span>
            </div>
          )}

          {invitation.meeting_url && (
            <a
              href={invitation.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-200 hover:bg-sky-500/25 transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-sky-400" />
              <span>Online Meeting Link</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}

          {invitation.reservation_url && (
            <a
              href={invitation.reservation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-colors"
              title="Venue / Reservation Link (Note: this is an external link, not a confirmed booking)"
            >
              <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
              <span>Venue Link (Reservation Info)</span>
            </a>
          )}

          {invitation.duration_minutes > 0 && invitation.date_mode !== "date_only" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span>
                {Math.floor(invitation.duration_minutes / 60) > 0
                  ? `${Math.floor(invitation.duration_minutes / 60)}h `
                  : ""}
                {invitation.duration_minutes % 60 > 0
                  ? `${invitation.duration_minutes % 60}m`
                  : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Body Section */}
      <div className="p-6">
        {/* State 1: CONFIRMED */}
        {isConfirmed && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-emerald-300">It&apos;s a Date! 🎉</h3>
            <p className="mt-1 text-xs text-neutral-300">
              You and {senderName} are officially confirmed for {invitation.activity}.
            </p>

            {invitation.selected_slot && (
              <div className="my-4 inline-block px-4 py-2.5 rounded-xl bg-black/40 border border-emerald-500/30 text-sm font-medium text-emerald-200">
                <div className="flex items-center justify-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    {
                      formatSlotTime(
                        invitation.selected_slot,
                        viewerTimezone,
                        invitation.sender_timezone,
                        invitation.date_mode
                      ).viewerText
                    }
                  </span>
                </div>
                {formatSlotTime(
                  invitation.selected_slot,
                  viewerTimezone,
                  invitation.sender_timezone,
                  invitation.date_mode
                ).isDifferentTz && (
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Sender&apos;s time:{" "}
                    {
                      formatSlotTime(
                        invitation.selected_slot,
                        viewerTimezone,
                        invitation.sender_timezone,
                        invitation.date_mode
                      ).senderText
                    }
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                <CalendarDays className="h-4 w-4" />
                Add to Calendar (.ics)
              </button>
            </div>
          </div>
        )}

        {/* State 2: COUNTERPROPOSAL PENDING */}
        {isCounterproposed && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400 mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-amber-300">Counterproposal Pending</h3>
            <p className="mt-1 text-xs text-neutral-300 max-w-md mx-auto">
              You proposed an alternative date & time. Awaiting {senderName}&apos;s confirmation.
              (This invitation will only confirm once {senderName} approves this time).
            </p>

            {invitation.counterproposal_slot && (
              <div className="my-3 inline-block px-4 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-xs text-amber-200">
                <span>
                  Suggested:{" "}
                  {
                    formatSlotTime(
                      invitation.counterproposal_slot,
                      viewerTimezone,
                      invitation.sender_timezone,
                      invitation.date_mode
                    ).viewerText
                  }
                </span>
              </div>
            )}
          </div>
        )}

        {/* State 3: DECLINED */}
        {isDeclined && (
          <div className="rounded-2xl border border-neutral-700/60 bg-neutral-900/60 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 text-neutral-400 mb-3">
              <XCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-200">Invitation Declined</h3>
            <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
              You have politely declined this invitation. No calendar event was created.
            </p>
            <button
              type="button"
              onClick={() => handleRespond("accepted")}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/15 text-neutral-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reconsider & choose a slot
            </button>
          </div>
        )}

        {/* State 4: DEFERRED (Decide Later) */}
        {isDeferred && (
          <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/40 text-sky-400 mb-3">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-sky-200">Decide Later</h3>
            <p className="mt-1 text-xs text-neutral-300 max-w-md mx-auto">
              Take all the time you need! You can accept or suggest another time whenever you&apos;re ready.
            </p>
          </div>
        )}

        {/* State 5: CANCELLED */}
        {isCancelled && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/40 text-rose-400 mb-3">
              <XCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-rose-300">Invitation Cancelled</h3>
            <p className="mt-1 text-xs text-neutral-400">
              This invitation has been cancelled by {senderName}.
            </p>
          </div>
        )}

        {/* Slot Selection & RSVP Actions (Active when proposed or deferred) */}
        {(!isConfirmed && !isDeclined && !isCounterproposed && !isCancelled) || isDeferred ? (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  {invitation.date_mode === "date_only"
                    ? "Offered Dates"
                    : invitation.proposed_slots.length > 1
                    ? "Choose an Offered Time Slot"
                    : "Proposed Date & Time"}
                </span>
                <span className="text-[11px] text-neutral-400">
                  Times in {viewerTimezone}
                </span>
              </div>

              {/* Slot Cards List */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {invitation.proposed_slots.map((slot) => {
                  const { viewerText, senderText, isDifferentTz } = formatSlotTime(
                    slot,
                    viewerTimezone,
                    invitation.sender_timezone,
                    invitation.date_mode
                  );
                  const isSelected = selectedSlotId === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setIsCounterproposing(false);
                      }}
                      className={`text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? "border-pink-500 bg-pink-500/15 shadow-[0_0_15px_rgba(244,114,182,0.15)] ring-1 ring-pink-500/50"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-white">
                          {slot.label || "Available Slot"}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-pink-400 bg-pink-500"
                              : "border-white/30"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>

                      <p className="mt-1.5 text-xs text-neutral-200">{viewerText}</p>

                      {isDifferentTz && senderText && (
                        <p className="mt-0.5 text-[10px] text-neutral-400">
                          Sender&apos;s time: {senderText}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] text-neutral-500 italic">
                * Conflict checking verifies known dates within QubitSells; external private calendars are not queried.
              </p>
            </div>

            {/* Counterproposal Form (Inline) */}
            {isCounterproposing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Suggest Another Time
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCounterproposing(false)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${selectId}-date`} className="block text-[11px] text-neutral-400 mb-1">
                      Proposed Date
                    </label>
                    <input
                      id={`${selectId}-date`}
                      type="date"
                      value={counterDate}
                      onChange={(e) => setCounterDate(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-pink-400 focus:outline-none"
                    />
                  </div>

                  {invitation.date_mode !== "date_only" && (
                    <div>
                      <label htmlFor={`${selectId}-time`} className="block text-[11px] text-neutral-400 mb-1">
                        Proposed Time ({viewerTimezone})
                      </label>
                      <input
                        id={`${selectId}-time`}
                        type="time"
                        value={counterTime}
                        onChange={(e) => setCounterTime(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor={`${selectId}-label`} className="block text-[11px] text-neutral-400 mb-1">
                    Note / Reason (Optional)
                  </label>
                  <input
                    id={`${selectId}-label`}
                    type="text"
                    value={counterLabel}
                    onChange={(e) => setCounterLabel(e.target.value)}
                    placeholder="e.g. Free after 8 PM, or let's do Sunday!"
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-pink-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting || !counterDate}
                  onClick={() => handleRespond("counterproposed")}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Sending Counterproposal..." : "Send Counterproposal to Sender"}
                </button>
              </motion.div>
            )}

            {/* Optional Note for Acceptance or RSVP */}
            {!isCounterproposing && (
              <div>
                <label htmlFor={`${selectId}-partner-note`} className="block text-[11px] text-neutral-400 mb-1">
                  Add a sweet note to your reply (Optional)
                </label>
                <input
                  id={`${selectId}-partner-note`}
                  type="text"
                  value={partnerNote}
                  onChange={(e) => setPartnerNote(e.target.value)}
                  placeholder="Can't wait to see you ❤️"
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-pink-400 focus:outline-none"
                />
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            {!isCounterproposing && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting || !selectedSlotId}
                  onClick={() => handleRespond("accepted")}
                  className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm shadow-[0_0_25px_rgba(244,114,182,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {submitting ? "Confirming..." : "Accept & Confirm Date"}
                </button>

                <div className="flex items-center justify-center gap-2">
                  {invitation.allow_counterproposal && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setIsCounterproposing(true)}
                      className="px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-neutral-300 transition-colors"
                    >
                      Suggest Another Time
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRespond("decide_later")}
                    className="px-3 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Decide Later
                  </button>

                  {/* Standard, respectful decline button — no cursor evasion, no guilt tricks */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRespond("declined")}
                    className="px-3 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    title="Politely decline this invitation"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
