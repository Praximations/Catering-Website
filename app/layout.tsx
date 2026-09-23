import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { connection } from "next/server";
import { business } from "@/lib/business";
import "./globals.css";

/**
 * One family, two cuts: Inter for reading, Inter Tight for headings. Simple
 * type is most of what makes an interface feel calm. Both are placeholders
 * until the brand is decided, and swapping them is a change to these two
 * imports, because the rest of the site refers to font-sans and font-display.
 */
const display = Inter_Tight({
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

export const viewport: Viewport = {
  themeColor: "#f5f5f1",
  // The dock and sheets sit against the screen edges on notched phones.
  viewportFit: "cover",
};

/**
 * The root: fonts and the page canvas, nothing else. The public site, the
 * sign in pages and the Owner Portal each bring their own layout, which is how
 * sign in gets to be free of the footer and the portal gets its own navigation.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // EVERY PAGE IS RENDERED PER REQUEST, because every page carries the CSP's
  // per-request nonce (proxy.ts). A page prerendered at build time has script
  // tags with no nonce, the policy refuses them, and the page never hydrates.
  // The 404 was the first casualty once this layout stopped reading cookies.
  await connection();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
