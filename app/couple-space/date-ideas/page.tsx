import type {Metadata} from "next";
import CoupleShell from "@/components/couple/CoupleShell";
import DateIdeas from "@/components/couple/DateIdeas";
export const metadata:Metadata={title:"Vibe Generator — Couple Space — QubitSells",description:"Generate a date plan for your connected Couple Space and invite your partner to confirm it.",robots:{index:false,follow:false,noarchive:true}};
export default function Page(){return <CoupleShell title="Make an ordinary day yours." description="Pick a mood, make a little time, and turn an idea into a plan with your connected partner."><DateIdeas/></CoupleShell>;}
