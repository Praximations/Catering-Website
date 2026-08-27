import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, buttonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Menu",
  description: "What we cook, by package.",
};

export default function MenuPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <PageHeader
        eyebrow="Menu"
        title="What we cook"
        lede="Four ways to feed a room. Every menu is adjusted to the event, the season, and whoever cannot eat what."
      />

      <div className="space-y-14">
        {menu.map((pkg) => (
          // The id is what the home page cards link to.
          <section key={pkg.slug} id={pkg.slug} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl tracking-tight text-ink">{pkg.name}</h2>
              <p className="text-sm font-medium text-accent-strong">
                {pkg.pricePerPerson === null
                  ? "Quoted per event"
                  : `From $${pkg.pricePerPerson} a head`}
              </p>
            </div>
            <p className="mt-2 text-ink-muted">{pkg.summary}</p>

            <ul className="mt-6 divide-y divide-line border-y border-line">
              {pkg.items.map((item) => (
                <li key={item.name} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{item.name}</h3>
                    {item.tags?.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-lg border border-line bg-raised px-6 py-8">
        <h2 className="font-display text-xl text-ink">Something else in mind?</h2>
        <p className="mt-2 text-ink-muted">
          These are starting points, not a fixed list. Tell us what you are imagining and we will
          quote it. We cook for {business.minimumGuests} people or more.
        </p>
        <Link href="/quote" className={`${buttonClass} mt-5`}>
          Request a quote
        </Link>
      </div>

      <p className="mt-10 text-xs text-ink-subtle">
        Sample menu. The dishes and prices above are stand-ins, set in lib/menu.ts.
      </p>
    </main>
  );
}
