import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { business, isPlaceholderBusiness } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="mt-24 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto w-full max-w-[90rem] overflow-hidden rounded-[2rem] bg-accent text-on-accent sm:rounded-[2.75rem]">
        <div className="grid gap-12 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.25fr_0.65fr_0.9fr] lg:px-16">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3">
              <span aria-hidden className="grid size-10 place-items-center rounded-full border border-on-accent/30 font-display text-lg italic">
                {business.name.slice(0, 1)}
              </span>
              <span>
                <span className="block font-display text-xl leading-none">{business.name}</span>
                <span className="mt-1.5 block text-[0.58rem] font-bold uppercase tracking-[0.2em] text-on-accent/55">Catering and events</span>
              </span>
            </Link>
            <p className="mt-8 max-w-sm font-display text-3xl leading-[1.12] tracking-[-0.02em]">
              Good food for the days that matter.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-on-accent/65">{business.serviceArea}</p>
          </div>

          <nav aria-label="Footer" className="grid content-start gap-3 text-sm text-on-accent/70">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.17em] text-on-accent/45">Explore</p>
            <Link href="/menu" className="transition-colors hover:text-on-accent">Menu</Link>
            <Link href="/shop" className="transition-colors hover:text-on-accent">Order online</Link>
            <Link href="/about" className="transition-colors hover:text-on-accent">Our approach</Link>
            <Link href="/contact" className="transition-colors hover:text-on-accent">Contact</Link>
          </nav>

          <div className="lg:justify-self-end lg:text-right">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.17em] text-on-accent/45">Start a conversation</p>
            <p className="mt-4">
              <a href={`mailto:${business.email}`} className="font-display text-2xl transition-opacity hover:opacity-70">
                {business.email}
              </a>
            </p>
            <p className="mt-2 text-sm text-on-accent/70">
              <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-on-accent">
                {business.phone}
              </a>
            </p>
            <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-full bg-surface px-5 text-sm font-bold text-accent transition-transform hover:-translate-y-0.5">
              Get in touch <ArrowIcon className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mx-6 flex flex-col gap-3 border-t border-on-accent/15 py-6 text-xs text-on-accent/45 sm:mx-10 sm:flex-row sm:items-center sm:justify-between lg:mx-16">
          <p>Made for good gatherings.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-on-accent">Account</Link>
            <Link href="/shop" className="hover:text-on-accent">Ordering</Link>
          </div>
        </div>

        {isPlaceholderBusiness ? (
          <p className="border-t border-on-accent/15 px-6 py-4 text-xs text-on-accent/45 sm:px-10 lg:px-16">
            The business name and contact details are placeholders. Set the real ones in lib/business.ts.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
