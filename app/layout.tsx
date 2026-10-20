import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ChairFill for Maple Family Dental", template: "%s · ChairFill" },
  description: "When a patient cancels, ChairFill texts the waitlist in order. The first yes gets the chair, and nobody has to work the phones.",
  applicationName: "ChairFill",
  openGraph: {
    title: "ChairFill: an empty chair fills itself",
    description: "When a patient cancels, ChairFill texts the waitlist in order. The first yes gets the chair.",
    siteName: "ChairFill",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
