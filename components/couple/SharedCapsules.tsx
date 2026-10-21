"use client";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import dynamic from "next/dynamic";
import styles from "./couple.module.css";

const TimeCapsuleStudio=dynamic(()=>import("@/components/TimeCapsuleStudio"),{loading:()=><p className={styles.loading} role="status">Opening your shared memories…</p>});

export default function SharedCapsules(){const {user,loading,coupleLoading,coupleError,isConnected,couple,refreshCouple}=useAuth();
  if(loading||coupleLoading)return <p className={styles.loading} role="status">Opening your shared memories…</p>;
  if(coupleError)return <div className={styles.error} role="alert">{coupleError}<button type="button" onClick={()=>void refreshCouple()}>Try again</button></div>;
  if(!user||!isConnected||!couple?.partner_2_id)return <section className={styles.welcome}><p className={styles.eyebrow}>Memories for two</p><h1>Keep a little of today,<br/>together.</h1><p>{user?"Connect with your partner to create shared time capsules. Both of you choose when to seal and open them.":"Sign in and connect with your partner to keep letters, photos, and memories in shared time capsules."}</p><div className={styles.actions}><Link className={styles.primary} href={user?"/couple-space/profile":"/login?redirect=/couple-space/time-capsules"}>{user?"Connect with your partner":"Sign in to Couple Space"}<ArrowUpRight size={16} aria-hidden="true"/></Link><Link href="/time-capsule" className={styles.secondary}>My personal collection</Link></div></section>;
  return <TimeCapsuleStudio key={`${user.id}:${couple.id}:${couple.partner_2_id}`} sharedOnly/>;
}
