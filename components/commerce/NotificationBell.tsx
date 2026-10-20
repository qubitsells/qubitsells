"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Bell} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {useAuth} from "@/context/AuthContext";
import styles from "./commerce.module.css";
export default function NotificationBell(){const {user}=useAuth();return user?<UserBell key={user.id} userId={user.id}/>:null;}
function UserBell({userId}: {userId:string}){const [unread,setUnread]=useState(0);useEffect(()=>{const controller=new AbortController();let active=true;
  const load=()=>{if(document.visibilityState==="hidden")return;void fetch("/api/account/notifications",{cache:"no-store",signal:controller.signal}).then(async response=>{if(response.ok){const data=await response.json();if(active)setUnread(data.unread||0);}}).catch(()=>{});};
  const client=createClient(),channel=client.channel(`notifications-${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"store_notifications",filter:`user_id=eq.${userId}`},load).subscribe();
  load();const timer=setInterval(load,30000);window.addEventListener("focus",load);window.addEventListener("qubitsells-notifications-updated",load);document.addEventListener("visibilitychange",load);return()=>{void client.removeChannel(channel);active=false;controller.abort();clearInterval(timer);window.removeEventListener("focus",load);window.removeEventListener("qubitsells-notifications-updated",load);document.removeEventListener("visibilitychange",load);};},[userId]);
  return <Link href="/profile?view=notifications" className={styles.bell} aria-label={`Notifications${unread?`, ${unread} unread`:""}`}><Bell size={17} aria-hidden="true"/>{unread>0&&<span aria-hidden="true">{unread>99?"99+":unread}</span>}</Link>;}
