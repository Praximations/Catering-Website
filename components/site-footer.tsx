import Link from "next/link";
import { business, isPlaceholderBusiness } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-raised/60">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-18">
        <div className="grid gap-12 text-sm sm:grid-cols-[1.35fr_0.7fr_0.95fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="grid size-9 place-items-center rounded-full border border-accent/25 font-display italic text-accent">
                {business.name.slice(0, 1)}
              </span>
              <p className="font-display text-xl text-ink">{business.name}</p>
            </div>
            <p className="mt-5 max-w-sm font-display text-2xl leading-tight text-ink">{business.tagline}.</p>
            <p className="mt-1 leading-6 text-ink-subtle">{business.serviceArea}</p>
          </div>

          <nav aria-label="Footer" className="grid content-start gap-3 text-ink-muted sm:justify-self-center">
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-highlight">Explore</p>
            <Link href="/menu" className="transition-colors hover:text-accent-strong">Menu</Link>
            <Link href="/shop" className="transition-colors hover:text-accent-strong">Order online</Link>
            <Link href="/about" className="transition-colors hover:text-accent-strong">How it works</Link>
          </nav>

          <div className="text-ink-muted sm:justify-self-end sm:text-right">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-highlight">
              Start a conversation
            </p>
            <p>
              <a href={`mailto:${business.email}`} className="mt-3 inline-flex font-medium transition-colors hover:text-accent-strong">
                {business.email}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                className="font-medium transition-colors hover:text-accent-strong"
              >
                {business.phone}
              </a>
            </p>
          </div>
        </div>

        {/* Honesty over polish: while the contact details are still the
            shipped placeholders, say so rather than let someone email a
            fake address. Editing lib/business.ts removes this. */}
        {isPlaceholderBusiness ? (
          <p className="mt-12 border-t border-line pt-6 text-xs text-ink-subtle">
            The name and contact details above are placeholders. Set the real ones in
            lib/business.ts.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
