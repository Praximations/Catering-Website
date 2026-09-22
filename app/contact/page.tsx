import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, ContactIcon } from "@/components/icons";
import { buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${business.name} about catering and events.`,
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <section className="grid overflow-hidden rounded-[2rem] border border-line bg-raised/55 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between p-7 sm:p-12 lg:p-16">
          <div>
            <p className="eyebrow">Contact</p>
            <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.98] tracking-[-0.04em] text-ink sm:text-6xl">
              Let&apos;s put something good on the table.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-ink-muted">
              Tell us the date, the room, and who is coming. We will help shape the food around the occasion.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/shop" className={buttonClass}>Start an order <ArrowIcon className="size-4" /></Link>
            <Link href="/menu" className={secondaryButtonClass}>Browse the menu</Link>
          </div>
        </div>

        <div className="bg-surface p-7 sm:p-12 lg:p-16">
          <div className="grid size-12 place-items-center rounded-full bg-highlight-soft text-highlight">
            <ContactIcon className="size-5" />
          </div>
          <div className="mt-10 divide-y divide-line border-y border-line">
            <div className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Email</p>
              <a href={`mailto:${business.email}`} className="font-display text-2xl text-ink hover:text-accent">{business.email}</a>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Phone</p>
              <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className="font-display text-2xl text-ink hover:text-accent">{business.phone}</a>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Serving</p>
              <p className="text-base leading-7 text-ink-muted">{business.serviceArea}</p>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Planning</p>
              <p className="text-base leading-7 text-ink-muted">Allow about {business.leadTimeDays} days for event catering.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
