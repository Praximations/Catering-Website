import Image from "next/image";
import Link from "next/link";
import { AddToCart } from "@/components/add-to-cart";
import { DietaryMarks } from "@/components/dietary";
import { Faq, QUESTIONS } from "@/components/faq";
import {
  ArrowRightIcon,
  BagIcon,
  BookIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
  UtensilsIcon,
  type Icon,
} from "@/components/icons";
import {
  button,
  cardClass,
  Container,
  cx,
  FactChips,
  IconTile,
  interactiveCardClass,
  nudgeClass,
  reveal,
  textLinkClass,
} from "@/components/ui";
import { business } from "@/lib/business";
import { getAvailableProducts } from "@/lib/catalog";
import { lowestPricePerGuest, phoneHref, smallestOnlineOrder } from "@/lib/facts";
import { findPackage, menu } from "@/lib/menu";
import { findProduct, formatMoney, quantityInputLabel, unitLabel } from "@/lib/shop";

/**
 * The home page answers, in order: what do you do, can you do it for me, what
 * does it cost, how do I book. Every price is LOOKED UP from lib/shop.ts or
 * lib/menu.ts, so the page cannot disagree with the basket.
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

const occasions: { title: string; body: string; price: string | null; href: string; icon: Icon }[] = [
  {
    title: "Office lunches",
    body: "Platters, salads and something sweet, delivered and cleared.",
    price: fromPerGuest("office-lunch-per-head"),
    href: "/shop#package",
    icon: BagIcon,
  },
  {
    title: "Hot buffets",
    body: "Hot mains, a salad and sides for people to help themselves.",
    price: fromMenu("hot-buffet"),
    href: "/menu#hot-buffet",
    icon: UtensilsIcon,
  },
  {
    title: "Receptions",
    body: "Six canapés a guest, passed round a standing event.",
    price: fromPerGuest("canapes-per-head"),
    href: "/shop#package",
    icon: SparklesIcon,
  },
  {
    title: "Dinners",
    body: "Three courses to the table, for a seated celebration.",
    price: fromPerGuest("plated-per-head"),
    href: "/quote?package=unsure",
    icon: CalendarIcon,
  },
];

const steps: { title: string; body: string; icon: Icon }[] = [
  { title: "Choose", body: "Order online in minutes, or ask for a quote.", icon: BookIcon },
  { title: "We confirm", body: "Date, numbers and dietary needs. Nothing charged before.", icon: CheckCircleIcon },
  { title: "We deliver", body: "Labelled, on platters, ready to serve.", icon: TruckIcon },
];

export default async function Home() {
  const products = await getAvailableProducts();
  const platters = products.filter((product) => product.category === "sandwich");

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* ------------------------------------------------------------ hero */}
      <Container>
        <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-xs">
              <MapPinIcon className="size-3.5 text-accent" />
              Delivering across {business.serviceArea}
            </span>
            <h1 className="mt-5 font-display text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl">
              Catering for lunches, meetings and events
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-ink-muted">
              Made to order, delivered ready to serve. Order online or tell us about your event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={button("primary", "lg")}>
                Order online
                <ArrowRightIcon className={nudgeClass} />
              </Link>
              <Link href="/quote" className={button("secondary", "lg")}>
                Plan an event
              </Link>
            </div>
            <FactChips
              className="mt-8"
              facts={[
                { label: "Smallest order", value: `From ${smallestOnlineOrder} people`, icon: UsersIcon },
                { label: "Price", value: `From ${lowestPricePerGuest} a guest`, icon: BagIcon },
                { label: "Payment", value: "Nothing charged until confirmed", icon: CheckCircleIcon },
              ]}
            />
          </div>

          {/* First on a phone: on a caterer's site the food is the pitch. */}
          <div className="relative order-first aspect-[4/3] animate-fade-in overflow-hidden rounded-2xl bg-raised shadow-md lg:order-none lg:aspect-[5/6]">
            <Image
              src="/images/gathered-table-hero.png"
              alt="A catered table with sandwiches on bakery bread, a tomato and mozzarella salad, olives and grilled vegetables"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      </Container>

      {/* ------------------------------------------------------- occasions */}
      <Container>
        <section aria-labelledby="occasions-title">
          <h2 id="occasions-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" {...reveal()}>
            What are you planning?
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {occasions.map((occasion, index) => (
              <li key={occasion.title} {...reveal(index)}>
                <Link href={occasion.href} className={cx(interactiveCardClass, "group flex h-full flex-col p-5")}>
                  <IconTile icon={occasion.icon} />
                  <h3 className="mt-4 font-semibold text-ink">{occasion.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-ink-muted">{occasion.body}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{occasion.price ?? "Quoted for you"}</span>
                    <ArrowRightIcon className={cx(nudgeClass, "text-ink-subtle group-hover:text-accent")} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      {/* ----------------------------------------------- sandwich platters */}
      {platters.length > 0 ? (
        <Container>
          <section aria-labelledby="platters-title">
            <div className="flex items-end justify-between gap-4" {...reveal()}>
              <div>
                <h2 id="platters-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Sandwich platters
                </h2>
                <p className="mt-1 text-sm text-ink-muted">Our most ordered lunch, made the morning of delivery.</p>
              </div>
              <Link href="/shop#sandwich" className={textLinkClass}>
                See all <ArrowRightIcon className={nudgeClass} />
              </Link>
            </div>

            {/* A row that scrolls sideways on a phone rather than a tall stack.
                Positioned, so nothing absolutely placed inside escapes its clip. */}
            <ul className="relative -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
              {platters.map((product, index) => (
                <li key={product.slug} className={cx(cardClass, "flex w-[80%] shrink-0 snap-start flex-col overflow-hidden sm:w-auto")} {...reveal(index)}>
                  {product.image ? (
                    <div className="relative aspect-[4/3] bg-raised">
                      <Image
                        src={product.image}
                        alt={product.imageAlt ?? product.name}
                        fill
                        sizes="(min-width: 640px) 30vw, 80vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-snug text-ink">
                        {product.name} <DietaryMarks tags={product.dietary} />
                      </h3>
                      <p className="shrink-0 text-right text-sm">
                        <span className="block font-semibold text-ink">{formatMoney(product.priceMinor)}</span>
                        <span className="text-xs text-ink-subtle">{unitLabel(product)}</span>
                      </p>
                    </div>
                    <p className="mt-1 flex-1 text-xs text-ink-subtle">From {product.minQuantity}</p>
                    <div className="mt-4">
                      <AddToCart
                        slug={product.slug}
                        min={product.minQuantity}
                        withQuantity={false}
                        label={`Add ${product.minQuantity}`}
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

      {/* ---------------------------------------------------- how it works */}
      <Container>
        <section aria-labelledby="how-title" className={cx(cardClass, "p-6 sm:p-10")} {...reveal()}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="how-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <Link href="/about" className={textLinkClass}>
              The details <ArrowRightIcon className={nudgeClass} />
            </Link>
          </div>
          <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 sm:flex-col sm:gap-3" {...reveal(index)}>
                <IconTile icon={step.icon} />
                <div>
                  <h3 className="font-semibold text-ink">
                    <span className="text-ink-subtle tabular-nums">{index + 1}.</span> {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </Container>

      {/* ---------------------------------------------------- event menus */}
      <Container>
        <section aria-labelledby="menus-title" className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-raised shadow-sm" {...reveal()}>
            <Image
              src="/images/catering-sandwich-spread.png"
              alt="Sandwiches, wraps and salads arranged on a buffet table"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div {...reveal(1)}>
            <h2 id="menus-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Menus for events
            </h2>
            <p className="mt-2 text-ink-muted">Cooked to order, with one clear price before anything is booked.</p>
            <ul className={cx(cardClass, "mt-6 divide-y divide-line")}>
              {menu.map((pkg) => (
                <li key={pkg.slug}>
                  <Link
                    href={`/menu#${pkg.slug}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-raised/60"
                  >
                    <span className="font-medium text-ink">{pkg.name}</span>
                    <span className="flex items-center gap-2 text-sm text-ink-muted">
                      {pkg.pricePerPerson === null
                        ? "By the dish"
                        : `From ${formatMoney(Math.round(pkg.pricePerPerson * 100))}`}
                      <ChevronRightIcon className="size-4 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/menu" className={button("secondary")}>
                See the menus
              </Link>
              <Link href="/quote" className={button("ghost")}>
                Get a quote <ArrowRightIcon className={nudgeClass} />
              </Link>
            </div>
          </div>
        </section>
      </Container>

      {/* ----------------------------------------------------------- FAQ */}
      <Container size="narrow">
        <section aria-labelledby="faq-title">
          <div className="text-center" {...reveal()}>
            <h2 id="faq-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Good to know
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Something else?{" "}
              <a href={phoneHref} className="font-semibold text-ink underline-offset-4 hover:underline">
                Call {business.phone}
              </a>
            </p>
          </div>
          <div className="mt-8" {...reveal(1)}>
            <Faq questions={QUESTIONS.slice(0, 4)} />
          </div>
        </section>
      </Container>

      {/* ------------------------------------------------------- closing */}
      <Container>
        <section
          className="flex flex-col gap-6 rounded-2xl bg-ink px-6 py-10 text-on-accent shadow-md sm:px-12 md:flex-row md:items-center md:justify-between"
          {...reveal()}
        >
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Planning something bigger?</h2>
            <p className="mt-2 max-w-md text-on-accent/70">Tell us the date, the numbers and where. We come back with a menu and a price.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/quote" className={button("inverse", "lg")}>
              Plan an event
              <ArrowRightIcon className={nudgeClass} />
            </Link>
            <a
              href={phoneHref}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-on-accent/20 px-6 font-semibold text-on-accent transition-colors hover:bg-on-accent/10"
            >
              <PhoneIcon className="size-4" />
              Call us
            </a>
          </div>
        </section>
      </Container>
    </div>
  );
}
