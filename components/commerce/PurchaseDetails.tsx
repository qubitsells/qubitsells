"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {durationLabel,type StoreOrder} from "@/lib/commerce";
import {useAuth} from "@/context/AuthContext";
import styles from "./commerce.module.css";
export default function PurchaseDetails({productSlug}: {productSlug:string}) {
  const {user}=useAuth();const [order,setOrder]=useState<StoreOrder|null>(null),[error,setError]=useState("");
  useEffect(()=>{if(!user)return;const id=new URLSearchParams(window.location.search).get("order");if(!id)return;const controller=new AbortController();fetch(`/api/account/orders?id=${encodeURIComponent(id)}`,{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);const found=data.orders.find((item:StoreOrder)=>item.id===id&&item.product_slug===productSlug);if(!found)throw Error("This order doesn’t match this template.");setOrder(found);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Order details couldn’t be loaded.");});return()=>controller.abort();},[user,productSlug]);
  const ready=order?.status==="paid"&&!order.fulfilled_at;
  return <section className={styles.purchasePanel}><h3>{ready?"Your purchased template":"Explore the template"}</h3>{ready?<p><strong>{durationLabel(order.duration_hours)}</strong> of link access, starting when you publish. This purchase creates one link.{order.payment_mode==="test"&&" This is a test purchase."}</p>:<><p>{order?.fulfilled_at?"This order has already been used. Open My orders to find your published link.":"Try the personalization options before you choose. A confirmed purchase is required to publish a sharing link. Choose your link duration on the product page."}</p><Link href={order?.fulfilled_at?"/profile?view=orders":`/products/${productSlug}`} className={`${styles.button} ${styles.primary}`}>{order?.fulfilled_at?"Open My orders":"View product & pricing"}<ArrowUpRight size={15} aria-hidden="true"/></Link></>}{error&&<p role="alert" className={styles.error}>{error}</p>}</section>;
}
