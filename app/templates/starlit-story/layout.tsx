import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "Starlit Story \u2014 QubitSells", description: "An illustrated letter beneath the stars, personalized for someone close to you.", alternates: url ? { canonical: `${url}/templates/starlit-story` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
