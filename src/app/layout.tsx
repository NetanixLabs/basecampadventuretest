import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Manrope, Newsreader } from "next/font/google";
import { themeScript } from "@/components/theme-toggle";
import { site } from "@/lib/site";
import "./globals.css";

/**
 * The prototype's type: Manrope for headlines, DM Sans for reading, and a
 * serif italic (Newsreader) for the one word that gives a headline its voice.
 * JetBrains Mono is kept for small figures that line up.
 */
const display = Manrope({ variable: "--font-display-face", subsets: ["latin"], display: "swap" });
const serif = Newsreader({ variable: "--font-serif-face", subsets: ["latin"], style: ["italic"], weight: ["400"], display: "swap", preload: false });
const sans = DM_Sans({ variable: "--font-sans-face", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], display: "swap", weight: ["400", "500"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Trekking & Tours in Nepal since 2009`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
  openGraph: { siteName: site.name, locale: "en_US", type: "website" },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#007f91",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable} ${mono.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body id="top" className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
