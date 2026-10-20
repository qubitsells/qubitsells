"use client";
import {useEffect,useId,useRef,useState} from "react";
import {BadgeCheck,Loader2,Star,X} from "lucide-react";
import type {ReviewsData} from "@/lib/commerce";
import ReviewForm from "./ReviewForm";
import styles from "./commerce.module.css";

export default function QuickReview({slug,label="Quick review",initialOpen=false,onSaved}: {slug:string;label?:string;initialOpen?:boolean;onSaved?:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),heading=useId();const [open,setOpen]=useState(initialOpen);
  useEffect(()=>{if(!open)return;const element=dialog.current;if(!element)return;element.showModal();const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{element.close();document.body.style.overflow=previous;};},[open]);
  return <><button type="button" className={`${styles.button} ${styles.reviewCta}`} onClick={()=>setOpen(true)} aria-haspopup="dialog"><Star size={17} aria-hidden="true"/>{label}<span className={styles.reviewCtaArrow} aria-hidden="true">↗</span></button>
    <dialog ref={dialog} aria-labelledby={heading} className={styles.reviewDialog} onClose={()=>{if(!dialog.current?.open)setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setOpen(false);}}}>
      <div className={styles.reviewDialogHeading}><div><p className={styles.eyebrow}>Your experience matters</p><h2 id={heading}>A little feedback.<br/>A big difference.</h2></div><button type="button" aria-label="Close review" onClick={()=>setOpen(false)}><X size={21} aria-hidden="true"/></button></div>
      {open&&<ReviewEditor slug={slug} onSaved={()=>{setOpen(false);onSaved?.();}}/>}
    </dialog></>;
}
function ReviewEditor({slug,onSaved}: {slug:string;onSaved:()=>void}) {
  const [data,setData]=useState<ReviewsData|null>(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/products/${slug}/reviews`,{cache:"no-store",signal:controller.signal}).then(async response=>{const value=await response.json();if(!response.ok)throw Error(value.error||"Your purchase couldn’t be checked.");setData(value);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Please try again.");});return()=>controller.abort();},[slug,attempt]);
  if(error)return <div className={styles.notice} role="alert">{error}<button type="button" onClick={()=>{setError("");setAttempt(value=>value+1);}}>Try again</button></div>;
  if(!data)return <p className={styles.reviewLoading} role="status"><Loader2 size={19} className={styles.spinner} aria-hidden="true"/>Checking your purchase…</p>;
  if(!data.eligible_order_id)return <p className={styles.notice}>A confirmed purchase in the current store is required to review this template. Check My orders for payment details.</p>;
  return <><p className={styles.reviewVerification}><BadgeCheck size={15} aria-hidden="true"/>{data.mode==="test"?"Test purchase · Your review will be labelled":"Verified purchase · Share your honest opinion"}</p><ReviewForm slug={slug} orderId={data.eligible_order_id} ownReview={data.own_review} onSaved={onSaved}/></>;
}
