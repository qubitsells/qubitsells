import type { Metadata } from "next";
import CoupleProfile from "@/components/account/CoupleProfile";

export const metadata: Metadata = {
  title: "Couple profile — QubitSells",
  description: "Your optional couple profile, partner connection, anniversary, and shared settings.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function CoupleProfilePage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  return <CoupleProfile inviteCode={typeof code === "string" ? code.slice(0, 100) : ""} />;
}
