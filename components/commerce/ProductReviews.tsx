"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {BadgeCheck,Star} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import type {ReviewsData} from "@/lib/commerce";
import styles from "./commerce.module.css";
import QuickReview from "./QuickReview";

export default function ProductReviews({slug,requestReview=false}: {slug:string;requestReview?:boolean}) {
  const {user}=useAuth();const [data,setData]=useState<ReviewsData|null>(null),[error,setError]=useState(""),[page,setPage]=useState(0),[version,setVersion]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/products/${slug}/reviews?page=${page}`,{signal:controller.signal,cache:"no-store"}).then(async response=>{const value=await response.json();if(!response.ok)throw Error(value.error);setData(value);setError("");}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Reviews couldn’t be loaded.");});return()=>controller.abort();},[slug,user,page,version]);
  return <section id="reviews" className={styles.reviews} aria-labelledby="reviews-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>From people who chose it</p><h2 id="reviews-title">Customer reviews.</h2></div>{data?.eligible_order_id&&<QuickReview key={`${user?.id}:${slug}`} slug={slug} label={data.own_review?"Edit your review":"Write a review"} initialOpen={requestReview} onSaved={()=>setVersion(value=>value+1)}/>}</div>
    {error?<div className={styles.notice} role="alert">{error}<button type="button" onClick={()=>setVersion(value=>value+1)}>Try again</button></div>:!data?<p className={styles.muted} role="status">Loading reviews…</p>:<>
    {data.mode==="test"&&<p className={styles.testNote}>Test store · Reviews from test purchases are labelled and do not count toward live customer ratings.</p>}
    <div className={styles.reviewLayout}><aside className={styles.ratingSummary}><strong>{data.count?Number(data.average).toFixed(1):"—"}</strong><Stars value={data.average||0}/><p>{data.count?`${data.count} ${data.mode==="test"?"test ":""}review${data.count===1?"":"s"}`:"No reviews yet"}</p><div className={styles.ratingBars}>{[5,4,3,2,1].map(star=><div key={star}><span>{star} <Star size={10} aria-hidden="true"/></span><div><i style={{width:`${data.count?(data.distribution[String(star)]||0)/data.count*100:0}%`}}/></div><small>{data.distribution[String(star)]||0}</small></div>)}</div><p className={styles.verifiedNote}><BadgeCheck size={15} aria-hidden="true"/>Only customers with a confirmed purchase can review this template.</p></aside>
    <div className={styles.reviewList}>
    {data.reviews.length?data.reviews.map(review=><article key={review.id} className={styles.reviewCard}><div className={styles.reviewMeta}><span className={styles.reviewerAvatar} aria-hidden="true">{[...review.author_name][0]?.toUpperCase()}</span><div><strong>{review.author_name}</strong><span><BadgeCheck size={12} aria-hidden="true"/>{review.payment_mode==="test"?"Test purchase":"Verified purchase"}</span></div><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</time></div><Stars value={review.rating}/><h3>{review.title}</h3><p>{review.body}</p></article>):<div className={styles.emptyReviews}><h3>Every experience starts a conversation.</h3><p>Purchased this template? Share what you liked and what could be better.</p>{!user&&<Link href={`/login?redirect=${encodeURIComponent(`/products/${slug}?review=1#reviews`)}`}>Sign in to check your purchases ↗</Link>}</div>}
    {data.count>10&&<div className={styles.pagination}><button type="button" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1} of {Math.ceil(data.count/10)}</span><button type="button" disabled={(page+1)*10>=data.count} onClick={()=>setPage(value=>value+1)}>Next</button></div>}</div></div></>}
  </section>;
}
export function Stars({value}: {value:number}) {return <span className={styles.stars} role="img" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(star=><Star key={star} size={14} fill={star<=Math.round(value)?"currentColor":"none"} aria-hidden="true"/>)}</span>;}
