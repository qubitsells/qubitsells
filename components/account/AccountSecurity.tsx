"use client";

import { useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { KeyRound, Loader2, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { clearCapsuleCache } from "@/lib/supabase/timeCapsules";
import { sendPasswordReset } from "@/lib/auth/password";
import account from "./account.module.css";
import styles from "./security.module.css";

export default function AccountSecurity({ user }: { user: User }) {
  const { signOut } = useAuth();
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resetNotice, setResetNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const google = user.app_metadata?.providers?.includes("google") || user.app_metadata?.provider === "google";

  const resetPassword = async () => {
    if (!user.email) return;
    setSending(true); setResetNotice(null);
    try {
      await sendPasswordReset(createClient(), user.email, window.location.origin);
      setResetNotice({ error: false, text: `Check ${user.email} for your reset link. Open it in this browser to choose a new password.` });
    } catch (error) { setResetNotice({ error: true, text: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSending(false); }
  };
  const close = () => { if (!deleting) { setOpen(false); setEmail(""); setConfirmation(""); setDeleteError(""); trigger.current?.focus(); } };
  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setDeleting(true); setDeleteError("");
    try {
      const response = await fetch("/api/account/security", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), confirmation }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 401 || response.status === 403) setNeedsSignIn(true); throw new Error(result.error || "Your account couldn’t be deleted. Please try again."); }
      try { await createClient().auth.signOut({ scope: "local" }); } catch { /* The account has already been deleted. */ }
      clearCapsuleCache();
      window.location.replace("/login?notice=account_deleted");
    } catch (error) { setDeleteError(error instanceof Error ? error.message : "Please try again."); setDeleting(false); }
  };
  const signInAgain = async () => {
    setDeleting(true); setDeleteError("");
    try {
      await signOut();
      const login = new URL("/login", window.location.origin);
      login.searchParams.set("redirect", "/profile#account-security");
      window.location.replace(login.toString());
    }
    catch { setDeleting(false); setDeleteError("You couldn’t be signed out. Please try again."); }
  };

  return <section id="account-security" className={styles.security} aria-labelledby="security-title">
    <header><p className={account.eyebrow}>In your control</p><h2 id="security-title">Account security.</h2><p>Manage how you sign in, and what happens to your account.</p></header>
    <div className={styles.securityCard}><div className={styles.cardHeading}><span className={styles.icon}><KeyRound size={21} aria-hidden="true" /></span><div><h3>{google ? "Set or reset your password" : "Reset your password"}</h3><p>{google ? "Create a QubitSells password by email. Your Google sign-in and Google password stay the same." : "We’ll email a secure link to your account address so you can choose a new password."}</p></div></div><button type="button" disabled={sending || deleting || !user.email} className={`${account.button} ${account.secondary}`} onClick={() => void resetPassword()}>{sending ? <Loader2 size={16} className={account.spinner} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}{sending ? "Sending reset link…" : "Send password reset email"}</button>{resetNotice && <p className={resetNotice.error ? account.errorMessage : account.successMessage} role={resetNotice.error ? "alert" : "status"}>{resetNotice.text}</p>}</div>
    <div className={`${styles.securityCard} ${styles.deleteCard}`}><div className={styles.cardHeading}><span className={styles.deleteIcon}><Trash2 size={21} aria-hidden="true" /></span><div><h3>Delete your account</h3><p>Permanently remove your account and its content. Take a moment to save anything you want to keep.</p></div></div>
      <button ref={trigger} type="button" className={`${account.button} ${styles.deleteOutline}`} disabled={deleting || sending} aria-expanded={open} aria-controls="delete-account-confirmation" onClick={() => { setOpen(value => !value); if (!open) requestAnimationFrame(() => emailInput.current?.focus()); }}>Delete account</button>
      {open && <form id="delete-account-confirmation" className={styles.confirmation} onSubmit={event => void deleteAccount(event)} onKeyDown={event => { if (event.key === "Escape") close(); }} aria-labelledby="deletion-title">
        <h4 id="deletion-title">Leave QubitSells?</h4><p>Your profile, purchases, wishlist, reviews, published templates and recipient responses will be removed. Your personal capsules and shared couple capsules will be deleted, and your Couple Space connection will close.</p><p>Your partner keeps their own account, purchases and personal capsules. Media cleanup is queued securely. Deletion does not issue a refund or remove copies held by recipients or payment providers.</p>
        <p className={styles.confirmationNote}><ShieldCheck size={16} aria-hidden="true" />You’ll need to have signed in within the last 10 minutes.</p>
        <fieldset disabled={deleting || needsSignIn}><div className={account.field}><label htmlFor="delete-account-email">Your account email</label><input ref={emailInput} id="delete-account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required maxLength={254} /></div><div className={account.field}><label htmlFor="delete-account-word">Type DELETE to confirm</label><input id="delete-account-word" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} required pattern="DELETE" /></div></fieldset>
        {deleteError && <p className={account.errorMessage} role="alert">{deleteError}</p>}
        <div className={styles.actions}><button type="button" disabled={deleting} className={`${account.button} ${account.secondary}`} onClick={close}>Keep my account</button>{needsSignIn ? <button type="button" disabled={deleting} className={`${account.button} ${account.primary}`} onClick={() => void signInAgain()}>Sign in again to continue</button> : <button type="submit" disabled={deleting || confirmation !== "DELETE" || email.trim().toLowerCase() !== user.email?.toLowerCase()} className={`${account.button} ${account.dangerButton}`}>{deleting ? <Loader2 size={16} className={account.spinner} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}{deleting ? "Deleting your account…" : "Permanently delete account"}</button>}</div>
      </form>}
    </div>
  </section>;
}
