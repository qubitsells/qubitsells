import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";
import FloatingHearts from "@/components/FloatingHearts";
import WishesMarketplace from "@/components/WishesMarketplace";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Send Love That Stays — QubitSells Wishes",
  description:
    "Browse 100+ beautiful romantic templates. Personalize with your names, photos & memories. Share a cinematic wish your partner will never forget.",
  keywords: [
    "romantic wishes",
    "birthday wish",
    "anniversary card",
    "love message",
    "couple templates",
    "valentine card",
    "qubitsells wishes",
  ],
};

export default function WishesPage() {
  return (
    <main className="relative min-h-screen bg-[#fff6f8] text-[#280816] overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Ambient Hearts */}
      <FloatingHearts />

      {/* Navbar */}
      <Navbar />

      {/* Main Marketplace */}
      <WishesMarketplace />

      {/* Footer */}
      <footer className="text-center text-xs text-rose-800/50 py-8 border-t border-rose-100 mt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
          <span className="font-medium">QubitSells Wishes — Send love that stays</span>
          <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
        </div>
        <p>© {new Date().getFullYear()} QubitSells. Every wish is crafted with love.</p>
      </footer>
    </main>
  );
}
