import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "The Haunted Waltz \u2014 QubitSells", description: "Personalize a candlelit, haunted ballroom story and share it as a web experience.", alternates: url ? { canonical: `${url}/templates/spooky-the-haunted-waltz` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
