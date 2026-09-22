import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, buttonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Catering menu",
  description: "Sandwiches, team lunches, buffets, canapes, and plated catering.",
};

export default function MenuPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-18">
      <div className="flex flex-col gap-8 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Menu"
          title="Made for a roomful."
          lede="Use these menus as a starting point. We adjust the final spread around the season, the venue, and the people eating."
        />
        <nav aria-label="Menu sections" className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
          {menu.map((pkg) => (
            <a
              key={pkg.slug}
              href={`#${pkg.slug}`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent/30 hover:bg-raised hover:text-accent-strong"
            >
              {pkg.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="divide-y divide-line">
        {menu.map((pkg, index) => (
          <section
            key={pkg.slug}
            id={pkg.slug}
            className="grid scroll-mt-28 gap-8 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:py-16"
          >
            <div>
              <p className="text-xs font-semibold text-highlight">0{index + 1}</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight text-ink">{pkg.name}</h2>
              <p className="mt-4 max-w-sm leading-7 text-ink-muted">{pkg.summary}</p>
              <p className="mt-5 text-sm font-semibold text-accent-strong">
                {pkg.pricePerPerson === null
                  ? "Quoted per event"
                  : `From $${pkg.pricePerPerson} a head`}
              </p>
            </div>

            <ul className="grid gap-x-8 sm:grid-cols-2">
              {pkg.items.map((item) => (
                <li key={item.name} className="border-t border-line py-5 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{item.name}</h3>
                    {item.tags?.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="grid gap-7 rounded-lg bg-raised p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">
            Ready to order
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">
            Start with sandwiches or build a full spread.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">
            Sandwich assortments start at 50 pieces. Event catering starts at{" "}
            {business.minimumGuests} guests.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className={buttonClass}>
            Order online
          </Link>
        </div>
      </section>
    </main>
  );
}
