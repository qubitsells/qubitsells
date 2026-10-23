"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, FileText, Hourglass, LockKeyhole, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import styles from "./capsules/capsules.module.css";

const TimeCapsuleStudio = dynamic(() => import("./TimeCapsuleStudio"), {
  loading: () => <div className={styles.loading} role="status"><p>Opening your private collection…</p></div>,
});

export default function CapsuleWorkspace() {
  const {user, loading} = useAuth();
  if (loading) return <div className={styles.loading} role="status"><Hourglass size={27} aria-hidden="true" /><p>Opening your private collection…</p></div>;
  if (!user) return <><nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Time capsules</span></nav><section className={styles.guest} aria-labelledby="capsule-guest-heading"><div className={styles.guestCopy}><p className={styles.eyebrow}>Your moments, kept for later</p><h1 id="capsule-guest-heading">Some things deserve<br />to be remembered.</h1><p>A letter to your future self. Photos from a turning point. A memory for someone you love. Keep a little of today to open another day.</p><Link href="/login?redirect=/time-capsule" className={`${styles.button} ${styles.primary}`}>Sign in to your collection <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/signup?redirect=/time-capsule" className={styles.quietLink}>New here? Create an account <ArrowUpRight size={14} aria-hidden="true" /></Link><span className={styles.guestNote}>Your individual account is all you need.<br />Couple Space is an optional extra.</span></div><div className={styles.heroArt}><Image src="/time-capsule-memories.webp" alt="An illustrated hourglass surrounded by light and keepsakes" fill sizes="(max-width: 700px) 90vw, 600px" priority /><span className={styles.artCaption}><Hourglass size={16} aria-hidden="true" /><span>Keep a little of today.<br /><strong>Come back to it tomorrow.</strong></span></span></div></section><div className={styles.guestFeatures}><div><FileText size={21} aria-hidden="true" /><h2>More than a letter.</h2><p>Keep photos, videos, voice notes, and written memories together in your own folders.</p></div><div><LockKeyhole size={21} aria-hidden="true" /><h2>Yours to come back to.</h2><p>Personal capsules are visible only to you. Choose a future opening date or an “open when” occasion.</p></div><div><Users size={21} aria-hidden="true" /><h2>Shared, if you choose.</h2><p>Connected partners can co-seal a shared capsule. Both people approve sealing and opening it.</p></div></div></>;
  // Identity changes destroy in-memory notes, recordings, and selected capsules.
  return <TimeCapsuleStudio key={user.id} />;
}
