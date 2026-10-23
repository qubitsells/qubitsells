import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { verifySmtp, sendSmtpEmail, smtpSettings } from "../lib/server/smtp";
import { notificationEmail } from "../lib/server/email-template";

nextEnv.loadEnvConfig(process.cwd());
try {
  if (!smtpSettings()) throw new Error("not_configured");
  if (process.argv[2] === "verify") {
    await verifySmtp();
    console.log("SMTP connection, TLS and authentication verified. No email was sent.");
  } else if (process.argv[2] === "send") {
    const to = z.email().parse(process.argv[3]);
    const message = notificationEmail({ notification_id: randomUUID(), lease_token: randomUUID(), user_id: randomUUID(), kind: "setup", title: "Your QubitSells email setup is working.", message: "This is the test email you requested. Order confirmations and account activity will use this sender and design.", href: "/profile?view=notifications", dedupe_key: "setup", calendar_couple_id: null, read_at: null }, to);
    await sendSmtpEmail(message);
    console.log("Your requested test email was accepted by SMTP. Check the recipient inbox and spam folder.");
  } else throw new Error("invalid_command");
} catch (error) {
  const code = error && typeof error === "object" && "code" in error && ["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "ETLS"].includes(String(error.code)) ? String(error.code) : "CONFIG_OR_DELIVERY";
  const stage = error && typeof error === "object" && "command" in error && ["CONN", "EHLO", "HELO", "STARTTLS", "AUTH LOGIN", "AUTH PLAIN"].includes(String(error.command)) ? `, ${String(error.command)}` : "";
  console.error(`SMTP check failed (${code}${stage}). Check EMAIL_DELIVERY_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD. See docs/email-setup.md.`);
  process.exitCode = 1;
}
