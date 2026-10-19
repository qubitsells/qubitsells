"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import styles from "./storefront.module.css";

const examples = ["Leave a reply", "Scratch to reveal", "Choose an option", "Accept an invitation"];

function ScratchExample() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.fillStyle = "#E3EBEF"; context.fillRect(0, 0, 600, 180);
    context.fillStyle = "#4F6270"; context.font = "18px sans-serif"; context.textAlign = "center";
    context.fillText("A little something is hiding here…", 300, 96);
  }, []);
  return <div className={styles.scratchExample}>
    <p className={styles.demoOverline}>A small surprise, just for you</p>
    <h3>Some things are worth uncovering.</h3>
    <div className={styles.scratchArea}><p>Coffee is on me.<br /><span>Let’s make an afternoon of it.</span></p>{!revealed && <canvas ref={canvas} width={600} height={180} aria-hidden="true" onPointerDown={event => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} onPointerMove={event => {
      if (!drawing.current) return;
      const box = event.currentTarget.getBoundingClientRect();
      const context = event.currentTarget.getContext("2d");
      if (!context) return;
      context.globalCompositeOperation = "destination-out"; context.beginPath();
      context.arc((event.clientX - box.left) * 600 / box.width, (event.clientY - box.top) * 180 / box.height, 30, 0, Math.PI * 2); context.fill();
    }} />}</div>
    <button className={styles.textButton} onClick={() => setRevealed(true)} disabled={revealed}>{revealed ? "Surprise revealed" : "Reveal surprise"} <ArrowRight size={16} /></button>
    <p className={styles.demoHint}>Scratch with your finger or mouse, or use the reveal button.</p>
  </div>;
}

export default function ExperienceDemo() {
  const [active, setActive] = useState(0);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);
  const [choice, setChoice] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [revision, setRevision] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const reset = () => { setReply(""); setSent(false); setChoice(""); setAccepted(false); setRevision(value => value + 1); };
  return <section className={`${styles.container} ${styles.demoSection}`}>
    <div className={styles.demoCopy}><p className={styles.eyebrow}>More than a message</p><h2>Give them something<br />to respond to.</h2><p>A note they can answer. A surprise they can uncover. A little invitation to make a new memory.</p><p>Add optional interactions in the template editor, and make the experience a conversation.</p><Link href="/templates" className={styles.textButton}>Find your starting point <ArrowRight size={17} /></Link></div>
    <div className={styles.demoShell}>
      <div className={styles.demoTabs} role="tablist" aria-label="Interactive gift examples" onKeyDown={event => {
        let next = active;
        if (event.key === "ArrowRight") next = (active + 1) % examples.length;
        else if (event.key === "ArrowLeft") next = (active + examples.length - 1) % examples.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = examples.length - 1;
        else return;
        event.preventDefault(); setActive(next); tabs.current[next]?.focus();
      }}>{examples.map((example, index) => <button key={example} ref={element => { tabs.current[index] = element; }} role="tab" id={`demo-tab-${index}`} aria-controls="demo-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)}>{example}</button>)}</div>
      <div className={styles.demoCanvas} id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${active}`} tabIndex={0}>
        <div className={styles.demoMeta}><span>Example</span><button className={styles.textButton} onClick={reset} aria-label="Reset example"><RotateCcw size={13} /> Reset</button></div>
        {active === 0 && <form onSubmit={event => { event.preventDefault(); setSent(true); }} className={styles.replyExample}><p className={styles.demoOverline}>A note for Alex</p><h3>“This made my whole day.”</h3><p>The best part of a gift? Hearing how it made them feel.</p><label htmlFor="example-reply">Your example reply</label><textarea id="example-reply" maxLength={500} rows={2} required value={reply} placeholder="You remembered our favorite little café…" onChange={event => { setReply(event.target.value); setSent(false); }} /><div className={styles.demoSubmit}><span>Only in this example</span><button className={`${styles.button} ${styles.primary}`} type="submit">{sent ? <><Check size={16} /> Reply added</> : <>Try a reply <ArrowRight size={16} /></>}</button></div>{sent && <p role="status" className={styles.demoStatus}>Your example reply: “{reply}”</p>}</form>}
        {active === 1 && <ScratchExample key={revision} />}
        {active === 2 && <div className={styles.choiceExample}><p className={styles.demoOverline}>The next chapter is up to you</p><h3>What should we do this weekend?</h3><div className={styles.exampleOptions}>{["A slow morning & coffee", "A picnic with no plans", "A movie & our favorite snacks"].map(option => <button key={option} aria-pressed={choice === option} onClick={() => setChoice(option)}><span>{option}</span>{choice === option ? <Check size={17} /> : <span className={styles.optionCircle} />}</button>)}</div>{choice && <p role="status" className={styles.demoStatus}>Example choice: {choice}</p>}</div>}
        {active === 3 && <div className={styles.invitationExample}><p className={styles.demoOverline}>You’re invited</p><h3>A little time, just for us.</h3><p>A moonlit picnic<br />Saturday evening · 7:00 pm</p><button className={`${styles.button} ${styles.primary}`} onClick={() => setAccepted(true)}>{accepted ? <><Check size={17} /> Invitation accepted</> : <>I’ll be there <ArrowRight size={17} /></>}</button>{accepted && <p role="status" className={styles.demoStatus}>Accepted in this example. No real plan was created.</p>}</div>}
      </div>
      <p className={styles.demoDisclaimer}>Try it here. Nothing is sent, saved to an account, or redeemed.</p>
    </div>
  </section>;
}
