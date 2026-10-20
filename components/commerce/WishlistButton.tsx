"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Heart, Loader2} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import styles from "./commerce.module.css";

export default function WishlistButton({slug}: {slug: string}) {
  const {user} = useAuth(), router = useRouter(); const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(()=>{if (!user) return; const controller = new AbortController();
    fetch("/api/account/wishlist", {signal: controller.signal, cache: "no-store"}).then(async response=>{if(!response.ok) throw Error(); const data = await response.json();setSaved(data.items.some((item: {product_slug: string})=>item.product_slug===slug));}).catch(()=>{if(!controller.signal.aborted)setError("Saved items couldn’t be loaded. Try again.");});
    return ()=>controller.abort();
  },[user,slug]);
  const toggle=async()=>{if(!user){router.push(`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`);return;} setBusy(true);setError("");try{const response=await fetch("/api/account/wishlist",{method:saved?"DELETE":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_slug:slug})});const data=await response.json();if(!response.ok)throw Error(data.error);setSaved(!saved);}catch(error){setError(error instanceof Error?error.message:"Please try again.");}finally{setBusy(false);}};
  return <div><button type="button" className={`${styles.button} ${styles.saveButton}`} disabled={busy} aria-pressed={Boolean(user&&saved)} onClick={()=>void toggle()}>{busy?<Loader2 size={17} className={styles.spinner} aria-hidden="true"/>:<Heart size={17} fill={user&&saved?"currentColor":"none"} aria-hidden="true"/>}{user&&saved?"Saved to wishlist":"Save for later"}</button>{error&&<p className={styles.error} role="alert">{error}</p>}</div>;
}
