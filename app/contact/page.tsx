import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { business } from "@/lib/business";
import { phoneHref } from "@/lib/facts";
import { getCurrentUser } from "@/lib/session";
import { LIMITS } from "@/lib/validation";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${business.name} about catering and events.`,
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string | string[] }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  // Other pages link here with ?subject= so the form already says what the
  // enquiry is about. It only ever becomes an input's default value, which
  // React escapes, and it is capped to the same length the action accepts.
  const subject = typeof params.subject === "string" ? params.subject.slice(0, LIMITS.subject) : "";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <PageHeader
        title="Get in touch"
        lede="Questions, quotes for events, or help with an order you have placed."
      />

      <div className="grid gap-12 lg:grid-cols-[1.35fr_0.65fr]">
        <section aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="sr-only">
            Send us a message
          </h2>
          <ContactForm defaults={{ name: user?.name ?? "", email: user?.email ?? "", subject }} />
        </section>

        <aside className="space-y-10 text-sm">
          <div>
            <h2 className="font-display text-2xl text-ink">Call or email</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a href={phoneHref} className="font-semibold text-ink underline-offset-4 hover:underline">
                  {business.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${business.email}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                  {business.email}
                </a>
              </li>
            </ul>
            <p className="mt-4 leading-6 text-ink-muted">Delivering to {business.serviceArea}.</p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ink">Asking for a quote?</h2>
            <p className="mt-3 leading-6 text-ink-muted">
              It saves a round of emails if you can include:
            </p>
            <ul className="mt-3 space-y-2 text-ink">
              {[
                "The date and roughly what time",
                "How many guests",
                "Where it is",
                "Allergies and dietary needs",
                "A budget, if you have one in mind",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="border-t border-line pt-6 leading-6 text-ink-muted">
            Just need lunch?{" "}
            <Link href="/shop" className="font-semibold text-accent underline-offset-4 hover:underline">
              Order online
            </Link>{" "}
            in a few minutes.
          </p>
        </aside>
      </div>
    </main>
  );
}
