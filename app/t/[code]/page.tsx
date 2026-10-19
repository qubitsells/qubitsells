import { Suspense } from "react";
import type { Metadata } from "next";
import AnimeTemplatePage from "./AnimeTemplatePage";

export const metadata: Metadata = {
  title: "A Message From the Heart — QubitSells",
  description: "Someone made you a beautiful anime-themed love template. Open it to see their message and memories.",
};

export default function TemplatePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}
        >
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full border-4 border-pink-400 border-t-transparent animate-spin" />
            <p className="text-pink-200 text-sm font-medium tracking-wide">
              Opening your message... 🌸
            </p>
          </div>
        </div>
      }
    >
      <AnimeTemplatePage />
    </Suspense>
  );
}
