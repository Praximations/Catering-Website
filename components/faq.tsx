import Link from "next/link";
import type { ReactNode } from "react";
import { PlusIcon } from "@/components/icons";
import { business } from "@/lib/business";
import { isPaymentConfigured } from "@/lib/payments";
import {
  leadTimeDays,
  minimumEventGuests,
  phoneHref,
  sandwichMinimum,
  smallestOnlineOrder,
} from "@/lib/facts";

/**
 * Questions a catering customer asks before they order.
 *
 * EVERY ANSWER DESCRIBES WHAT THIS SITE ACTUALLY DOES, and nothing else. No
 * cancellation window, no delivery fee, no "full refund" promise: those are
 * the business owner's policies to set, and an FAQ that states a policy the
 * business has not decided is worse than a shorter FAQ. The numbers come from
 * lib/facts.ts, so they cannot drift from the catalog.
 *
 * <details>, so it works with no JavaScript and every answer is in the page
 * for search and for find-in-page.
 */

interface Question {
  q: string;
  a: ReactNode;
}

export const QUESTIONS: Question[] = [
  {
    q: "What is the smallest order you take?",
    a: (
      <>
        Online, from {smallestOnlineOrder} people for an office lunch. Sandwich platters start at{" "}
        {sandwichMinimum} sandwiches, and most other per-guest menus at {minimumEventGuests} guests.
        Each item shows its own minimum.
      </>
    ),
  },
  {
    q: "How much notice do you need?",
    a: (
      <>
        For an event, about {leadTimeDays} days, so we can plan the menu and the staffing properly.
        For an online order, choose your date at checkout and we will confirm that we can do it
        before anything is charged.
      </>
    ),
  },
  {
    q: "Do I pay when I order?",
    // Only claims online payment when a provider is actually configured.
    a: isPaymentConfigured ? (
      <>
        No. Your order is saved first and we confirm the date with you. You can then pay securely
        online from your confirmation page, or settle it with us directly.
      </>
    ) : (
      <>
        No. Your order is saved first, we confirm the date with you, and then we arrange payment
        directly.
      </>
    ),
  },
  {
    q: "Can you cater for allergies and dietary needs?",
    a: (
      <>
        Yes. Dishes are marked vegetarian or vegan on the menu, and many others can be made that
        way on request. Add allergies and dietary needs in the notes when you order, or tell us
        when you get in touch, and we plan around them.
      </>
    ),
  },
  {
    q: "Can I change my order after placing it?",
    a: (
      <>
        Yes. Message us from your order page, which has the order attached, or from your account.
        For anything on the day, call us on{" "}
        <a href={phoneHref} className="font-semibold text-ink underline underline-offset-4">
          {business.phone}
        </a>
        .
      </>
    ),
  },
  {
    q: "Where do you deliver?",
    a: (
      <>
        {business.serviceArea}. If you are not sure you are in range,{" "}
        <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
          ask us
        </Link>
        .
      </>
    ),
  },
];

export function Faq({ questions = QUESTIONS }: { questions?: Question[] }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface shadow-xs">
      {questions.map((item) => (
        <details key={item.q} className="disclosure group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 px-5 py-4 text-left font-medium text-ink transition-colors hover:text-accent-strong">
            {item.q}
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-ink-muted transition-transform duration-300 ease-spring group-open:rotate-45"
            >
              <PlusIcon className="size-3.5" />
            </span>
          </summary>
          <div className="max-w-2xl px-5 pb-5 text-sm leading-6 text-ink-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
