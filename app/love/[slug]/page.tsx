import { Suspense } from "react";
import type { Metadata } from "next";
import LoveRecipientPage from "./LoveRecipientPage";

export const metadata: Metadata = {
  title: "A Special Wish For You — QubitSells",
  description: "Someone made you a beautiful wish with QubitSells. Open it to experience a cinematic love message.",
};

export default function LovePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-rose-950">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-rose-300 border-t-transparent animate-spin mx-auto" />
            <p className="text-rose-200 text-sm font-medium">Opening your wish... ✨</p>
          </div>
        </div>
      }
    >
      <LoveRecipientPage />
    </Suspense>
  );
}
