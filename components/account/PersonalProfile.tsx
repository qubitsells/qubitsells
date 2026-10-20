"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CheckCircle2, Clock3, FolderHeart, Globe2, Loader2, LogOut, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNT_PURPOSES, accountProfileFromMetadata, accountProfileSchema, type AccountProfile } from "@/lib/account-profile";
import { saveAccountProfile } from "@/lib/supabase/accountProfile";
import AccountShell from "./AccountShell";
import AccountSecurity from "./AccountSecurity";
import AccountCommerce, {AccountTabs, type AccountView} from "@/components/commerce/AccountCommerce";
import styles from "./account.module.css";

export default function PersonalProfile({view="profile",reviewSlug,reviewMode}: {view?:AccountView;reviewSlug?:string;reviewMode?:string}) {
  const { user, loading } = useAuth();
  return <AccountShell>{loading ? <div className={styles.loading} role="status"><Loader2 size={24} aria-hidden="true" /><p>Loading your account…</p></div> : user ? <><AccountTabs view={view}/>{view==="profile"?<ProfileForm key={user.id} user={user}/>:<AccountCommerce key={`${user.id}:${view}`} view={view} reviewSlug={reviewSlug} reviewMode={reviewMode}/>}</> : <div className={styles.signInState}><UserRound size={30} aria-hidden="true" /><h2>A profile that’s yours.</h2><p>Sign in to manage your account, orders, saved templates, and creations.</p><Link href={`/login?redirect=${encodeURIComponent(`/profile?view=${view}`)}`} className={`${styles.button} ${styles.primary}`}>Sign in to your account <ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/signup?redirect=/profile" className={styles.textLink}>New here? Create an account <ArrowRight size={14} aria-hidden="true" /></Link></div>}</AccountShell>;
}

function ProfileForm({ user }: { user: User }) {
  const { signOut } = useAuth();
  const [saved, setSaved] = useState(() => accountProfileFromMetadata(user.user_metadata, user.email?.split("@")[0]));
  const [form, setForm] = useState<AccountProfile>(saved);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const changed = JSON.stringify(form) !== JSON.stringify(saved);
  const initials = (saved.full_name || user.email || "Q").split(/\s+/).filter(Boolean).slice(0, 2).map(word => [...word][0]).join("").toUpperCase();
  const change = (key: keyof AccountProfile, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setMessage(null); setFieldErrors(previous => ({ ...previous, [key]: "" })); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    const parsed = accountProfileSchema.safeParse(form);
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message]));
      setFieldErrors(errors); setMessage({ error: true, text: "Please check the highlighted fields." }); return;
    }
    setSaving(true);
    try {
      const result = await saveAccountProfile(createClient(), user.id, parsed.data);
      setSaved(result); setForm(result); setFieldErrors({}); setMessage({ error: false, text: "Your profile has been saved." });
    } catch (error) { setMessage({ error: true, text: error instanceof Error ? error.message : "Your profile couldn’t be saved. Please try again." }); }
    finally { setSaving(false); }
  };
  const handleSignOut = async () => {
    setSigningOut(true); setMessage(null);
    try { await signOut(); } catch { setMessage({ error: true, text: "You couldn’t be signed out. Please try again." }); }
    finally { setSigningOut(false); }
  };
  const fieldProps = (key: keyof AccountProfile) => ({ id: `account-${key}`, name: key, value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value), "aria-invalid": Boolean(fieldErrors[key]), "aria-describedby": fieldErrors[key] ? `error-${key}` : undefined });
  const errorFor = (key: string) => fieldErrors[key] ? <span id={`error-${key}`} className={styles.fieldError}>{fieldErrors[key]}</span> : null;

  return <>
    <section className={styles.identity} aria-label="Your account"><div className={styles.avatar} aria-hidden="true">{initials}</div><div><p className={styles.eyebrow}>My account</p><h2>{saved.full_name || "Your account"}</h2><p className={styles.identityEmail}><Mail size={13} aria-hidden="true" />{user.email}</p></div><span className={styles.accountBadge}><UserRound size={13} aria-hidden="true" />QubitSells member</span></section>
    <form onSubmit={save} className={styles.profileForm} noValidate>
      <fieldset disabled={saving} className={styles.formSection}><legend>Your details</legend><p className={styles.sectionDescription}>A few details to make your account feel like you.</p>
        <div className={styles.formGrid}><div className={styles.field}><label htmlFor="account-full_name">Your name</label><input {...fieldProps("full_name")} autoComplete="name" maxLength={100} required />{errorFor("full_name")}</div><div className={styles.field}><label htmlFor="account-email">Email address <span>Sign-in email</span></label><input id="account-email" value={user.email || ""} readOnly aria-describedby="account-email-help" /><small id="account-email-help">This is the email linked to your sign-in.</small></div><div className={`${styles.field} ${styles.fullWidth}`}><label htmlFor="account-bio">A short introduction <span>Optional</span></label><textarea {...fieldProps("bio")} rows={3} maxLength={300} placeholder="A little about you or what you’re working on." />{errorFor("bio")}<small>{form.bio.length}/300 characters · Kept in your account</small></div></div>
      </fieldset>
      <fieldset disabled={saving} className={styles.formSection}><legend>What brings you here?</legend><p className={styles.sectionDescription}>Choose what fits today. All three give you the same access to the platform.</p><div className={styles.purposeOptions}>{ACCOUNT_PURPOSES.map(purpose => <label key={purpose.value} className={`${styles.purposeOption} ${form.purpose === purpose.value ? styles.purposeSelected : ""}`}><input type="radio" name="purpose" value={purpose.value} checked={form.purpose === purpose.value} onChange={() => change("purpose", purpose.value)} /><span className={styles.radioMark} aria-hidden="true">{form.purpose === purpose.value && <Check size={12} />}</span><span><strong>{purpose.label}</strong><small>{purpose.description}</small></span></label>)}</div></fieldset>
      <fieldset disabled={saving} className={styles.formSection}><legend><BriefcaseBusiness size={18} aria-hidden="true" />Work details <span>Optional</span></legend><p className={styles.sectionDescription}>For your business or professional projects. Add only what’s useful to you.</p><div className={styles.formGrid}><div className={styles.field}><label htmlFor="account-organization">Business or organization</label><input {...fieldProps("organization")} autoComplete="organization" maxLength={120} placeholder="Your organization’s name" />{errorFor("organization")}</div><div className={styles.field}><label htmlFor="account-job_title">Role or title</label><input {...fieldProps("job_title")} autoComplete="organization-title" maxLength={100} placeholder="What you do" />{errorFor("job_title")}</div><div className={`${styles.field} ${styles.fullWidth}`}><label htmlFor="account-website">Website</label><div className={styles.inputIcon}><Globe2 size={16} aria-hidden="true" /><input {...fieldProps("website")} type="url" autoComplete="url" placeholder="https://your-website.com" />{errorFor("website")}</div></div></div></fieldset>
      {message && <p className={message.error ? styles.errorMessage : styles.successMessage} role={message.error ? "alert" : "status"}>{!message.error && <CheckCircle2 size={16} aria-hidden="true" />}{message.text}</p>}
      <div className={styles.saveBar}><span>{changed ? "You have unsaved changes." : "Your account. Your way."}</span><div><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={saving || !changed} onClick={() => { setForm(saved); setFieldErrors({}); setMessage(null); }}>Cancel</button><button type="submit" className={`${styles.button} ${styles.primary}`} disabled={saving || !changed}>{saving ? <Loader2 size={16} className={styles.spinner} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{saving ? "Saving…" : "Save changes"}</button></div></div>
    </form>
    <div className={styles.accountBottomGrid}><Link href="/creator-center" className={styles.creationShortcut}><FolderHeart size={21} aria-hidden="true" /><div><h3>Your ideas, made personal.</h3><p>Manage your templates, links, and replies.</p></div><ArrowUpRight size={19} aria-hidden="true" /></Link><div className={styles.memberSince}><Clock3 size={17} aria-hidden="true" /><span>Member since<strong>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(user.created_at))}</strong></span></div></div>
    <section id="account-access" className={styles.accessSection}><div><ShieldCheck size={20} aria-hidden="true" /><div><h3>Account &amp; access</h3><p>{user.email_confirmed_at ? "Your email address is verified." : "Check your inbox to confirm your email address."} <Link href="/privacy">Read our privacy policy</Link>.</p></div></div><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={signingOut} onClick={() => void handleSignOut()}><LogOut size={15} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button></section>
    <AccountSecurity user={user} />
  </>;
}
