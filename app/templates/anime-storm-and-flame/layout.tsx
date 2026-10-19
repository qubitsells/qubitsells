import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "Storm & Flame \u2014 QubitSells", description: "A personalized anime adventure about showing up for each other through the storm.", alternates: url ? { canonical: `${url}/templates/anime-storm-and-flame` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
