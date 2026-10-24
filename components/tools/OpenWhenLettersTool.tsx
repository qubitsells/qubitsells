"use client";
/* eslint-disable @next/next/no-img-element -- Gift media uses authenticated proxy URLs. */
import { useState } from "react";
import { ChevronDown, Mail, MailOpen } from "lucide-react";
import type { OpenWhenToolConfig, TemplateOpenWhenLetters } from "@/lib/supabase/coupleTemplates";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import { activityPalette } from "@/lib/template-activities";
import { openGiftReply, surpriseMediaUrl } from "@/lib/template-surprises";
import { useTemplateTool } from "./useTemplateTool";
import styles from "./invitation.module.css";
import activity from "./activity.module.css";
import surprise from "./surprises.module.css";
type Props={templateCode:string;manageToken?:string|null;partnerName?:string;senderName?:string;config:OpenWhenToolConfig;palette?:Partial<InvitationPalette>};
type Data={letters:TemplateOpenWhenLetters|null;is_creator:boolean};
export function OpenWhenLettersTool({templateCode,manageToken,senderName="The sender",config,palette}:Props){
 const resource=useTemplateTool<Data>(templateCode,"open-when",manageToken,true),letters=resource.data?.letters,creator=!!resource.data?.is_creator;
 const [active,setActive]=useState<string|null>(null);
 if(!config.enabled)return null;
 const open=async(id:string)=>{if(active===id){setActive(null);return;}if(creator||letters?.opened_envelopes[id]){setActive(id);return;}const result=await resource.write({envelope_id:id});if(result)setActive(id);};
 return <section id="open_when_t09" aria-label="Open When Letter" className={`${styles.root} ${activity.root}`} style={invitationStyle(activityPalette(palette))}><p className={styles.eyebrow}>Open When Letter</p>
 {resource.loading?<p className={styles.hint} role="status">Gathering your letters…</p>:letters?<><h2 className={styles.title}>{letters.title}</h2><p className={activity.intro}>{letters.description||`A few words from ${senderName}, for the moments you need them.`}</p>{creator&&<p className={styles.hint}>Sender preview. Reading here does not mark a letter as opened by the receiver.</p>}{letters.envelopes.map(envelope=>{
  const opened=letters.opened_envelopes[envelope.id]?.opened_at,expanded=active===envelope.id,media=surpriseMediaUrl(envelope.mediaUrl,templateCode);
  return <article className={surprise.letter} key={envelope.id}><button type="button" className={surprise.letterToggle} disabled={resource.busy} aria-expanded={expanded} aria-controls={`letter-${envelope.id}`} onClick={()=>void open(envelope.id)}>{opened?<MailOpen size={21} aria-hidden="true"/>:<Mail size={21} aria-hidden="true"/>}<span>{envelope.occasion}<small>{creator?"Preview letter":opened?`Opened ${new Date(opened).toLocaleString()}`:"Sealed · open when you choose"}</small></span><ChevronDown size={16} aria-hidden="true"/></button>{expanded&&(creator||opened)&&<div className={surprise.letterContent} id={`letter-${envelope.id}`}><blockquote>{envelope.message}</blockquote>{media&&(envelope.mediaType==="video"?<video className={surprise.media} src={media} controls preload="metadata" playsInline/>:<img className={surprise.media} src={media} alt={`A memory from ${senderName}`} loading="lazy"/>)}{letters.attach_reply&&!creator&&<div className={styles.actions}><button type="button" className={styles.secondary} onClick={openGiftReply}>Reply to {senderName}</button></div>}</div>}</article>;
 })}</>:!resource.error&&<p className={styles.hint}>These letters are not available.</p>}
 {resource.error&&<div className={styles.error} role="alert"><p>{resource.error}</p><button type="button" className={styles.secondary} disabled={resource.busy} onClick={()=>{resource.clearError();void resource.reload();}}>Refresh letters</button></div>}
 </section>;
}
