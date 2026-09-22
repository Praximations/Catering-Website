import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Catering catalog",
  description: "Sandwiches, team lunches, buffets, canapes, and plated catering.",
};

export default function MenuPage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
        <div className="flex flex-col justify-between py-2 lg:py-8">
          <div>
            <p className="eyebrow">Our catalog</p>
            <h1 className="mt-5 max-w-xl font-display text-6xl leading-[0.92] tracking-[-0.05em] text-ink sm:text-7xl">
              Food made for <span className="italic text-accent">a full table.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-ink-muted">
              Start with one of our signature formats. We shape the final spread around the season, the venue, and the people eating.
            </p>
          </div>

          <nav aria-label="Catalog sections" className="mt-10 flex flex-wrap gap-2">
            {menu.map((pkg, index) => (
              <a
                key={pkg.slug}
                href={`#${pkg.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:text-accent"
              >
                <span className="text-[0.65rem] text-highlight">0{index + 1}</span>
                {pkg.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem] bg-raised sm:min-h-[36rem]">
          <Image
            src="/images/catering-sandwich-spread.png"
            alt="A colorful catering spread arranged for a group"
            fill
            priority
            sizes="(min-width: 1024px) 56vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-7 pt-28 text-on-accent sm:p-9 sm:pt-36">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-accent/65">Prepared for your date</p>
            <p className="mt-2 max-w-md font-display text-3xl leading-tight">Generous, seasonal, and ready for people to dig in.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-raised/55">
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
          <div className="border-r border-line py-6 pr-5 sm:py-8">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">Event minimum</dt>
            <dd className="mt-2 font-display text-2xl text-ink">{business.minimumGuests} guests</dd>
          </div>
          <div className="py-6 pl-5 sm:border-r sm:border-line sm:py-8 sm:pr-5">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">Planning time</dt>
            <dd className="mt-2 font-display text-2xl text-ink">About {business.leadTimeDays} days</dd>
          </div>
          <div className="border-r border-t border-line py-6 pr-5 sm:py-8 lg:border-t-0 lg:pl-5">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">Dietary needs</dt>
            <dd className="mt-2 font-display text-2xl text-ink">Clearly labeled</dd>
          </div>
          <div className="border-t border-line py-6 pl-5 sm:py-8 lg:border-t-0">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">Ordering</dt>
            <dd className="mt-2 font-display text-2xl text-ink">Online or custom</dd>
          </div>
        </dl>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-7 px-5 py-16 sm:px-8 sm:py-24">
        {menu.map((pkg, index) => (
          <section
            key={pkg.slug}
            id={pkg.slug}
            className={`scroll-mt-28 overflow-hidden rounded-[2rem] border border-line p-6 sm:p-9 lg:p-12 ${
              index % 2 === 0 ? "bg-raised/65" : "bg-surface"
            }`}
          >
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
              <div className="lg:pr-6">
                <div className="flex items-center justify-between gap-5">
                  <span className="grid size-12 place-items-center rounded-full border border-accent/20 text-xs font-bold text-highlight">0{index + 1}</span>
                  <span className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent">
                    {pkg.pricePerPerson === null ? "Custom quote" : `From $${pkg.pricePerPerson} per guest`}
                  </span>
                </div>
                <h2 className="mt-8 font-display text-4xl leading-tight tracking-[-0.035em] text-ink sm:text-5xl">{pkg.name}</h2>
                <p className="mt-5 max-w-md text-base leading-7 text-ink-muted">{pkg.summary}</p>
                <Link href="/shop" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
                  Order this collection <ArrowIcon className="size-4" />
                </Link>
              </div>

              <div>
                <p className="mb-4 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-highlight">On the table</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {pkg.items.map((item) => (
                    <li key={item.name} className={`rounded-xl border border-line p-5 ${index % 2 === 0 ? "bg-surface" : "bg-raised/55"}`}>
                      <div className="flex flex-wrap items-start gap-2">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-highlight" />
                        <h3 className="font-display text-xl leading-tight text-ink">{item.name}</h3>
                      </div>
                      {item.price ? (
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-accent">{item.price}</p>
                      ) : null}
                      <p className="mt-3 text-sm leading-6 text-ink-muted">{item.description}</p>
                      {item.tags?.length ? (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="px-5 pb-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 rounded-[2rem] bg-accent px-7 py-11 text-on-accent sm:px-11 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-accent/60">Ready when you are</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.025em] sm:text-4xl">Build the table your event needs.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-on-accent/70">Order a ready-made spread online, or get in touch for something custom.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-surface px-6 text-sm font-bold text-accent">Order online <ArrowIcon className="size-4" /></Link>
            <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full border border-on-accent/25 px-6 text-sm font-bold text-on-accent hover:bg-on-accent/10">Talk to us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
