"use client";
/* eslint-disable @next/next/no-img-element -- Gift photos use authenticated media URLs. */
import { useEffect, useRef, useState } from "react";
import type { ScratchRevealToolConfig, TemplateScratchReveal } from "@/lib/supabase/coupleTemplates";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { activityPalette } from "@/lib/template-activities";
import { surpriseMediaUrl } from "@/lib/template-surprises";
import { useTemplateTool } from "./useTemplateTool";
import styles from "./invitation.module.css";
import activity from "./activity.module.css";
import surprise from "./surprises.module.css";
type Props={templateCode:string;manageToken?:string|null;config:ScratchRevealToolConfig;palette?:Partial<InvitationPalette>};
type Data={scratch:TemplateScratchReveal|null;is_creator:boolean};
export function ScratchRevealTool({templateCode,manageToken,config,palette}:Props){
 const resource=useTemplateTool<Data>(templateCode,"scratch",manageToken),scratch=resource.data?.scratch,colors=activityPalette(palette);
 const canvas=useRef<HTMLCanvasElement>(null),surface=useRef<HTMLDivElement>(null),initialized=useRef(false),drawing=useRef(false),last=useRef<{x:number;y:number}|null>(null),checking=useRef<ReturnType<typeof setTimeout>|null>(null),opening=useRef(false);
 const [percent,setPercent]=useState(0),[preview,setPreview]=useState(false);
 const revealed=!!scratch?.opened_at||preview,content=scratch?.config;
 useEffect(()=>{
  const node=canvas.current,container=surface.current;if(!node||!container||revealed)return;
  initialized.current=false;
  const paint=()=>{const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;const copy=document.createElement("canvas");if(initialized.current){copy.width=node.width;copy.height=node.height;copy.getContext("2d")?.drawImage(node,0,0);}const dpr=Math.min(2,window.devicePixelRatio||1);node.width=Math.round(rect.width*dpr);node.height=Math.round(rect.height*dpr);const ctx=node.getContext("2d");if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);if(initialized.current){ctx.drawImage(copy,0,0,rect.width,rect.height);return;}const gradient=ctx.createLinearGradient(0,0,rect.width,rect.height);gradient.addColorStop(0,colors.accent);gradient.addColorStop(.5,colors.accent);gradient.addColorStop(1,colors.accent);ctx.fillStyle=gradient;ctx.fillRect(0,0,rect.width,rect.height);ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=1;for(let x=-rect.height;x<rect.width;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+rect.height,rect.height);ctx.stroke();}ctx.strokeRect(9,9,rect.width-18,rect.height-18);initialized.current=true;};
  paint();const observer=new ResizeObserver(paint);observer.observe(container);
  return()=>{observer.disconnect();if(checking.current)clearTimeout(checking.current);};
 },[revealed,resource.loading,colors.accent]);
 if(!config.enabled)return null;
 const uncover=async(method:"scratch"|"button"|"keyboard")=>{if(opening.current||revealed)return;opening.current=true;try{const result=await resource.write({method});if(result&&resource.data?.is_creator)setPreview(true);}finally{opening.current=false;}};
 const draw=(clientX:number,clientY:number)=>{
  const node=canvas.current,ctx=node?.getContext("2d");if(!node||!ctx||revealed)return;const rect=node.getBoundingClientRect(),point={x:clientX-rect.left,y:clientY-rect.top};ctx.save();ctx.globalCompositeOperation="destination-out";ctx.lineWidth=36;ctx.lineCap="round";ctx.beginPath();if(last.current){ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(point.x,point.y);ctx.stroke();}else{ctx.arc(point.x,point.y,18,0,Math.PI*2);ctx.fill();}ctx.restore();last.current=point;
  if(!checking.current)checking.current=setTimeout(()=>{checking.current=null;const pixels=ctx.getImageData(0,0,node.width,node.height).data;let clear=0,total=0;for(let index=3;index<pixels.length;index+=64){total++;if(pixels[index]<20)clear++;}const next=Math.round(clear/Math.max(1,total)*100);setPercent(next);if(next>=40)void uncover("scratch");},100);
 };
 return <section id="scratch_t07" aria-label="Scratch Card Surprise" className={`${styles.root} ${activity.root}`} style={invitationStyle(colors)}><div className={styles.heading}><p className={styles.eyebrow}>Scratch Card Surprise</p>{revealed&&<span className={styles.badge}>{preview?"Sender preview":"A little surprise, revealed"}</span>}</div>
 {resource.loading?<p className={styles.hint} role="status">Preparing your surprise…</p>:content?<><h2 className={styles.title}>{content.coverTitle}</h2>{resource.data?.is_creator&&<p className={styles.hint}>Sender preview does not mark the receiver’s surprise as opened.</p>}{revealed?<div className={surprise.revealed}>{content.hiddenMessage&&<blockquote className={surprise.revealMessage}>{content.hiddenMessage}</blockquote>}{content.contentType==="photo"&&surpriseMediaUrl(content.hiddenPhotoUrl,templateCode)&&<img className={surprise.media} src={surpriseMediaUrl(content.hiddenPhotoUrl,templateCode)} alt="A surprise memory"/>}{content.contentType==="invitation"&&scratch?.target_available&&<div className={styles.actions}><a className={styles.primary} href={`#${content.invitationRefId||"invitation_t02"}`}>{content.invitationRefId === "coupon_t08" ? "See your coupon" : "Open your invitation"}</a></div>}{scratch?.opened_at&&<p className={styles.hint}>Revealed <time dateTime={scratch.opened_at}>{new Date(scratch.opened_at).toLocaleString()}</time></p>}</div>:<><div ref={surface} className={surprise.scratch}><canvas ref={canvas} aria-label="Scratch the surface to reveal your surprise" onPointerDown={event=>{if(resource.busy)return;drawing.current=true;last.current=null;event.currentTarget.setPointerCapture(event.pointerId);draw(event.clientX,event.clientY);}} onPointerMove={event=>{if(drawing.current)draw(event.clientX,event.clientY);}} onPointerUp={()=>{drawing.current=false;last.current=null;}} onPointerCancel={()=>{drawing.current=false;last.current=null;}}/><div className={surprise.foilLabel} style={{opacity:Math.max(0,1-percent/35)}}><strong>Something just for you.</strong><span>{content.coverInstruction||"Scratch with your finger or mouse."}</span></div></div><p className={styles.hint} role="status">{resource.busy?"Opening your surprise…":`${percent}% uncovered`}</p><div className={styles.actions}><button type="button" className={styles.primary} disabled={resource.busy} onClick={event=>void uncover(event.detail===0?"keyboard":"button")}>Reveal surprise</button></div></>}</>:!resource.error&&<p className={styles.hint}>This surprise is not available.</p>}
 {resource.error&&<div className={styles.error} role="alert"><p>{resource.error}</p><button type="button" className={styles.secondary} disabled={resource.busy} onClick={()=>{resource.clearError();void resource.reload();}}>Refresh surprise</button></div>}
 </section>;
}
