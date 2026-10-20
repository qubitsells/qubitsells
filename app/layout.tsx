import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSiteUrl } from "@/lib/storefront";

const geistSans = localFont({
  src: "./fonts/Geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const playfair = localFont({
  src: "./fonts/PlayfairDisplay-latin.woff2",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
});

const cinzelDecorative = localFont({
  src: [
    { path: "./fonts/CinzelDecorative-700-latin.woff2", weight: "700" },
    { path: "./fonts/CinzelDecorative-900-latin.woff2", weight: "900" },
  ],
  variable: "--font-starlit",
  display: "swap",
});

const feelingLovely = localFont({
  src: "./fonts/Feeling Lovely.ttf",
  variable: "--font-feeling-lovely",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "QubitSells",
  metadataBase: new URL(getSiteUrl() || "https://qubitsells.com"),
  title: "QubitSells — Personalized digital gifts",
  description:
    "Personalized digital gifts, made to be shared. Explore illustrated web experiences with your words, photos, and optional interactions, plus a private Couple Space.",
  referrer: "strict-origin-when-cross-origin",
  keywords: [
    "personalized digital gifts",
    "digital gift templates",
    "interactive gift webpage",
    "Couple Space",
    "qubitsells",
  ],
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${cinzelDecorative.variable} ${feelingLovely.variable} h-full antialiased scroll-smooth`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white text-[#16232D] font-sans antialiased overflow-x-clip">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
