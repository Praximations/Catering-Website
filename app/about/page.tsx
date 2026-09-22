import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/faq";
import { FactList, PageHeader, buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";
import {
  leadTimeDays,
  minimumEventGuests,
  sandwichMinimum,
  serviceArea,
  smallestOnlineOrder,
} from "@/lib/facts";
import { isPaymentConfigured } from "@/lib/payments";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ordering and event catering work with ${business.name}.`,
};

/**
 * Two ways to book, laid side by side, because they genuinely differ: an
 * online order is priced and placed in one go, an event is quoted first. A
 * single list of steps blurred the two and left people unsure which applied.
 *
 * Every step describes what the site and the business actually do. The
 * payment step changes with whether a payment provider is configured, rather
 * than promising online payment on a site that cannot take it.
 */
const paths = [
  {
    title: "Ordering online",
    lede: "For office lunches, meetings, and anything on the online menu.",
    steps: [
      "Choose your food and quantities. Each item shows its minimum and how much to allow per guest.",
      "Add the date, the address, the head count, and any allergies at checkout.",
      "We check the date and confirm the order with you. Nothing is charged before this.",
      isPaymentConfigured
        ? "Pay securely online from your confirmation page, or settle it with us directly."
        : "We arrange payment with you directly.",
      "We deliver on the day, labelled and ready to serve.",
    ],
    action: { href: "/shop", label: "Order online" },
  },
  {
    title: "Catering an event",
    lede: "For buffets, dinners, receptions, and anything made to measure.",
    steps: [
      "Tell us the date, the number of guests, where it is, and what they cannot eat.",
      "We suggest a menu from our event menus and send you one clear price.",
      "Once you are happy with it, we book your date.",
      "We cook for the day and deliver, with staff to serve and clear if you want them.",
    ],
    action: { href: "/contact?subject=Event%20catering%20quote", label: "Ask for a quote" },
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <PageHeader
        title="How it works"
        lede="There are two ways to book with us: order a lunch online in a few minutes, or ask us to quote for an event."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {paths.map((path) => (
          <section key={path.title} aria-labelledby={`${path.title}-title`} className="flex flex-col rounded-md border border-line p-6 sm:p-8">
            <h2 id={`${path.title}-title`} className="font-display text-3xl text-ink">
              {path.title}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{path.lede}</p>
            <ol className="mt-6 flex-1 space-y-4">
              {path.steps.map((step, index) => (
                <li key={step} className="flex gap-4 text-sm leading-6 text-ink">
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent-strong"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link href={path.action.href} className={`${buttonClass} mt-8 self-start`}>
              {path.action.label}
            </Link>
          </section>
        ))}
      </div>

      <section aria-labelledby="details-title" className="mt-16">
        <h2 id="details-title" className="font-display text-3xl text-ink">
          The practical details
        </h2>
        <FactList
          className="mt-6"
          facts={[
            { label: "Online orders from", value: `${smallestOnlineOrder} people` },
            { label: "Sandwich platters from", value: `${sandwichMinimum} sandwiches` },
            { label: "Events from", value: `${minimumEventGuests} guests` },
            { label: "Notice for events", value: `About ${leadTimeDays} days` },
          ]}
        />
        <p className="mt-6 text-sm text-ink-muted">Delivering to {serviceArea}.</p>
      </section>

      <section aria-labelledby="faq-title" className="mt-16">
        <h2 id="faq-title" className="font-display text-3xl text-ink">
          Questions people ask
        </h2>
        <div className="mt-6">
          <Faq />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className={secondaryButtonClass}>
            Ask us something else
          </Link>
        </div>
      </section>

    </main>
  );
}
