import type { Metadata } from "next";
import { CheckCircleIcon, ClockIcon, SparklesIcon, UsersIcon, type Icon } from "@/components/icons";
import { cardClass, Container, cx, PageHeader } from "@/components/ui";
import { leadTimeDays, minimumEventGuests } from "@/lib/facts";
import { mapsEnabled } from "@/lib/geo";
import { menu } from "@/lib/menu";
import { getCurrentUser } from "@/lib/session";
import { QuoteForm } from "./quote-form";

export const metadata: Metadata = {
  title: "Plan an event",
  description: "Tell us about your event and we will come back with a menu and a price.",
};

/**
 * The event quote request: the few things the kitchen needs to price an
 * event, and nothing else. Under the minimum or inside the lead time is
 * allowed, because it is the kitchen's call and not the form's; the facts are
 * stated up front instead.
 */
export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string | string[] }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const requested = typeof params.package === "string" ? params.package : "";
  const packageSlug = [...menu.map((pkg) => pkg.slug), "unsure"].includes(requested) ? requested : "";

  const today = new Date();
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const next: { title: string; body: string; icon: Icon }[] = [
    { title: "We read it", body: "Usually within a working day.", icon: ClockIcon },
    { title: "You get a menu and a price", body: "One clear quote, by email.", icon: SparklesIcon },
    { title: "We book your date", body: "Only once you are happy with it.", icon: CheckCircleIcon },
  ];

  return (
    <Container size="medium">
      <PageHeader title="Plan an event" lede="Tell us the basics. We reply with a menu and one clear price." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <QuoteForm
          packages={menu.map((pkg) => ({ slug: pkg.slug, name: pkg.name }))}
          minDate={minDate}
          defaults={{ name: user?.name ?? "", email: user?.email ?? "", packageSlug }}
          mapsEnabled={mapsEnabled}
        />

        <aside className="space-y-3 lg:sticky lg:top-24">
          <div className={cx(cardClass, "p-5")}>
            <h2 className="font-display text-base font-semibold tracking-tight">What happens next</h2>
            <ol className="mt-4 space-y-4">
              {next.map((step) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <step.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{step.title}</span>
                    <span className="block text-xs text-ink-muted">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <p className="flex items-start gap-2 px-1 text-xs leading-5 text-ink-muted">
            <UsersIcon className="mt-0.5 size-3.5 shrink-0" />
            Events usually start at {minimumEventGuests} guests with about {leadTimeDays} days&apos; notice. Smaller or sooner? Ask anyway.
          </p>
        </aside>
      </div>
    </Container>
  );
}
