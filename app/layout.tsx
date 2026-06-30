import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Konstant Grotesk — the brand body face (single Book weight). Inter backs it
// for heavier weights and any glyphs Konstant doesn't include.
const konstant = localFont({
  src: [{ path: "./fonts/KonstantGrotesk-Book.otf", weight: "400", style: "normal" }],
  variable: "--font-konstant",
  display: "swap",
});

// Morganite — the brand display face (tall condensed). Used for headings and
// large stat numbers.
const morganite = localFont({
  src: [
    { path: "./fonts/Morganite-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Morganite-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Morganite-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carbinox Tracker",
  description: "Purchase orders, supplier shipment intake, and warehouse tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${konstant.variable} ${morganite.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
