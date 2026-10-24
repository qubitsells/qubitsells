"use client";
import { ArrowRight, Music2 } from "lucide-react";
import type { CSSProperties, MouseEventHandler } from "react";
import styles from "./story-start.module.css";
export default function StoryStartButton({onClick,hasMusic,accent,onAccent}:{onClick:MouseEventHandler<HTMLButtonElement>;hasMusic:boolean;accent:string;onAccent:string}){
 return <div className={styles.start} style={{"--story-start-accent":accent,"--story-start-ink":onAccent} as CSSProperties}><button type="button" data-story-start className={styles.button} onClick={onClick}>{hasMusic&&<Music2 size={18} aria-hidden="true"/>}<span>{hasMusic?"Continue with music":"Begin your story"}</span><ArrowRight size={18} aria-hidden="true"/></button><p>{hasMusic?"Press play on a moment made for you.":"A little story, waiting for you."}</p></div>;
}
