"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, HeartHandshake, Layers3, Loader2, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl, authErrorMessage, authReturnCookie, googleSignInRequest, signInDestination } from "@/lib/auth/navigation";
import { useAuth } from "@/context/AuthContext";
import account from "@/components/account/account.module.css";
import styles from "@/components/account/auth.module.css";

export default function AuthForm({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const inviteCode = (params.get("code") || "").slice(0, 100);
  const destination = signInDestination(new URLSearchParams(params.toString()));
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(() => {
    const text = authErrorMessage(params.get("error"));
    return text ? { error: true, text } : params.get("notice") === "account_deleted" ? { error: false, text: "Your QubitSells account has been deleted. Thank you for spending time with us." } : null;
  });
  const client = createClient();
  useEffect(() => { if (!authLoading && user) router.replace(destination); }, [authLoading, user, router, destination]);

  const savePersistence = () => {
    document.cookie = `bonded_remember_session=${remember ? "1" : "0"}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null); setBusy(true); savePersistence();
    const callback = authCallbackUrl(window.location.origin, destination);
    try {
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace(destination); router.refresh();
      } else {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: callback },
        });
        if (error) throw error;
        if (data.session) { router.replace(destination); router.refresh(); }
        else setMessage({ error: false, text: `Your account is almost ready. Check ${email.trim()} for a confirmation email, then sign in.` });
      }
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "We couldn’t sign you in. Please try again." }); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setSocialBusy(true); setMessage(null); savePersistence();
    document.cookie = authReturnCookie(destination, window.location.protocol === "https:");
    try {
      const { data, error } = await client.auth.signInWithOAuth(googleSignInRequest(window.location.origin));
      if (error) throw error;
      if (!data.url) throw new Error("Missing sign-in URL");
      window.location.assign(data.url);
    } catch { document.cookie = authReturnCookie(destination, window.location.protocol === "https:", true); setSocialBusy(false); setMessage({ error: true, text: "Google sign-in couldn’t be started. Please try again." }); }
  };

  return <div className={styles.authGrid}>
    <section className={styles.authStory} aria-labelledby="auth-story-title"><p className={account.eyebrow}>A QubitSells account, for everyone</p><h1 id="auth-story-title">Make it personal.<br />Make it <em>yours.</em></h1><p>One account for your templates, creations, and projects. Bring your own ideas and make space for what matters to you.</p><div className={styles.useCases}>
      <div><Layers3 size={20} aria-hidden="true" /><div><h2>Your everyday moments</h2><p>Create for yourself, your friends, or your family.</p></div></div>
      <div><BriefcaseBusiness size={20} aria-hidden="true" /><div><h2>Your work, your way</h2><p>Keep your business details and creations in one account.</p></div></div>
      <div><HeartHandshake size={20} aria-hidden="true" /><div><h2>A space for two, if you want it</h2><p>Set up a separate, optional couple profile after joining.</p></div></div>
    </div><p className={styles.storyFootnote}><LockKeyhole size={14} aria-hidden="true" />You choose what to create and who to share it with.</p></section>
    <section className={styles.authCard} aria-labelledby="auth-title">
      <div className={styles.modeSwitch} role="group" aria-label="Account access">{([['login', 'Sign in'], ['signup', 'Create account']] as const).map(([value, label]) => <button key={value} type="button" disabled={busy || socialBusy} aria-pressed={mode === value} onClick={() => { setMode(value); setMessage(null); }}>{label}</button>)}</div>
      <h2 id="auth-title">{mode === "login" ? "Welcome back." : "A place to make it yours."}</h2><p className={styles.authDescription}>{mode === "login" ? "Sign in to your account and pick up where you left off." : "Create your individual account. Start with your own details."}</p>
      {inviteCode && <div className={styles.invitationNotice}><HeartHandshake size={18} aria-hidden="true" /><p>You have a Couple Space invitation. After signing in, you can review it and choose whether to connect.</p></div>}
      {message && <p className={message.error ? account.errorMessage : account.successMessage} role={message.error ? "alert" : "status"}>{!message.error && <CheckCircle2 size={16} aria-hidden="true" />}{message.text}</p>}
      <button type="button" onClick={() => void google()} disabled={busy || socialBusy} aria-busy={socialBusy} className={styles.googleButton}>{socialBusy ? <Loader2 size={17} className={account.spinner} aria-hidden="true" /> : <GoogleIcon />}{socialBusy ? "Connecting to Google…" : "Continue with Google"}</button>
      <p className={styles.googleTerms}>By continuing with Google, you agree to our <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and acknowledge our <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</p>
      <div className={styles.divider}><span>or use your email</span></div>
      <form onSubmit={submit} className={styles.authForm}><fieldset disabled={busy || socialBusy}>
        {mode === "signup" && <div className={account.field}><label htmlFor="auth-name">Your name</label><input id="auth-name" type="text" name="name" value={name} onChange={event => setName(event.target.value)} maxLength={100} autoComplete="name" placeholder="Your first and last name" required /></div>}
        <div className={account.field}><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></div>
        <div className={account.field}><label htmlFor="auth-password">Password{mode === "signup" && <span>At least 8 characters</span>}</label><div className={styles.passwordInput}><input id="auth-password" type={showPassword ? "text" : "password"} name="password" value={password} onChange={event => setPassword(event.target.value)} minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "Create a password" : "Enter your password"} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        <label className={styles.remember}><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />Keep me signed in on this device</label>
        {mode === "signup" && <label className={styles.agreement}><input type="checkbox" required /><span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and have read the <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</span></label>}
        <button type="submit" className={`${account.button} ${account.primary} ${styles.submitButton}`}>{busy ? <Loader2 size={17} className={account.spinner} aria-hidden="true" /> : <>{mode === "login" ? "Sign in" : "Create my account"}<ArrowRight size={17} aria-hidden="true" /></>}</button>
      </fieldset></form>
      <p className={styles.authHelp}><Link href="/reset-password">Forgot your password?</Link></p>
      <p className={styles.authHelp}>Need a hand? <Link href="/contact">Contact &amp; help</Link></p>
    </section>
  </div>;
}

function GoogleIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>;
}
