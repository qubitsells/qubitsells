"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { saveNewPassword, sendPasswordReset } from "@/lib/auth/password";
import account from "./account.module.css";
import styles from "./security.module.css";

export default function PasswordReset() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      if (user) {
        await saveNewPassword(createClient(), { password, confirm });
        setUpdated(true); setPassword(""); setConfirm("");
        setNotice({ error: false, text: "Your password has been updated. You can use it the next time you sign in." });
      } else {
        await sendPasswordReset(createClient(), email, window.location.origin);
        setNotice({ error: false, text: "If an account exists for that address, a reset email is on its way. Open the link in this browser to continue." });
      }
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  };
  return <main id="main-content" className={styles.resetPage}><span className={styles.icon}><KeyRound size={23} aria-hidden="true" /></span><h1>{updated ? "A fresh start." : user ? "Choose a new password." : "Reset your password."}</h1><p>{user ? "Choose a password for your QubitSells account. If you use Google sign-in, your Google password stays the same." : "Enter your account email and we’ll send a secure link to help you get back in."}</p>
    {notice && <p className={notice.error ? account.errorMessage : account.successMessage} role={notice.error ? "alert" : "status"}>{!notice.error && <CheckCircle2 size={17} aria-hidden="true" />}{notice.text}</p>}
    {loading ? <p role="status">Checking your sign-in…</p> : !updated && <form onSubmit={event => void submit(event)} className={styles.resetForm}>
      {user ? <><div className={account.field}><label htmlFor="reset-new-password">New password</label><div className={styles.passwordControl}><input id="reset-new-password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required disabled={busy} aria-describedby="reset-password-help" /><button type="button" disabled={busy} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small id="reset-password-help">Use at least 8 characters and a password you haven’t used elsewhere.</small></div><div className={account.field}><label htmlFor="reset-confirm-password">Confirm new password</label><input id="reset-confirm-password" type={showPassword ? "text" : "password"} value={confirm} onChange={event => setConfirm(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required disabled={busy} /></div></> : <div className={account.field}><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} required disabled={busy} /></div>}
      <button type="submit" disabled={busy} className={`${account.button} ${account.primary}`}>{busy ? <Loader2 size={17} className={account.spinner} aria-hidden="true" /> : user ? <KeyRound size={17} aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}{busy ? "Please wait…" : user ? "Save new password" : "Send reset link"}</button>
    </form>}
    <Link className={styles.backLink} href={user ? "/profile#account-security" : "/login"}><ArrowLeft size={15} aria-hidden="true" />{user ? "Back to my profile" : "Back to sign in"}</Link>
  </main>;
}
