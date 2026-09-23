import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav } from "@/components/category-nav";
import { DietaryLegend, DietaryMarks } from "@/components/dietary";
import { ArrowRightIcon, CalendarIcon, ClockIcon, MapPinIcon, PhoneIcon, UsersIcon } from "@/components/icons";
import { button, cardClass, Container, cx, FactChips, nudgeClass, PageHeader, reveal } from "@/components/ui";
import { business } from "@/lib/business";
import { leadTimeDays, minimumEventGuests, phoneHref, serviceArea } from "@/lib/facts";
import { menu } from "@/lib/menu";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Event menus",
  description: "Lunch platters, hot buffets, entrée trays, soups, salads and sides for events.",
};

/**
 * The event menus. THESE ARE QUOTED, NOT ORDERED ONLINE: the dishes here are
 * not in the online catalog, so every package leads to the quote request with
 * the package already chosen, never to /shop.
 */
export default function MenuPage() {
  return (
    <Container>
      <PageHeader
        title="Event menus"
        lede="Cooked for your day and adjusted to your guests, with one clear price before anything is booked."
        actions={
          <>
            <Link href="/quote" className={button("primary")}>
              Get a quote <ArrowRightIcon className={nudgeClass} />
            </Link>
            <Link href="/shop" className={button("secondary")}>
              Order a lunch
            </Link>
          </>
        }
      />

      <FactChips
        facts={[
          { label: "Events from", value: `From ${minimumEventGuests} guests`, icon: UsersIcon },
          { label: "Notice", value: `About ${leadTimeDays} days' notice`, icon: ClockIcon },
          { label: "Pricing", value: "One quote, agreed first", icon: CalendarIcon },
          { label: "Delivering to", value: serviceArea, icon: MapPinIcon },
        ]}
      />

      <CategoryNav className="mt-6" label="Menu sections" items={menu.map((pkg) => ({ id: pkg.slug, label: pkg.name }))} />
      <DietaryLegend className="mt-3" />

      <div className="mt-8 space-y-4">
        {menu.map((pkg) => (
          <section
            key={pkg.slug}
            id={pkg.slug}
            aria-labelledby={`${pkg.slug}-title`}
            className={cx(cardClass, "grid gap-6 p-5 sm:p-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12")}
            {...reveal()}
          >
            <div className="lg:sticky lg:top-40 lg:self-start">
              <h2 id={`${pkg.slug}-title`} className="font-display text-2xl font-semibold tracking-tight">
                {pkg.name}
              </h2>
              <p className="mt-1 text-sm font-medium text-accent-strong">
                {pkg.pricePerPerson === null
                  ? "Priced by the dish"
                  : `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{pkg.summary}</p>
              <Link href={`/quote?package=${pkg.slug}`} className={cx(button("secondary", "sm"), "mt-5")}>
                Quote for this <ArrowRightIcon className={nudgeClass} />
              </Link>
            </div>

            <ul className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
              {pkg.items.map((item) => (
                <li key={item.name}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-medium leading-snug text-ink">
                      {item.name} <DietaryMarks tags={item.tags} />
                    </h3>
                    {item.price ? (
                      <>
                        {/* A dotted leader, as on a printed menu, so the eye follows a name to its price. */}
                        <span aria-hidden className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-ink/20" />
                        <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">{item.price}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section
        className="mt-10 flex flex-col gap-5 rounded-2xl bg-accent-soft px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10"
        {...reveal()}
      >
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Not sure what to choose?</h2>
          <p className="mt-1 text-sm text-ink-muted">Tell us your numbers and what they cannot eat. We suggest a menu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quote?package=unsure" className={button("primary")}>
            Ask us
          </Link>
          <a href={phoneHref} className={button("secondary")}>
            <PhoneIcon className="size-4" />
            {business.phone}
          </a>
        </div>
      </section>
    </Container>
  );
}
