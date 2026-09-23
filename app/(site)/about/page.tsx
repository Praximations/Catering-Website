import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/faq";
import {
  ArrowRightIcon,
  BagIcon,
  BookIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  SparklesIcon,
  UsersIcon,
  type Icon,
} from "@/components/icons";
import { button, cardClass, Container, cx, FactChips, IconTile, nudgeClass, PageHeader, reveal } from "@/components/ui";
import { business } from "@/lib/business";
import { leadTimeDays, minimumEventGuests, sandwichMinimum, serviceArea, smallestOnlineOrder } from "@/lib/facts";
import { isPaymentConfigured } from "@/lib/payments";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ordering and event catering work with ${business.name}.`,
};

/**
 * Two ways to book, side by side, because they genuinely differ: an online
 * order is priced and placed in one go, an event is quoted first. Every step
 * describes what the site and the business actually do; the payment step
 * changes with whether a provider is configured.
 */
const paths: {
  title: string;
  lede: string;
  icon: Icon;
  steps: string[];
  action: { href: string; label: string };
}[] = [
  {
    title: "Order online",
    lede: "Office lunches, meetings, anything on the online menu.",
    icon: BagIcon,
    steps: [
      "Choose food and quantities. Each item shows its minimum.",
      "Add the date, address and head count at checkout.",
      "We confirm the date with you. Nothing charged before.",
      isPaymentConfigured ? "Pay online from your order page, or settle directly." : "We arrange payment with you directly.",
      "Delivered on the day, labelled and ready to serve.",
    ],
    action: { href: "/shop", label: "Order online" },
  },
  {
    title: "Plan an event",
    lede: "Buffets, dinners, receptions, anything made to measure.",
    icon: SparklesIcon,
    steps: [
      "Tell us the date, guests, venue and dietary needs.",
      "We suggest a menu and send one clear price.",
      "Happy with it? We book your date.",
      "We cook for the day and deliver, with staff if you want them.",
    ],
    action: { href: "/quote", label: "Plan an event" },
  },
];

export default function AboutPage() {
  return (
    <Container>
      <PageHeader title="How it works" lede="Two ways to book: order a lunch in minutes, or ask us to quote for an event." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {paths.map((path, index) => (
          <section key={path.title} aria-labelledby={`path-${index}`} className={cx(cardClass, "flex flex-col p-6 sm:p-8")} {...reveal(index)}>
            <IconTile icon={path.icon} />
            <h2 id={`path-${index}`} className="mt-4 font-display text-xl font-semibold tracking-tight">
              {path.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{path.lede}</p>
            <ol className="mt-6 flex-1 space-y-0">
              {path.steps.map((step, stepIndex) => (
                <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* The line joining the steps, stopping at the last. */}
                  {stepIndex < path.steps.length - 1 ? (
                    <span aria-hidden className="absolute top-7 bottom-0 left-3 w-px bg-line" />
                  ) : null}
                  <span className="relative grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                    {stepIndex + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-6 text-ink">{step}</span>
                </li>
              ))}
            </ol>
            <Link href={path.action.href} className={cx(button("primary"), "mt-8 self-start")}>
              {path.action.label} <ArrowRightIcon className={nudgeClass} />
            </Link>
          </section>
        ))}
      </div>

      <section aria-labelledby="details-title" className="mt-14" {...reveal()}>
        <h2 id="details-title" className="font-display text-xl font-semibold tracking-tight">
          The practical details
        </h2>
        <FactChips
          className="mt-4"
          facts={[
            { label: "Online orders", value: `From ${smallestOnlineOrder} people`, icon: UsersIcon },
            { label: "Platters", value: `From ${sandwichMinimum} sandwiches`, icon: BookIcon },
            { label: "Events", value: `From ${minimumEventGuests} guests`, icon: CalendarIcon },
            { label: "Notice", value: `About ${leadTimeDays} days for events`, icon: ClockIcon },
            { label: "Area", value: serviceArea, icon: MapPinIcon },
          ]}
        />
      </section>

      <section aria-labelledby="faq-title" className="mt-14">
        <h2 id="faq-title" className="font-display text-xl font-semibold tracking-tight" {...reveal()}>
          Questions people ask
        </h2>
        <div className="mt-4" {...reveal(1)}>
          <Faq />
        </div>
        <p className="mt-6 text-sm text-ink-muted">
          Something else?{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            Ask us
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
