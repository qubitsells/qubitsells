"use client";
import {useEffect,useId,useRef,useState} from "react";
import {ArrowUpRight,WandSparkles,X} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import VibeGenerator from "@/components/vibe/VibeGenerator";
import styles from "@/components/vibe/vibe.module.css";

export default function FloatingVibeCheck(){
  const {user,isConnected,couple}=useAuth(),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),dialog=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{const trigger=()=>setOpen(true),hash=()=>{if(window.location.hash==="#vibe-check")trigger();};window.addEventListener("open-vibe-check",trigger);window.addEventListener("hashchange",hash);const frame=requestAnimationFrame(hash);return()=>{window.removeEventListener("open-vibe-check",trigger);window.removeEventListener("hashchange",hash);cancelAnimationFrame(frame);};},[]);
  useEffect(()=>{const element=dialog.current;if(!element)return;if(!open){if(element.open)element.close();return;}if(!element.open)element.showModal();const overflow=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=overflow;};},[open]);
  return <><button id="floating-vibe-check-btn" type="button" className={styles.floating} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(true)}><span className={styles.floatingIcon}><WandSparkles size={20} aria-hidden="true"/></span><span className={styles.floatingCopy}><strong>Vibe Generator</strong><small>{user&&isConnected&&couple?.partner_2_id?"Your next date starts here":"A little time, together"}</small></span><ArrowUpRight size={17} aria-hidden="true"/></button><dialog id={id} ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} onCancel={event=>{if(busy)event.preventDefault();}} onClose={()=>setOpen(false)} onClick={event=>{if(event.target!==event.currentTarget||busy)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setOpen(false);}}><header className={styles.dialogHeader}><div><p className={styles.eyebrow}>Couple Space · Made for two</p><h2 id={`${id}-title`}>Find your next good memory.</h2></div><button type="button" className={styles.close} disabled={busy} aria-label="Close Vibe Generator" onClick={()=>setOpen(false)}><X size={19} aria-hidden="true"/></button></header><VibeGenerator onBusyChange={setBusy}/></dialog></>;
}
