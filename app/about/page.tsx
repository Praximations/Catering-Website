import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { business, isPlaceholderBusiness } from "@/lib/business";

export const metadata: Metadata = {
  title: "About",
  description: `About ${business.name}.`,
};

const steps = [
  {
    number: "01",
    title: "Tell us what matters",
    body: "Send the date, guest count, venue, and dietary needs. A direct online order is enough for standard lunch delivery.",
  },
  {
    number: "02",
    title: "We confirm the plan",
    body: "We check the diary, confirm the menu, and send one clear price. Nothing is charged before that conversation.",
  },
  {
    number: "03",
    title: "We cook and deliver",
    body: "Everything is prepared for your date, labeled clearly, and brought ready to serve or set up as agreed.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-18">
      <PageHeader eyebrow="How it works" title="Catering without the guesswork." lede={business.blurb} />

      <ol className="grid border-y border-line md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.number}
            className={`py-8 md:px-8 ${index > 0 ? "border-t border-line md:border-l md:border-t-0" : ""}`}
          >
            <span className="text-xs font-semibold text-highlight">{step.number}</span>
            <h2 className="mt-4 font-display text-2xl text-ink">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-16 grid gap-10 rounded-lg bg-raised p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">
            The practical details
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-tight text-ink">
            Simple, clear, and planned properly.
          </h2>
        </div>
        <dl className="divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-4 first:pt-0">
            <dt className="text-ink-muted">Notice we need</dt>
            <dd className="font-semibold text-ink">About {business.leadTimeDays} days</dd>
          </div>
          <div className="flex justify-between gap-6 py-4">
            <dt className="text-ink-muted">Event minimum</dt>
            <dd className="font-semibold text-ink">{business.minimumGuests} people</dd>
          </div>
          <div className="flex justify-between gap-6 py-4">
            <dt className="text-ink-muted">Sandwich minimum</dt>
            <dd className="font-semibold text-ink">50 sandwiches</dd>
          </div>
          <div className="flex justify-between gap-6 py-4">
            <dt className="text-ink-muted">Dietary needs</dt>
            <dd className="max-w-xs text-right font-semibold text-ink">Clearly labeled and planned with you</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12 flex flex-col gap-6 rounded-lg bg-accent px-7 py-9 text-on-accent sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div>
          <h2 className="font-display text-2xl">Have a date in mind?</h2>
          <p className="mt-2 text-sm text-on-accent/75">
            Choose the food, reserve your date, and we will confirm the details with you.
          </p>
        </div>
        <Link
          href="/shop"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-accent-strong shadow-sm transition-transform hover:-translate-y-0.5"
        >
          Start an order
        </Link>
      </section>

      {isPlaceholderBusiness ? (
        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-subtle">
          The business name and contact details are placeholders. Set the final details in
          lib/business.ts.
        </p>
      ) : null}
    </main>
  );
}
