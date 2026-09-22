import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DietaryLegend, DietaryMarks } from "@/components/dietary";
import { ArrowIcon } from "@/components/icons";
import { FactList, buttonClass, secondaryButtonClass, textLinkClass } from "@/components/ui";
import { business } from "@/lib/business";
import { leadTimeDays, minimumEventGuests, phoneHref, serviceArea } from "@/lib/facts";
import { menu } from "@/lib/menu";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Event menus",
  description: "Lunch platters, hot buffets, entrée trays, soups, salads and sides for events.",
};

/** The contact page reads ?subject= and fills in the form with it. */
function quoteHref(subject: string): string {
  return `/contact?subject=${encodeURIComponent(subject)}`;
}

/**
 * The event menus, laid out like a printed catering menu: section, dish,
 * price, one line of description.
 *
 * THESE ARE QUOTED, NOT ORDERED ONLINE. The dishes here are not in the online
 * catalog, which is why every section asks for a quote instead of linking to
 * /shop. The previous "Order this collection" link sent people to a page that
 * did not sell what they had just chosen.
 */
export default function MenuPage() {
  return (
    <main>
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="font-display text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
              Event menus
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-muted">
              For events and larger orders we cook from these menus, adjust them to your guests, and
              send you one clear price before anything is booked.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={quoteHref("Event catering quote")} className={buttonClass}>
                Ask for a quote
              </Link>
              <Link href="/shop" className={secondaryButtonClass}>
                Order a lunch online instead
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-raised">
            <Image
              src="/images/catering-sandwich-spread.png"
              alt="Sandwiches, wraps and salads laid out on a buffet table"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <FactList
          className="border-b border-line py-6"
          facts={[
            { label: "Events from", value: `${minimumEventGuests} guests` },
            { label: "Notice", value: `About ${leadTimeDays} days` },
            { label: "Pricing", value: "One quote, agreed before booking" },
            { label: "Delivering to", value: serviceArea },
          ]}
        />

        <div className="flex flex-col gap-4 border-b border-line py-5 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Menu sections" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {menu.map((pkg) => (
              <a key={pkg.slug} href={`#${pkg.slug}`} className="font-medium text-ink-muted hover:text-ink">
                {pkg.name}
              </a>
            ))}
          </nav>
          <DietaryLegend />
        </div>

        <div className="divide-y divide-line">
          {menu.map((pkg) => (
            <section
              key={pkg.slug}
              id={pkg.slug}
              aria-labelledby={`${pkg.slug}-title`}
              className="grid gap-8 py-14 lg:grid-cols-[0.8fr_1.6fr] lg:gap-16"
            >
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2 id={`${pkg.slug}-title`} className="font-display text-4xl leading-tight tracking-tight text-ink">
                  {pkg.name}
                </h2>
                <p className="mt-3 font-semibold text-ink">
                  {pkg.pricePerPerson === null
                    ? "Priced by the dish"
                    : `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`}
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">{pkg.summary}</p>
                <Link href={quoteHref(`${pkg.name} quote`)} className={`${textLinkClass} mt-5`}>
                  Get a quote for {pkg.name.toLowerCase()} <ArrowIcon className="size-4" />
                </Link>
              </div>

              <ul className="grid gap-x-10 gap-y-7 md:grid-cols-2">
                {pkg.items.map((item) => (
                  <li key={item.name}>
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display text-xl leading-snug text-ink">
                        {item.name} <DietaryMarks tags={item.tags} />
                      </h3>
                      {/* A dotted leader, as on a printed menu, so the eye can
                          follow a name across to its price. */}
                      {item.price ? (
                        <>
                          <span aria-hidden className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-ink/25" />
                          <span className="shrink-0 text-sm font-semibold text-ink">{item.price}</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-ink-muted">{item.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="grid gap-6 rounded-md bg-raised px-6 py-10 sm:px-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-display text-3xl leading-tight text-ink">Not sure what to choose?</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-ink-muted">
              Tell us how many people are coming, where, and anything they cannot eat. We will suggest a
              menu that fits and send you the price.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={quoteHref("Help choosing a menu")} className={buttonClass}>
              Get in touch
            </Link>
            <a href={phoneHref} className={secondaryButtonClass}>
              Call {business.phone}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
