import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, buttonClass } from "@/components/ui";
import { business, isPlaceholderBusiness } from "@/lib/business";

export const metadata: Metadata = {
  title: "About",
  description: `About ${business.name}.`,
};

/**
 * About. Short on purpose: nobody has decided whose kitchen this is, so
 * this page carries the few things the site does know (how we work, what
 * we need to know, how to reach us) and says plainly that the story is
 * still to be written rather than inventing one.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <PageHeader eyebrow="About" title={`About ${business.name}`} lede={business.blurb} />

      <div className="space-y-10">
        <section>
          <h2 className="font-display text-xl text-ink">How it works</h2>
          <ol className="mt-4 space-y-4 text-ink-muted">
            <li className="flex gap-4">
              <span className="font-display text-lg text-accent-strong">1</span>
              <p>
                You send the date, a rough head count, and anything we should know. That is the
                quote form, and it takes a minute.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-display text-lg text-accent-strong">2</span>
              <p>
                We reply with a menu and a price, usually within a day or two. If we are already
                booked that day we will say so straight away.
              </p>
            </li>
            <li className="flex gap-4">
              <span className="font-display text-lg text-accent-strong">3</span>
              <p>
                We adjust until it is right, then we cook it. You can check where your enquiry
                stands any time from your account.
              </p>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">The practical bits</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-muted">Notice we need</dt>
              <dd className="text-ink">About {business.leadTimeDays} days</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-muted">Smallest booking</dt>
              <dd className="text-ink">{business.minimumGuests} people</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-muted">Where we cook</dt>
              <dd className="text-ink">{business.serviceArea}</dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-muted">Dietary needs</dt>
              <dd className="text-ink">Tell us on the form, we cook around them</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink">Get in touch</h2>
          <p className="mt-3 text-ink-muted">
            The quote form is the fastest way to reach us, but you are welcome to email{" "}
            <a href={`mailto:${business.email}`} className="text-accent-strong hover:underline">
              {business.email}
            </a>{" "}
            or call{" "}
            <a
              href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
              className="text-accent-strong hover:underline"
            >
              {business.phone}
            </a>
            .
          </p>
          <Link href="/quote" className={`${buttonClass} mt-6`}>
            Request a quote
          </Link>
        </section>
      </div>

      {isPlaceholderBusiness ? (
        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-subtle">
          Whose kitchen this is has not been decided yet, so this page describes how the site
          works rather than inventing a history. The details live in lib/business.ts.
        </p>
      ) : null}
    </main>
  );
}
