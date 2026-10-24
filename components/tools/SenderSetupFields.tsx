"use client";
import { useId } from "react";
import { invitationStyle, type InvitationPalette } from "@/lib/invitation";
import styles from "./invitation.module.css";

export function SenderAnswerField({kind,value,onChange,palette}:{kind:"question"|"secret";value:string;onChange:(value:string)=>void;palette:InvitationPalette}){
 return <div className={`${styles.root} ${styles.editor}`} style={invitationStyle(palette)} data-sender-setup={kind}><label className={styles.field}>{kind==="secret"?"Your private answer":"Your answer"}<textarea required rows={3} maxLength={kind==="secret"?2000:1000} value={value} onChange={event=>onChange(event.target.value)} placeholder={kind==="secret"?"Write the answer they’ll discover after adding their own…":"Share your side of this question…"}/></label><p className={styles.hint}>{kind==="secret"?"Locked when you publish. It stays private until the receiver locks their answer and opens the reveal.":"Saved when you publish and shared after they submit their answer."}</p></div>;
}
export function SenderPollChoices({options,value,onChange,palette}:{options:string[];value:string[];onChange:(value:string[])=>void;palette:InvitationPalette}){
 const group=useId();return <fieldset className={`${styles.root} ${styles.editor} ${styles.fieldset}`} style={invitationStyle(palette)} data-sender-setup="poll"><legend className={styles.field}>Your choice</legend><p className={styles.hint}>Choose now. Your partner will add their choice when they open the gift.</p><div className={styles.options}>{options.map((option,index)=>{const id=`opt_${index+1}`;return <label className={styles.option} key={id}><input type="radio" required name={group} checked={value.includes(id)} onChange={()=>onChange([id])}/><span>{option||`Option ${index+1}`}</span></label>;})}</div></fieldset>;
}
