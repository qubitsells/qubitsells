import type {Metadata} from "next";
import CoupleShell from "@/components/couple/CoupleShell";
import SharedCapsules from "@/components/couple/SharedCapsules";
export const metadata:Metadata={title:"Shared capsules — Couple Space — QubitSells",description:"Keep shared letters, photos, and memories with your connected partner.",robots:{index:false,follow:false,noarchive:true}};
export default function Page(){return <CoupleShell><SharedCapsules/></CoupleShell>;}
