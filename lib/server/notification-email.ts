import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { StoreOrder } from "@/lib/commerce";
import { adminClient } from "./security";
import { notificationEmail, type EmailNotification } from "./email-template";
import { sendSmtpEmail, smtpSettings, type TransactionalEmail } from "./smtp";

type SkipReason = "recipient_unavailable" | "preferences_disabled" | "superseded" | "invalid_notification";
type Prepared = { email: TransactionalEmail } | { skip: SkipReason };

async function prepareEmail(db: SupabaseClient, job: EmailNotification): Promise<Prepared> {
  const current = await db.from("store_notifications").select("id,read_at").eq("id", job.notification_id).eq("user_id", job.user_id).maybeSingle();
  if (current.error) throw new Error("Notification lookup failed.");
  if (!current.data || (job.kind === "review_request" && current.data.read_at)) return { skip: "superseded" };
  const account = await db.auth.admin.getUserById(job.user_id);
  if (account.error) {
    if (account.error.status === 404) return { skip: "recipient_unavailable" };
    throw new Error("Recipient lookup failed.");
  }
  const user = account.data.user;
  if (!user || user.id !== job.user_id || !user.email_confirmed_at || !z.email().safeParse(user.email).success) return { skip: "recipient_unavailable" };
  if (job.kind !== "order") {
    const profile = await db.from("profiles").select("email_reminders").eq("id", job.user_id).maybeSingle();
    if (profile.error) throw new Error("Preference lookup failed.");
    if (profile.data?.email_reminders === false) return { skip: "preferences_disabled" };
  }
  if (job.calendar_couple_id) {
    const pair = await db.from("couples").select("is_connected,partner_1_id,partner_2_id").eq("id", job.calendar_couple_id).maybeSingle();
    if (pair.error) throw new Error("Calendar access lookup failed.");
    if (!pair.data?.is_connected || ![pair.data.partner_1_id, pair.data.partner_2_id].includes(job.user_id)) return { skip: "superseded" };
  }
  let order: StoreOrder | undefined;
  if (job.kind === "order" || job.kind === "review_request") {
    const reference = /^(?:order|review):([a-f0-9-]{36})(?::(paid|refunded|expired))?$/.exec(job.dedupe_key);
    if (!reference || !z.uuid().safeParse(reference[1]).success) return { skip: "invalid_notification" };
    const result = await db.from("store_orders").select("id,buyer_id,product_name,product_slug,duration_hours,amount_cents,currency,payment_mode,status,created_at,paid_at,fulfilled_at,template_id,refunded_amount_cents").eq("id", reference[1]).eq("buyer_id", job.user_id).maybeSingle();
    if (result.error) throw new Error("Order lookup failed.");
    if (!result.data || (job.kind === "order" ? result.data.status !== reference[2] : result.data.status !== "paid")) return { skip: "superseded" };
    order = result.data as StoreOrder;
  }
  return { email: notificationEmail(job, user.email!, order) };
}

export async function deliverNotificationEmails(options: { db?: SupabaseClient; send?: (email: TransactionalEmail) => Promise<void>; batchSize?: number } = {}) {
  const result = { enabled: false, attempted: 0, sent: 0, skipped: 0, deferred: 0 };
  if (!smtpSettings()) return result;
  result.enabled = true;
  const db = options.db || adminClient();
  const claimed = await db.rpc("qubit_claim_notification_emails", { p_limit: Math.max(1, Math.min(options.batchSize || 2, 20)) });
  if (claimed.error) throw new Error("Email queue is unavailable. Apply the email outbox migration.");
  const jobs = (claimed.data || []) as EmailNotification[];
  result.attempted = jobs.length;
  // Two SMTP connections at a time; each job has its own database lease.
  for (let start = 0; start < jobs.length; start += 2) {
    await Promise.all(jobs.slice(start, start + 2).map(async job => {
      let outcome: "sent" | "retry" | "skipped" = "retry";
      let code: string | null = "lookup_failed";
      try {
        const prepared = await prepareEmail(db, job);
        if ("skip" in prepared) { outcome = "skipped"; code = prepared.skip; }
        else {
          code = "smtp_failed";
          await (options.send || sendSmtpEmail)(prepared.email);
          outcome = "sent"; code = null;
        }
      } catch { /* Retry durable work; do not log addresses, tokens or SMTP errors. */ }
      const finished = await db.rpc("qubit_finish_notification_email", { p_notification_id: job.notification_id, p_lease_token: job.lease_token, p_outcome: outcome, p_error: code });
      if (finished.error || finished.data !== true || outcome === "retry") result.deferred++;
      else if (outcome === "sent") result.sent++;
      else result.skipped++;
    }));
  }
  return result;
}

export function scheduleNotificationEmails() {
  if (process.env.EMAIL_DELIVERY_ENABLED !== "true" || !process.env.SMTP_PASSWORD) return;
  after(async () => {
    try { await deliverNotificationEmails(); }
    catch { console.error("Notification email delivery deferred; queued records retained."); }
  });
}

export function withNotificationEmails<Args extends unknown[], Result extends Response>(handler: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result> => {
    const response = await handler(...args);
    if (response.ok) scheduleNotificationEmails();
    return response;
  };
}
