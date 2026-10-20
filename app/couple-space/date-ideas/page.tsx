import type {Metadata} from "next";
import CoupleShell from "@/components/couple/CoupleShell";
import DateIdeas from "@/components/couple/DateIdeas";
export const metadata:Metadata={title:"Date ideas — Couple Space — QubitSells",description:"Find a little inspiration for your next date, then make a plan together.",robots:{index:false,follow:false,noarchive:true}};
export default function Page(){return <CoupleShell title="Make an ordinary day yours." description="A few ideas for time well spent together. Pick a mood and make it your own."><DateIdeas/></CoupleShell>;}
