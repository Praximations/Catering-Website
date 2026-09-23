import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { NotFoundContent } from "@/components/not-found-content";
import { business } from "@/lib/business";

// No `robots` here on purpose: Next already sends noindex on a 404.
export const metadata: Metadata = {
  title: "Page not found",
};

/** A URL that matches no route at all. The site's own 404 is in app/(site). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-4 sm:px-8 sm:py-6">
        <Logo name={business.name} />
      </header>
      <main id="main" className="flex flex-1">
        <NotFoundContent />
      </main>
    </div>
  );
}
