import Image from "next/image";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { DietaryMarks } from "@/components/dietary";
import { Faq, QUESTIONS } from "@/components/faq";
import { ArrowIcon, CheckIcon, PhoneIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { SectionHeading, buttonClass, secondaryButtonClass, textLinkClass } from "@/components/ui";
import { business } from "@/lib/business";
import { getAvailableProducts } from "@/lib/catalog";
import { lowestPricePerGuest, phoneHref, smallestOnlineOrder } from "@/lib/facts";
import { findPackage, menu } from "@/lib/menu";
import { findProduct, formatMoney, unitLabel } from "@/lib/shop";

/**
 * The home page answers, in order, the questions a person arriving here has:
 * what do you do, can you do it for me, what does it cost, how do I order.
 *
 * Every price on it is LOOKED UP from lib/shop.ts or lib/menu.ts rather than
 * written into the copy, so it cannot disagree with the basket.
 */

/** "From $24.00 a guest" for a per-guest product, or null if it is gone. */
function fromPerGuest(slug: string): string | null {
  const product = findProduct(slug);
  return product ? `From ${formatMoney(product.priceMinor)} a guest` : null;
}

function fromMenu(slug: string): string | null {
  const pkg = findPackage(slug);
  if (!pkg || pkg.pricePerPerson === null) return null;
  return `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`;
}

const occasions = [
  {
    title: "Office and team lunches",
    body: "Sandwich platters, salads and something sweet, delivered to the office and cleared away after.",
    price: fromPerGuest("office-lunch-per-head"),
    href: "/shop#package",
    action: "Order a lunch",
  },
  {
    title: "Hot buffets",
    body: "Hot mains, a salad and sides, laid out for people to help themselves.",
    price: fromMenu("hot-buffet"),
    href: "/menu#hot-buffet",
    action: "See the buffet menu",
  },
  {
    title: "Drinks and receptions",
    body: "Six canapés a guest, passed round a standing event of an hour or two.",
    price: fromPerGuest("canapes-per-head"),
    href: "/shop#package",
    action: "Order canapés",
  },
  {
    title: "Dinners and celebrations",
    body: "Three courses brought to the table, for a seated event with a firm head count.",
    price: fromPerGuest("plated-per-head"),
    href: "/contact?subject=Plated%20dinner",
    action: "Plan a dinner",
  },
];

const steps = [
  {
    title: "Choose your food",
    body: "Order online in a few minutes, or tell us about your event and we will suggest a menu and a price.",
  },
  {
    title: "We confirm the details",
    body: "We check the date, your numbers and any dietary needs with you. Nothing is charged before that.",
  },
  {
    title: "We deliver it ready to serve",
    body: "Made for your date, labelled clearly, and brought to you on platters ready to put out.",
  },
];

export default async function Home() {
  const products = await getAvailableProducts();
  const sandwichPlatters = products.filter((product) => product.category === "sandwich");

  return (
    <main>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-7xl lg:grid-cols-2">
          <div className="px-5 py-10 sm:px-8 sm:py-20 lg:py-24 lg:pr-14">
            <h1 className="max-w-xl font-display text-4xl leading-[1.08] tracking-tight text-ink sm:text-6xl sm:leading-[1.05]">
              Catering for office lunches, meetings and events
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-ink-muted">
              Sandwich platters, hot buffets and sharing boards, made to order and delivered across{" "}
              {business.serviceArea}.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={buttonClass}>
                Order online
              </Link>
              <Link href="/contact" className={secondaryButtonClass}>
                Plan an event
              </Link>
            </div>

            <ul className="mt-10 space-y-3 text-sm text-ink">
              {[
                `Order online for ${smallestOnlineOrder} people or more`,
                `Complete per-guest menus from ${lowestPricePerGuest}`,
                "Vegetarian and vegan dishes clearly marked",
                "Nothing charged until we have confirmed your date",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* First on a phone: on a caterer's site the food is the pitch, and
              below the hero copy it landed entirely off the first screen. */}
          <div className="relative order-first aspect-[16/10] bg-raised lg:order-none lg:aspect-auto lg:min-h-[36rem]">
            <Image
              src="/images/gathered-table-hero.png"
              alt="A catered table with sandwiches on bakery bread, a tomato and mozzarella salad, olives and grilled vegetables"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- occasions */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8" aria-labelledby="occasions-title">
        <SectionHeading id="occasions-title" title="What are you planning?" />
        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {occasions.map((occasion) => (
            <li key={occasion.title} className="flex flex-col border-t-2 border-ink pt-5">
              <h3 className="font-display text-2xl leading-tight text-ink">{occasion.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-ink-muted">{occasion.body}</p>
              {occasion.price ? (
                <p className="mt-4 text-sm font-semibold text-ink">{occasion.price}</p>
              ) : null}
              <Link href={occasion.href} className={`${textLinkClass} mt-3`}>
                {occasion.action} <ArrowIcon className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------- sandwich platters */}
      {sandwichPlatters.length > 0 ? (
        <section className="border-y border-line bg-raised" aria-labelledby="platters-title">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <SectionHeading
              id="platters-title"
              title="Sandwich platters for the office"
              lede="Our most ordered lunch. Made the morning of your order on bakery bread, and delivered on platters ready to put out."
              action={
                <Link href="/shop#sandwich" className={textLinkClass}>
                  Order online <ArrowIcon className="size-4" />
                </Link>
              }
            />

            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {sandwichPlatters.map((product) => (
                <li key={product.slug} className="flex flex-col overflow-hidden rounded-md bg-surface">
                  {product.image ? (
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? product.name}
                        fill
                        sizes="(min-width: 768px) 30vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-xl leading-snug text-ink">
                        {product.name} <DietaryMarks tags={product.dietary} />
                      </h3>
                      <p className="shrink-0 text-right">
                        <span className="block font-semibold text-ink">{formatMoney(product.priceMinor)}</span>
                        <span className="text-xs text-ink-muted">{unitLabel(product)}</span>
                      </p>
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">{product.description}</p>
                    <p className="mt-4 text-xs text-ink-muted">
                      Minimum {product.minQuantity}.{product.serves ? ` ${product.serves}.` : ""}
                    </p>
                    <form action={addToCartAction} className="mt-4">
                      <input type="hidden" name="slug" value={product.slug} />
                      <input type="hidden" name="quantity" value={product.minQuantity} />
                      <SubmitButton pendingLabel="Adding..." className={`${secondaryButtonClass} w-full`}>
                        Add {product.minQuantity} to your order
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- how it works */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8" aria-labelledby="how-title">
        <SectionHeading
          id="how-title"
          title="How ordering works"
          action={
            <Link href="/about" className={textLinkClass}>
              The details <ArrowIcon className="size-4" />
            </Link>
          }
        />
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-semibold text-on-accent"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------- event menus */}
      <section className="border-t border-line" aria-labelledby="menus-title">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-raised">
            <Image
              src="/images/catering-sandwich-spread.png"
              alt="Sandwiches, wraps and salads arranged on a buffet table"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <SectionHeading
              id="menus-title"
              title="Menus for events"
              lede="For bigger occasions we cook to order from our event menus, and send you one clear price before anything is booked."
            />
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {menu.map((pkg) => (
                <li key={pkg.slug}>
                  <Link
                    href={`/menu#${pkg.slug}`}
                    className="group flex items-baseline justify-between gap-6 py-4"
                  >
                    <span className="font-display text-xl text-ink group-hover:text-accent">{pkg.name}</span>
                    <span className="shrink-0 text-sm text-ink-muted">
                      {pkg.pricePerPerson === null
                        ? "Priced by the dish"
                        : `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className={buttonClass}>
                See the full menus
              </Link>
              <Link href="/contact" className={secondaryButtonClass}>
                Ask for a quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ */}
      <section className="border-t border-line bg-raised" aria-labelledby="faq-title">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="faq-title" className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              Good to know before you order
            </h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-ink-muted">
              Something else? Call us on{" "}
              <a href={phoneHref} className="font-semibold text-ink underline underline-offset-4">
                {business.phone}
              </a>
              .
            </p>
          </div>
          <Faq questions={QUESTIONS.slice(0, 4)} />
        </div>
      </section>

      {/* ------------------------------------------------------- closing */}
      <section className="mx-auto w-full max-w-7xl px-5 pt-20 sm:px-8">
        <div className="grid gap-8 rounded-md bg-accent px-6 py-10 text-on-accent sm:px-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-display text-3xl leading-tight">Planning something bigger?</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-on-accent/80">
              Send us the date, the number of guests and where it is, and we will come back with a
              menu and a price.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-sm bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:bg-raised"
            >
              Tell us about your event
            </Link>
            <a
              href={phoneHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-on-accent/30 px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-on-accent/10"
            >
              <PhoneIcon className="size-4" />
              {business.phone}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
