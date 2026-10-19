import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/storefront";
const url = getSiteUrl();
export const metadata: Metadata = { title: "Pumpkin Moon Date \u2014 QubitSells", description: "A personalized moonlit Halloween story with pumpkins, lanterns, and your own message.", alternates: url ? { canonical: `${url}/templates/halloween-pumpkin-moon` } : undefined };
export default function TemplateLayout({ children }: { children: React.ReactNode }) { return children; }
