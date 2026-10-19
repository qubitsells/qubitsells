import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "Our Little Pink Day \u2014 QubitSells", description: "Personalize an illustrated romantic day with your words, photos, and optional interactions.", alternates: url ? { canonical: `${url}/templates/our-little-pink-day` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
