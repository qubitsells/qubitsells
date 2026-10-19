"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Heart,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { CouponToolConfig, TemplateCoupon, CouponStatus } from "@/lib/supabase/coupleTemplates";

interface LoveCouponToolProps {
  templateCode: string;
  partnerName?: string;
  senderName?: string;
  config: CouponToolConfig;
  palette?: {
    accent?: string;
    glow?: string;
    text?: string;
    dark?: string;
    card?: string;
  };
}

export function LoveCouponTool({
  templateCode,
  partnerName = "You",
  senderName = "Me",
  config,
  palette: propPalette,
}: LoveCouponToolProps) {
  const palette = {
    accent: propPalette?.accent || "#E11D48",
    glow: propPalette?.glow || "#FDA4AF",
    text: propPalette?.text || "#FFFFFF",
    dark: propPalette?.dark || "#0F172A",
    card: propPalette?.card || "rgba(255,255,255,0.08)",
  };
  const [coupon, setCoupon] = useState<TemplateCoupon | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [preferredDate, setPreferredDate] = useState("");

  // Cancel modal state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch coupon state
  const fetchCoupon = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/coupon`);
      if (!res.ok) throw new Error("Could not load coupon details.");
      const data = await res.json();
      if (data.coupon) {
        setCoupon(data.coupon);
      }
      setIsCreator(Boolean(data.is_creator));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load coupon.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [templateCode]);

  useEffect(() => {
    fetchCoupon();
  }, [fetchCoupon]);

  // Recipient action: Request to use
  const handleRequestCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupon || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          expected_revision: coupon.revision,
          request_note: requestNote.trim() || undefined,
          preferred_date: preferredDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to request coupon redemption.");
      }

      setCoupon((prev) =>
        prev
          ? {
              ...prev,
              status: "requested",
              revision: data.revision,
              requested_at: new Date().toISOString(),
              request_note: requestNote.trim() || null,
              preferred_date: preferredDate || null,
            }
          : null
      );

      setShowRequestForm(false);
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.7 },
          colors: [palette.accent, "#f43f5e", "#fbbf24"],
        });
      } catch {
        // silent
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error submitting request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Issuer actions: accept, fulfill, decline_request, cancel
  const handleManageAction = async (action: "accept" | "fulfill" | "decline_request" | "cancel") => {
    if (!coupon || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateCode)}/coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expected_revision: coupon.revision,
          cancel_reason: action === "cancel" || action === "decline_request" ? cancelReason.trim() || undefined : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action} coupon.`);
      }

      setCoupon((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              revision: data.revision,
              accepted_at: action === "accept" ? new Date().toISOString() : prev.accepted_at,
              fulfilled_at: action === "fulfill" ? new Date().toISOString() : prev.fulfilled_at,
              cancelled_at: action === "cancel" ? new Date().toISOString() : prev.cancelled_at,
              cancel_reason: action === "cancel" ? cancelReason : prev.cancel_reason,
            }
          : null
      );

      setShowCancelPrompt(false);

      if (action === "accept" || action === "fulfill") {
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#10b981", palette.accent, "#f59e0b"],
          });
        } catch {
          // silent
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed. Please refresh.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToInvitation = () => {
    const el = document.getElementById("invitation_t02");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div
        className="w-full max-w-xl mx-auto my-6 p-6 rounded-3xl border animate-pulse backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(18, 12, 28, 0.6)",
          borderColor: `${palette.accent}25`,
        }}
      >
        <div className="h-5 w-48 bg-white/10 rounded-full mb-3" />
        <div className="h-4 w-72 bg-white/5 rounded-full" />
      </div>
    );
  }

  // Fallback to config if coupon row is not yet synchronized
  const activeTitle = coupon?.title || config.title;
  const activeDescription = coupon?.description || config.description;
  const activeStatus: CouponStatus = coupon?.status || "available";
  const activeExpiresAt = coupon?.expires_at || config.expiresAt;
  const activeEnableScheduling = coupon?.enable_scheduling ?? config.enableScheduling;

  const isExpired =
    activeStatus === "expired" ||
    (activeExpiresAt && new Date(activeExpiresAt).getTime() <= Date.now() && activeStatus !== "fulfilled");

  return (
    <div
      id="coupon_t08"
      className="w-full max-w-xl mx-auto my-6 rounded-3xl overflow-hidden border backdrop-blur-xl shadow-2xl relative transition-all"
      style={{
        backgroundColor: "rgba(18, 12, 28, 0.8)",
        borderColor: `${palette.accent}35`,
        boxShadow: `0 12px 40px -8px ${palette.glow}25`,
      }}
    >
      {/* Decorative Coupon Perforation Notches on sides */}
      <div
        className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0a0512] border border-white/10 z-10"
        style={{ borderColor: `${palette.accent}30` }}
      />
      <div
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0a0512] border border-white/10 z-10"
        style={{ borderColor: `${palette.accent}30` }}
      />

      {/* Top Header & Ribbon */}
      <div className="p-5 pb-4 border-b border-white/10 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
              style={{
                backgroundColor: palette.accent,
                boxShadow: `0 4px 14px ${palette.accent}50`,
              }}
            >
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-pink-300">
                  Single-Use Love Coupon
                </span>
                {isCreator && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    Issuer
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-base md:text-lg tracking-tight mt-0.5">
                {activeTitle}
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            {activeStatus === "available" && !isExpired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                <span>Ready to Use</span>
              </span>
            )}
            {activeStatus === "requested" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Requested</span>
              </span>
            )}
            {activeStatus === "accepted" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>Accepted!</span>
              </span>
            )}
            {activeStatus === "fulfilled" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Fulfilled</span>
              </span>
            )}
            {activeStatus === "cancelled" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/50 border border-white/10">
                <X className="w-3.5 h-3.5" />
                <span>Cancelled</span>
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-900/30 text-rose-300 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Expired</span>
              </span>
            )}
          </div>
        </div>

        {activeDescription && (
          <p className="text-xs md:text-sm text-white/70 mt-2.5 leading-relaxed pl-13">
            {activeDescription}
          </p>
        )}
      </div>

      {/* Coupon Perforation Line */}
      <div className="relative border-b border-dashed border-white/15 my-0.5 mx-6">
        <div className="absolute inset-0 flex items-center justify-center -top-2.5">
          <span className="bg-[#120c1c] px-3 text-[10px] uppercase font-bold tracking-widest text-white/30">
            ♥ Redeemable Once ♥
          </span>
        </div>
      </div>

      {/* Body: Meta details & Status Card */}
      <div className="p-5 space-y-4">
        {/* Meta badges: Expiry & Scheduling */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeExpiresAt && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white/60">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <span>
                {isExpired ? "Expired on: " : "Valid until: "}
                {new Date(activeExpiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {activeEnableScheduling && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>Scheduling Enabled</span>
            </div>
          )}
        </div>

        {/* Status Callout Card */}
        {activeStatus === "requested" && (
          <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-200">
              <Clock className="w-4 h-4 text-purple-300" />
              <span>
                {isCreator
                  ? `${partnerName} requested to use this coupon!`
                  : "You submitted a request to redeem this coupon!"}
              </span>
            </div>
            {coupon?.request_note && (
              <p className="text-xs text-white/90 italic bg-black/30 p-2.5 rounded-xl border border-white/10">
                &ldquo;{coupon.request_note}&rdquo;
              </p>
            )}
            {coupon?.preferred_date && (
              <p className="text-[11px] text-purple-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>
                  Preferred Time: {new Date(coupon.preferred_date).toLocaleString()}
                </span>
              </p>
            )}
            <p className="text-[11px] text-white/50">
              {isCreator
                ? "Click 'Accept Request' below to confirm you'll grant this treat!"
                : "Awaiting issuer acceptance. Requesting does not mark it fulfilled."}
            </p>
          </div>
        )}

        {activeStatus === "accepted" && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Coupon Accepted by {senderName}!</span>
            </div>
            <p className="text-xs text-white/80">
              This coupon has been accepted! Enjoy your romantic pampering. When complete, the issuer can mark it fulfilled.
            </p>
            {activeEnableScheduling && (
              <button
                type="button"
                onClick={scrollToInvitation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-md mt-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Coordinate in Date Invitation Flow</span>
              </button>
            )}
          </div>
        )}

        {activeStatus === "fulfilled" && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/15 to-purple-500/15 border border-rose-500/30 text-center space-y-2 relative overflow-hidden">
            <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-rose-500/20 text-rose-300">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <h4 className="text-sm font-bold text-rose-200 uppercase tracking-wider">
              Redeemed With Love
            </h4>
            <p className="text-xs text-white/70 max-w-sm mx-auto">
              This special coupon has been fulfilled and completed. A cherished memory saved between the two of you!
            </p>
            {coupon?.fulfilled_at && (
              <p className="text-[10px] text-white/40">
                Completed on {new Date(coupon.fulfilled_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {activeStatus === "cancelled" && (
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 space-y-1">
            <div className="font-semibold text-white/80 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Coupon Cancelled</span>
            </div>
            {coupon?.cancel_reason && (
              <p className="text-[11px] text-white/50 italic">&ldquo;{coupon.cancel_reason}&rdquo;</p>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Recipient Action: Request to use */}
        {!isCreator && activeStatus === "available" && !isExpired && (
          <div>
            {!showRequestForm ? (
              <button
                type="button"
                onClick={() => setShowRequestForm(true)}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-transform active:scale-98 shadow-xl cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.glow})`,
                  boxShadow: `0 6px 20px ${palette.glow}40`,
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Request to use this coupon</span>
              </button>
            ) : (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleRequestCoupon}
                className="p-4 rounded-2xl bg-black/40 border border-white/15 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Redemption Request</span>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="text-white/40 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-white/60 block mb-1">
                    Special Note or Request (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    maxLength={300}
                    placeholder="e.g. This Friday night after work please! ❤️"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-pink-400"
                  />
                </div>

                {activeEnableScheduling && (
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1">
                      Preferred Date / Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-400"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white/70 hover:bg-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: palette.accent }}
                  >
                    {submitting ? (
                      <span>Sending request...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Request</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}

        {/* Issuer Management Controls */}
        {isCreator && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            {activeStatus === "requested" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleManageAction("accept")}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Request</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleManageAction("decline_request")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/70 bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                  title="Return to available status"
                >
                  Decline for now
                </button>
              </div>
            )}

            {activeStatus === "accepted" && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleManageAction("fulfill")}
                className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}, #ec4899)`,
                }}
              >
                <Heart className="w-4 h-4 fill-current" />
                <span>Mark as Fulfilled &amp; Completed</span>
              </button>
            )}

            {/* Cancel coupon option */}
            {activeStatus !== "fulfilled" && activeStatus !== "cancelled" && (
              <div className="text-right">
                {!showCancelPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    className="text-[11px] text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Cancel coupon
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left space-y-2 mt-2">
                    <span className="text-[11px] font-bold text-white/80">Cancel this coupon?</span>
                    <input
                      type="text"
                      placeholder="Optional reason..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={150}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(false)}
                        className="px-2.5 py-1 rounded-lg text-[10px] text-white/60 hover:bg-white/10"
                      >
                        Keep coupon
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManageAction("cancel")}
                        disabled={submitting}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-500/80 text-white hover:bg-rose-500"
                      >
                        Confirm Cancel
                      </button>
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
}
