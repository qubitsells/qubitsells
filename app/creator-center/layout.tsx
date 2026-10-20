import type { Metadata } from "next";
export const metadata: Metadata = { title: "My creations — QubitSells", description: "Manage your personalized gifts, share their links, and catch up on replies and activity.", robots: { index: false, follow: false, noarchive: true } };
export default function PrivateLayout({ children }: { children: React.ReactNode }) { return children; }
