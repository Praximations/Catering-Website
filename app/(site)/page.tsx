import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { DietaryMarks } from "@/components/dietary";
import { Faq, QUESTIONS } from "@/components/faq";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  LeafIcon,
  PhoneIcon,
  ShieldIcon,
  TruckIcon,
  type Icon,
} from "@/components/icons";
import { button, cardClass, Container, cx, interactiveCardClass, nudgeClass, reveal, textLinkClass } from "@/components/ui";
import { business } from "@/lib/business";
import { getAvailableProducts } from "@/lib/catalog";
import { lowestPricePerGuest, phoneHref, smallestOnlineOrder } from "@/lib/facts";
import { findPackage, menu } from "@/lib/menu";
import { findProduct, formatMoney, quantityInputLabel, unitLabel } from "@/lib/shop";

/**
 * The home page answers, in order: what do you do, can you do it for me, what
 * does it cost, how do I book. Every price is LOOKED UP from lib/shop.ts or
 * lib/menu.ts, so the page cannot disagree with the basket.
 *
 * It is laid out as a caterer's site rather than an app's: the food first and
 * large, full-width bands that alternate with the page, and plain statements
 * of what every order gets. Each of those statements is something the site
 * already promises elsewhere; none is invented for the page.
 */

function fromPerGuest(slug: string): string | null {
  const product = findProduct(slug);
  return product ? `From ${formatMoney(product.priceMinor)} a guest` : null;
}

function fromMenu(slug: string): string | null {
  const pkg = findPackage(slug);
  if (!pkg || pkg.pricePerPerson === null) return null;
  return `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`;
}

const occasions: { title: string; body: string; price: string | null; href: string; action: string }[] = [
  {
    title: "Office lunches",
    body: "Platters, salads and something sweet, delivered and cleared.",
    price: fromPerGuest("office-lunch-per-head"),
    href: "/shop#package",
    action: "Order online",
  },
  {
    title: "Hot buffets",
    body: "Hot mains, a salad and sides for people to help themselves.",
    price: fromMenu("hot-buffet"),
    href: "/catalog#hot-buffet",
    action: "See the catalog",
  },
  {
    title: "Receptions",
    body: "Six canapés a guest, passed round a standing event.",
    price: fromPerGuest("canapes-per-head"),
    href: "/shop#package",
    action: "Order online",
  },
  {
    title: "Dinners",
    body: "Three courses to the table, for a seated celebration.",
    price: fromPerGuest("plated-per-head"),
    href: "/quote?package=unsure",
    action: "Get a quote",
  },
];

/** What every order gets. Each line is a promise the site already makes. */
const promises: { title: string; body: string; icon: Icon }[] = [
  { title: "Made that morning", body: "Platters are prepared the morning of your delivery.", icon: ClockIcon },
  { title: "Delivered ready to serve", body: "Labelled and on platters, ready to put straight out.", icon: TruckIcon },
  { title: "Dietary needs covered", body: "Vegetarian and vegan dishes marked, allergies planned around.", icon: LeafIcon },
  { title: "Nothing charged up front", body: "We confirm the date with you before any payment.", icon: ShieldIcon },
];

const steps: { title: string; body: string }[] = [
  { title: "Choose", body: "Order platters and per-guest menus online in minutes, or ask us for a quote." },
  { title: "We confirm", body: "We check the date, the numbers and any dietary needs with you. Nothing is charged before." },
  { title: "We deliver", body: "Everything arrives labelled, on platters, ready to serve." },
];

/** A full-width white band, so the page reads as sections rather than one column of cards. */
function Band({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={cx("border-y border-line bg-surface py-16 sm:py-24", className)}>
      <Container>{children}</Container>
    </section>
  );
}

function SectionHeading({ id, title, lede, action }: { id: string; title: string; lede?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" {...reveal()}>
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {lede ? <p className="mt-3 text-lg leading-8 text-ink-muted">{lede}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default async function Home() {
  const products = await getAvailableProducts();
  const platters = products.filter((product) => product.category === "sandwich");

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <Container className="pb-16 sm:pb-24">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="animate-fade-up">
            <h1 className="font-display text-[2.75rem] leading-[1.02] font-semibold tracking-tight text-ink sm:text-6xl xl:text-7xl">
              Catering for lunches, meetings and events
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-muted sm:text-xl sm:leading-9">
              Made to order and delivered ready to serve across {business.serviceArea}. Order online, or tell us
              about your event and we will put a menu together.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/shop" className={button("primary", "lg")}>
                Order online
                <ArrowRightIcon className={nudgeClass} />
              </Link>
              <Link href="/quote" className={button("secondary", "lg")}>
                Plan an event
              </Link>
              <a href={phoneHref} className="group ml-1 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <PhoneIcon data-motion="wiggle" className="nav-icon size-4 text-accent" />
                <span className="underline-offset-4 group-hover:underline">or call {business.phone}</span>
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[0.9375rem] font-medium text-ink">
              {[`From ${smallestOnlineOrder} people`, `From ${lowestPricePerGuest} a guest`, "Nothing charged until we confirm"].map(
                (fact) => (
                  <li key={fact} className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-full bg-accent text-on-accent">
                      <CheckIcon className="size-3" />
                    </span>
                    {fact}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* First on a phone: on a caterer's site the food is the pitch. */}
          <div className="parallax relative order-first aspect-[4/3] animate-fade-in overflow-hidden rounded-2xl bg-raised shadow-lg lg:order-none lg:aspect-[6/5]">
            <Image
              src="/images/gathered-table-hero.png"
              alt="A catered table with sandwiches on bakery bread, a tomato and mozzarella salad, olives and grilled vegetables"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="animate-hero-zoom object-cover"
            />
          </div>
        </section>
      </Container>

      {/* -------------------------------------------------------- promises */}
      <Band labelledBy="promises-title" className="py-12 sm:py-14">
        <h2 id="promises-title" className="sr-only">
          What every order gets
        </h2>
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {promises.map((promise, index) => (
            <li key={promise.title} className="flex gap-4" {...reveal(index)}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <promise.icon className="size-6" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-ink">{promise.title}</h3>
                <p className="mt-1 leading-7 text-ink-muted">{promise.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Band>

      {/* ----------------------------------------------- sandwich platters */}
      {platters.length > 0 ? (
        <Container className="py-16 sm:py-24">
          <section aria-labelledby="platters-title">
            <SectionHeading
              id="platters-title"
              title="Our sandwich platters"
              lede="Our most ordered lunch, made the morning of delivery."
              action={
                <Link href="/shop#sandwich" className={textLinkClass}>
                  See everything you can order <ArrowRightIcon className={nudgeClass} />
                </Link>
              }
            />

            {/* A row that scrolls sideways on a phone rather than a tall stack.
                Positioned, so nothing absolutely placed inside escapes its clip. */}
            <ul className="relative -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {platters.map((product, index) => (
                <li
                  key={product.slug}
                  className={cx(cardClass, "flex w-[82%] shrink-0 snap-start flex-col overflow-hidden sm:w-auto")}
                  {...reveal(index)}
                >
                  {product.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-raised" {...reveal(index, { motion: "zoom" })}>
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? product.name}
                        fill
                        sizes="(min-width: 640px) 30vw, 82vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold leading-snug text-ink">
                        {product.name} <DietaryMarks tags={product.dietary} />
                      </h3>
                      <p className="shrink-0 text-right">
                        <span className="block text-lg font-semibold text-ink">{formatMoney(product.priceMinor)}</span>
                        <span className="text-xs text-ink-subtle">{unitLabel(product)}</span>
                      </p>
                    </div>
                    <p className="mt-1 flex-1 text-sm text-ink-subtle">Minimum {product.minQuantity}</p>
                    <div className="mt-5">
                      <AddToCart
                        slug={product.slug}
                        min={product.minQuantity}
                        withQuantity={false}
                        label={`Add ${product.minQuantity} to order`}
                        unitLabel={quantityInputLabel(product)}
                        fullWidth
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      ) : null}

      {/* ------------------------------------------------------- occasions */}
      <Band labelledBy="occasions-title">
        <SectionHeading
          id="occasions-title"
          title="Catering for every occasion"
          lede="From a working lunch for eight to a seated dinner. Prices are per guest, before delivery."
        />
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {occasions.map((occasion, index) => (
            <li key={occasion.title} {...reveal(index)}>
              <Link href={occasion.href} className={cx(interactiveCardClass, "group flex h-full flex-col border-t-4 border-t-accent p-6")}>
                <h3 className="text-xl font-semibold text-ink">{occasion.title}</h3>
                <p className="mt-2 flex-1 leading-7 text-ink-muted">{occasion.body}</p>
                <p className="mt-6 font-display text-lg font-semibold text-ink">{occasion.price ?? "Quoted for you"}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  {occasion.action}
                  <ArrowRightIcon className={nudgeClass} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      {/* --------------------------------------------------------- catalog */}
      <Container className="py-16 sm:py-24">
        <section aria-labelledby="catalog-title" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div
            className="parallax relative aspect-[4/3] overflow-hidden rounded-2xl bg-raised shadow-md lg:aspect-[5/4]"
            {...reveal(0, { motion: "zoom" })}
          >
            <Image
              src="/images/catering-sandwich-spread.png"
              alt="Sandwiches, wraps and salads arranged on a buffet table"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div {...reveal(1)}>
            <h2 id="catalog-title" className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              The catalog
            </h2>
            <p className="mt-3 text-lg leading-8 text-ink-muted">
              Everything we cook for events, cooked to order, with one clear price before anything is booked.
            </p>
            <ul className={cx(cardClass, "mt-8 divide-y divide-line")}>
              {menu.map((pkg) => (
                <li key={pkg.slug}>
                  <Link
                    href={`/catalog#${pkg.slug}`}
                    className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-raised/60"
                  >
                    <span className="font-medium text-ink">{pkg.name}</span>
                    <span className="flex items-center gap-2 text-sm text-ink-muted">
                      {pkg.pricePerPerson === null
                        ? "By the dish"
                        : `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))} a guest`}
                      <ChevronRightIcon className="size-4 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/catalog" className={button("primary")}>
                Browse the catalog
              </Link>
              <Link href="/quote" className={button("secondary")}>
                Get a quote
              </Link>
            </div>
          </div>
        </section>
      </Container>

      {/* ---------------------------------------------------- how it works */}
      <Band labelledBy="how-title">
        <SectionHeading
          id="how-title"
          title="How ordering works"
          action={
            <Link href="/about" className={textLinkClass}>
              The details <ArrowRightIcon className={nudgeClass} />
            </Link>
          }
        />
        <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-line pt-6" {...reveal(index)}>
              <p className="font-display text-sm font-semibold text-accent tabular-nums">Step {index + 1}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 leading-7 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      {/* ----------------------------------------------------------- FAQ */}
      <Container size="narrow" className="py-16 sm:py-24">
        <section aria-labelledby="faq-title">
          <div className="text-center" {...reveal()}>
            <h2 id="faq-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Good to know
            </h2>
            <p className="mt-3 text-ink-muted">
              Something else?{" "}
              <a href={phoneHref} className="font-semibold text-ink underline-offset-4 hover:underline">
                Call {business.phone}
              </a>
            </p>
          </div>
          <div className="mt-10" {...reveal(1)}>
            <Faq questions={QUESTIONS.slice(0, 4)} />
          </div>
        </section>
      </Container>

      {/* ------------------------------------------------------- closing */}
      <section className="bg-accent-strong py-16 text-on-accent sm:py-20" aria-labelledby="closing-title">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between" {...reveal()}>
            <div>
              <h2 id="closing-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Planning something bigger?
              </h2>
              <p className="mt-3 max-w-xl text-lg text-on-accent/75">
                Tell us the date, the numbers and where. We come back with a menu and a price.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/quote" className={button("inverse", "lg")}>
                Plan an event
                <ArrowRightIcon className={nudgeClass} />
              </Link>
              <a
                href={phoneHref}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-on-accent/25 px-6 font-semibold text-on-accent transition-colors hover:bg-on-accent/10"
              >
                <PhoneIcon className="size-4" />
                {business.phone}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
