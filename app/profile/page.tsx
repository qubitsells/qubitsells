import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PersonalProfile from "@/components/account/PersonalProfile";

export const metadata: Metadata = {
  title: "My profile — QubitSells",
  description: "Your QubitSells account, personal details, optional work information, and creations.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ code?: string | string[];view?:string;review?:string;mode?:string }> }) {
  const { code,view,review,mode } = await searchParams;
  // Keep older invitation links working without mixing pairing into the account.
  if (typeof code === "string" && code.trim()) redirect(`/couple-space/profile?code=${encodeURIComponent(code.trim())}`);
  return <PersonalProfile view={view==="orders"||view==="wishlist"||view==="notifications"||view==="reviews"?view:"profile"} reviewSlug={typeof review==="string"?review:undefined} reviewMode={typeof mode==="string"?mode:undefined}/>;
}
