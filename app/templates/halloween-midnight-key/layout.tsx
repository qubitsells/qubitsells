import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "The Midnight Key \u2014 QubitSells", description: "Unlock a secret garden in a personalized Halloween adventure made to share by link.", alternates: url ? { canonical: `${url}/templates/halloween-midnight-key` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
