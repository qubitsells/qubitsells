"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  KeyRound,
  Copy,
  Check,
  Share2,
  Sparkles,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  Unlink,
  AlertTriangle,
  X,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function CouplePairingCard() {
  const { isConnected, coupleCode, partnerName, pairWithCode, disconnect } = useAuth();

  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Disconnection modal states
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleCopyCode = () => {
    if (!coupleCode) return;
    navigator.clipboard.writeText(coupleCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    if (!coupleCode) return;
    const inviteUrl = `${window.location.origin}/signup?code=${coupleCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoading(true);
    setResult(null);

    const res = await pairWithCode(inputCode);
    setLoading(false);

    if (res.success) {
      setResult({ type: "success", message: res.message });
      setInputCode("");
    } else {
      setResult({ type: "error", message: res.message });
    }
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    setResult(null);

    const res = await disconnect();
    setIsDisconnecting(false);
    setIsDisconnectModalOpen(false);

    if (res.success) {
      setResult({
        type: "success",
        message: res.message || "Disconnected successfully. Your couple space has been unlinked.",
      });
    } else {
      setResult({
        type: "error",
        message: res.message || "Could not disconnect at this time. Please try again.",
      });
    }
  };

  if (isConnected) {
    return (
      <>
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-50/90 via-rose-50/50 to-pink-50/60 border border-emerald-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Connected &amp; Synced with {partnerName || "Partner"} 💕
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Your private 2-person sanctuary is active. Real-time updates enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>

              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="px-3 py-1 rounded-full bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Disconnect from partner"
              >
                <Unlink className="w-3 h-3 text-rose-500" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2.5 border ${
                result.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{result.message}</span>
            </motion.div>
          )}
        </div>

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
                      Disconnect from {partnerName || "Partner"}?
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
      </>
    );
  }

  return (
    <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-white/95 via-rose-50/80 to-amber-50/40 backdrop-blur-xl border border-rose-200/90 shadow-[0_12px_35px_-10px_rgba(244,63,94,0.12)] space-y-6">
      
      {/* Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-[#2a0817]">
                Couple Space: Not Connected Yet
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-1 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Waiting for Partner
              </span>
            </div>
            <p className="text-xs text-[#6e2744] font-medium mt-0.5">
              Connect with your partner to share private countdowns, vibe checks, and time capsules.
            </p>
          </div>
        </div>
      </div>

      {/* Result Notice */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2.5 border ${
            result.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{result.message}</span>
        </motion.div>
      )}

      {/* 2-Column Pairing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Option 1: Share Your Code */}
        <div className="p-4 rounded-2xl bg-white/90 border border-rose-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-rose-500" />
              Step 1: Invite Your Partner
            </span>
            <p className="text-xs text-[#68243e] mt-1 font-medium">
              Send your unique Love Code to your partner so they can join your space.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="font-mono text-sm font-extrabold text-rose-950 tracking-wider">
                {coupleCode || "LOVE-JOIN"}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 text-rose-900 text-xs font-bold transition-colors border border-rose-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-rose-200/80 cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>{copiedLink ? "Invite URL Copied! 💕" : "Copy 1-Click Signup Invite Link"}</span>
            </button>
          </div>
        </div>

        {/* Option 2: Enter Partner's Code */}
        <div className="p-4 rounded-2xl bg-white/90 border border-rose-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rose-500" />
              Step 2: Or Enter Partner&#39;s Code
            </span>
            <p className="text-xs text-[#68243e] mt-1 font-medium">
              If your partner already sent you a Love Code, enter it here to link instantly.
            </p>
          </div>

          <form onSubmit={handlePairSubmit} className="space-y-2">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
              <input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. LOVE-8824"
                maxLength={70}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-rose-50/60 border border-rose-200 text-xs font-mono font-bold text-rose-950 uppercase placeholder:text-rose-300 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="w-full py-2 px-3 rounded-xl btn-love-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pairing Hearts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pair Our Hearts</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
