import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, BagIcon, MailIcon, MapPinIcon, PhoneIcon, SparklesIcon, type Icon } from "@/components/icons";
import { MapFrame } from "@/components/map";
import { cardClass, Container, cx, IconTile, interactiveCardClass, nudgeClass, PageHeader } from "@/components/ui";
import { business } from "@/lib/business";
import { phoneHref } from "@/lib/facts";
import { mapsEnabled } from "@/lib/geo";
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

  // Other pages link here with ?subject= so the form already says what it is
  // about. It only ever becomes a default value, which React escapes, and it
  // is capped to the length the action accepts.
  const subject = typeof params.subject === "string" ? params.subject.slice(0, LIMITS.subject) : "";

  const methods: { label: string; value: string; href: string; icon: Icon }[] = [
    { label: "Call", value: business.phone, href: phoneHref, icon: PhoneIcon },
    { label: "Email", value: business.email, href: `mailto:${business.email}`, icon: MailIcon },
  ];

  return (
    <Container>
      <PageHeader title="Contact" lede="Questions, or help with an order. We usually reply within a working day." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="Send a message" className={cx(cardClass, "p-5 sm:p-8")}>
          <ContactForm defaults={{ name: user?.name ?? "", email: user?.email ?? "", subject }} />
        </section>

        <aside className="space-y-3">
          {methods.map((method) => (
            <a key={method.label} href={method.href} className={cx(interactiveCardClass, "group flex items-center gap-3 p-4")}>
              <IconTile icon={method.icon} />
              <span className="min-w-0">
                <span className="block text-xs text-ink-muted">{method.label}</span>
                <span className="block truncate font-medium text-ink">{method.value}</span>
              </span>
            </a>
          ))}

          <div className={cx(cardClass, "p-4")}>
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-accent" />
              Delivering to {business.serviceArea}
            </p>
            {mapsEnabled && business.location ? (
              <MapFrame point={business.location} title={`Map of ${business.location.label}`} className="mt-3" height="h-40" />
            ) : null}
          </div>

          <div className="grid gap-3 pt-2">
            <Link href="/quote" className="group flex items-center justify-between rounded-xl px-1 text-sm font-medium text-ink-muted hover:text-ink">
              <span className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-accent" />
                Planning an event? Ask for a quote
              </span>
              <ArrowRightIcon className={nudgeClass} />
            </Link>
            <Link href="/shop" className="group flex items-center justify-between rounded-xl px-1 text-sm font-medium text-ink-muted hover:text-ink">
              <span className="flex items-center gap-2">
                <BagIcon className="size-4 text-accent" />
                Just need lunch? Order online
              </span>
              <ArrowRightIcon className={nudgeClass} />
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}
