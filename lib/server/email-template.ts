import "server-only";
import { durationLabel, money, type StoreOrder } from "@/lib/commerce";
import { getSiteUrl, PUBLIC_SITE_ORIGIN } from "@/lib/storefront";
import { safeRedirect } from "@/lib/security/validation";
import type { TransactionalEmail } from "./smtp";

export type EmailNotification = {
  notification_id: string; lease_token: string; user_id: string;
  kind: string; title: string; message: string; href: string; dedupe_key: string;
  calendar_couple_id: string | null; read_at: string | null;
};
export const escapeEmailHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function notificationEmail(notification: EmailNotification, to: string, order?: StoreOrder): TransactionalEmail {
  const base = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  const paid = notification.kind === "order" && notification.dedupe_key.endsWith(":paid") && order;
  const refunded = notification.kind === "order" && notification.dedupe_key.endsWith(":refunded") && order;
  const test = order?.payment_mode === "test";
  const title = paid ? "Your order is confirmed." : notification.title.slice(0, 200);
  const subject = `${test ? "[Test] " : ""}${paid ? "Your QubitSells order is confirmed" : notification.title.slice(0, 150)}`;
  const message = paid ? (test ? "Your test order is ready. No real payment was taken. You can now personalize your template." : "Thank you for your purchase. Your template is ready for your words, photos, and memories.") : notification.message.slice(0, 2000);
  const action = paid ? "Personalize your template" : notification.kind === "review_request" ? "Leave a quick review" : notification.kind === "template_response" ? "See the response" : notification.kind.startsWith("calendar_") ? "Open shared calendar" : notification.kind === "order" ? "View your order" : "View update";
  const url = new URL(paid ? "/my-templates" : safeRedirect(notification.href, "/profile?view=notifications"), base).toString();
  const details: [string, string][] = order ? [
    ["Template", order.product_name], ["Order reference", order.id.toUpperCase()],
    [refunded ? "Refund amount" : "Order total", `${money(refunded ? order.refunded_amount_cents : order.amount_cents)} USD${test ? " · Test purchase" : ""}`],
    ["Link duration", durationLabel(order.duration_hours)],
  ] : [];
  const e = escapeEmailHtml;
  const rows = details.map(([label, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #edd5dc;color:#75666b;font-size:13px;vertical-align:top">${e(label)}</td><td style="padding:10px 0 10px 16px;border-bottom:1px solid #edd5dc;color:#281b20;font-size:13px;text-align:right;overflow-wrap:anywhere">${e(value)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${e(title)}</title></head><body style="margin:0;padding:0;background:#faf1f3;font-family:Arial,Helvetica,sans-serif;color:#281b20"><div style="display:none;max-height:0;overflow:hidden">${e(message)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dcc0c8;border-radius:12px;overflow:hidden"><tr><td style="padding:25px 30px;background:#481925;color:#fff;font-size:23px;font-weight:bold">QubitSells</td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;color:#713347;text-transform:uppercase">${test ? "Test purchase" : "A little update for you"}</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px;line-height:1.25;font-weight:normal">${e(title)}</h1><p style="font-size:15px;line-height:1.8;margin:0 0 22px">${e(message)}</p>${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px">${rows}</table>` : ""}<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#481925" style="border-radius:7px"><a href="${e(url)}" style="display:inline-block;padding:15px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">${e(action)} &rarr;</a></td></tr></table>${paid ? '<p style="font-size:12px;line-height:1.8;color:#75666b;margin:18px 0 0">Your sharing-link duration begins when you publish.</p>' : ""}<p style="font-size:12px;line-height:1.8;color:#75666b;margin:25px 0 0">If the button doesn’t open, visit:<br><a href="${e(url)}" style="color:#481925;overflow-wrap:anywhere">${e(url)}</a></p></td></tr><tr><td style="padding:22px 30px;border-top:1px solid #edd5dc;font-size:12px;line-height:1.9;color:#75666b">Sent for activity on your QubitSells account.<br>Need a hand? <a href="mailto:support@qubitsells.com" style="color:#481925">support@qubitsells.com</a><br><a href="${e(new URL('/profile', base).toString())}" style="color:#481925">Your account</a> &middot; <a href="${e(new URL('/privacy', base).toString())}" style="color:#481925">Privacy policy</a></td></tr></table></td></tr></table></body></html>`;
  const text = [`QubitSells`, title, message, ...details.map(([label, value]) => `${label}: ${value}`), `${action}: ${url}`, ...(paid ? ["Your sharing-link duration begins when you publish."] : []), "Need help? support@qubitsells.com"].join("\n\n");
  return { to, subject, html, text, messageId: `<notification-${notification.notification_id}@qubitsells.com>` };
}
