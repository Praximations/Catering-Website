import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AnnouncementBanner } from "@/components/announcement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { business } from "@/lib/business";
import "./globals.css";

/**
 * Two faces, both placeholders until the brand is decided: a warm serif
 * for display, a plain grotesque for everything else. Swapping them is a
 * change to these two imports and nothing else, because the rest of the
 * site refers to font-display and font-sans, never to a font by name.
 */
const display = Fraunces({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${business.name}, ${business.tagline}`,
    template: `%s, ${business.name}`,
  },
  description: business.blurb,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AnnouncementBanner />
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
