import type {Metadata} from "next";
import CoupleShell from "@/components/couple/CoupleShell";
import CoupleOverview from "@/components/couple/CoupleOverview";
import FloatingVibeCheck from "@/components/FloatingVibeCheck";
export const metadata:Metadata={title:"Couple Space — QubitSells",description:"Your dedicated space for your couple profile, shared calendar, time capsules, and date ideas.",robots:{index:false,follow:false,noarchive:true}};
export default function CoupleSpace(){return <CoupleShell><CoupleOverview/><FloatingVibeCheck/></CoupleShell>;}
