"use client";
import {useRef,useState} from "react";
import {Check,Loader2} from "lucide-react";
import {isPendingRequest,type CalendarEvent} from "@/lib/calendar";
import styles from "./calendar.module.css";

export default function PlanResponseActions({event,userId,onChanged}: {event:CalendarEvent;userId:string;onChanged:()=>void}){
  const lock=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  if(!isPendingRequest(event)||event.requested_by===userId)return null;
  const respond=async(operation:"accept"|"decline")=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try{const response=await fetch("/api/couple/calendar",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(20000),body:JSON.stringify({couple_id:event.couple_id,event_id:event.id,operation,version:event.version})});const data=await response.json();if(!response.ok){if(response.status===409)onChanged();throw Error(data.error||"Your response couldn’t be saved.");}window.dispatchEvent(new Event("qubitsells-notifications-updated"));onChanged();}catch(error){setError(error instanceof Error?error.message:"Please try again.");}finally{lock.current=false;setBusy(false);}
  };
  return <div className={styles.responseArea}><div className={styles.responseActions}><button type="button" className={styles.primary} disabled={busy} onClick={()=>void respond("accept")}>{busy?<Loader2 size={15} className={styles.spinner} aria-hidden="true"/>:<Check size={15} aria-hidden="true"/>}Confirm plan</button><button type="button" className={styles.declineButton} disabled={busy} onClick={()=>void respond("decline")}>Decline</button></div>{error&&<p className={styles.responseError} role="alert">{error}</p>}</div>;
}
