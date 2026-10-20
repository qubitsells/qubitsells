"use client";
import {useEffect,useId,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,ChevronRight,UserRound,X} from "lucide-react";
import Brand from "./Brand";
import {STORE_LINKS} from "./navigation";
import styles from "./mobile-navigation.module.css";

type Props={pathname:string;signedIn:boolean;onOpen?:()=>void};
export default function MobileNavigation({pathname,signedIn,onOpen}:Props){
  const [open,setOpen]=useState(false),dialog=useRef<HTMLDialogElement>(null),toggle=useRef<HTMLButtonElement>(null),id=useId(),heading=useId();
  useEffect(()=>{
    if(!open)return;const element=dialog.current;if(!element)return;
    element.showModal();const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    const desktop=window.matchMedia("(min-width: 1251px)");const resize=()=>{if(desktop.matches)setOpen(false);};desktop.addEventListener("change",resize);
    return()=>{desktop.removeEventListener("change",resize);element.close();document.body.style.overflow=overflow;};
  },[open]);
  return <><button ref={toggle} type="button" className={styles.toggle} aria-label="Open navigation menu" aria-expanded={open} aria-haspopup="dialog" aria-controls={id} onClick={()=>{onOpen?.();setOpen(true);}}><span className={styles.hamburger} aria-hidden="true"><i/><i/></span><span>Menu</span></button>
    <dialog ref={dialog} id={id} aria-labelledby={heading} className={styles.drawer} onClose={()=>{if(!dialog.current?.open)setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right)setOpen(false);}}}>
      <div className={styles.top}><Brand compact/><button type="button" className={styles.close} aria-label="Close navigation menu" onClick={()=>setOpen(false)}><X size={20} aria-hidden="true"/></button></div>
      <div className={styles.intro}><p>Make it personal</p><h2 id={heading}>Where to next?</h2></div>
      <MobileMenuContent pathname={pathname} signedIn={signedIn} onNavigate={()=>setOpen(false)}/>
    </dialog></>;
}
export function MobileMenuContent({pathname,signedIn,onNavigate}:Props&{onNavigate:()=>void}){
  return <><nav aria-label="Mobile navigation" className={styles.links}>{STORE_LINKS.map(({label,href,description,Icon})=>{const current=!href.includes("#")&&(pathname===href||pathname.startsWith(`${href}/`));return <Link key={href} href={href} onClick={onNavigate} aria-current={current?"page":undefined}><span className={styles.linkIcon}><Icon size={20} aria-hidden="true"/></span><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={17} aria-hidden="true"/></Link>;})}</nav>
    {!signedIn&&<div className={styles.guest}><UserRound size={20} aria-hidden="true"/><p>Your ideas deserve a home.<span>Sign in to keep your purchases and creations together.</span></p><Link href="/login" onClick={onNavigate}>Sign in <ArrowUpRight size={15} aria-hidden="true"/></Link></div>}
    <div className={styles.bottom}><Link href="/templates" className={styles.browse} onClick={onNavigate}>Find your next template <ArrowRight size={18} aria-hidden="true"/></Link><Link className={styles.help} href="/contact" onClick={onNavigate}>A little help? Get in touch <ArrowUpRight size={12} aria-hidden="true"/></Link></div>
  </>;
}
