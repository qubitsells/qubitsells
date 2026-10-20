import type { CapsuleSealRequest, TimeCapsuleRecord } from "@/lib/supabase/timeCapsules";

export const CAPSULE_CATEGORIES = {milestone: "Milestone", anniversary: "Anniversary", open_when: "Open when", predictions: "Predictions", memories: "Memories"} as const;
export type CapsuleState = "sealed" | "opened" | "waiting" | "declined";
export function capsuleState(capsule: TimeCapsuleRecord, request?: CapsuleSealRequest): CapsuleState {
  if (capsule.is_locked) return "sealed";
  if (capsule.seal_mode === "couple" && request?.status !== "accepted") return request?.status === "rejected" ? "declined" : "waiting";
  return "opened";
}
export type CapsuleFilters = {scope: "all" | "solo" | "couple"; category: string; query: string; sort: "newest" | "unlock"};
function timestamp(value?: string) { const time = Date.parse(value || ""); return Number.isNaN(time) ? 0 : time; }
export function filterCapsules(capsules: TimeCapsuleRecord[], filters: CapsuleFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return capsules.filter(capsule => (filters.scope === "all" || (capsule.seal_mode || "solo") === filters.scope)
    && (filters.category === "all" || capsule.category === filters.category)
    && (!query || capsule.title.toLocaleLowerCase().includes(query)))
    .sort((a, b) => filters.sort === "unlock"
      ? (timestamp(a.unlock_date) || Infinity) - (timestamp(b.unlock_date) || Infinity)
      : timestamp(b.created_at || b.sealed_date) - timestamp(a.created_at || a.sealed_date));
}
export function formatCapsuleDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "When you need it";
  // Date-only values are calendar dates, not UTC instants.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short", year: "numeric"}).format(date);
}
