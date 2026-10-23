import "server-only";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";

export function smtpSettings(env: Record<string, string | undefined> = process.env) {
  if (env.EMAIL_DELIVERY_ENABLED !== "true" || !env.SMTP_PASSWORD) return null;
  const host = env.SMTP_HOST?.trim() || "mail.spacemail.com";
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER?.trim() || "support@qubitsells.com";
  const from = env.SMTP_FROM?.trim() || user;
  if (!/^[a-z0-9.-]+$/i.test(host) || ![465, 587].includes(port) || !z.email().safeParse(user).success || !z.email().safeParse(from).success) {
    throw new Error("Invalid SMTP configuration. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_FROM.");
  }
  const options: SMTPTransport.Options = {
    host, port, secure: port === 465, requireTLS: port === 587,
    auth: { user, pass: env.SMTP_PASSWORD },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true,
    logger: false, debug: false,
  };
  return { options, from };
}

export type TransactionalEmail = { to: string; subject: string; html: string; text: string; messageId: string };

export async function verifySmtp() {
  const settings = smtpSettings();
  if (!settings) throw new Error("Set EMAIL_DELIVERY_ENABLED=true and SMTP_PASSWORD first.");
  await nodemailer.createTransport(settings.options).verify();
}

export async function sendSmtpEmail(message: TransactionalEmail) {
  const settings = smtpSettings();
  if (!settings) throw new Error("Email delivery is not configured.");
  if (!z.email().safeParse(message.to).success) throw new Error("Invalid recipient.");
  const transport = nodemailer.createTransport(settings.options);
  const result = await transport.sendMail({
    ...message,
    from: { name: "QubitSells", address: settings.from }, replyTo: settings.from,
    envelope: { from: settings.from, to: [message.to] },
    headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
    disableFileAccess: true, disableUrlAccess: true,
  });
  if (!result.accepted?.length || result.rejected?.length) throw new Error("SMTP did not accept the message.");
}
