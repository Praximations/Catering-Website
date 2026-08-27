import Link from "next/link";
import { buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";

/**
 * The home page. One job: say what this kitchen does, and put the quote
 * form one click away. Everything it renders comes from lib/business.ts
 * and lib/menu.ts, so none of the copy is stranded in markup.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <section className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
          {business.serviceArea}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
          {business.tagline}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-muted">{business.blurb}</p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/shop" className={buttonClass}>
            Order online
          </Link>
          <Link href="/quote" className={secondaryButtonClass}>
            Request a quote
          </Link>
        </div>

        <p className="mt-5 text-sm text-ink-subtle">
          Order platters and packages straight from the site, or ask us to quote something bigger.
          We need about {business.leadTimeDays} days notice, and we cook for{" "}
          {business.minimumGuests} people or more.
        </p>
      </section>

      <section className="mt-20 border-t border-line pt-12">
        <h2 className="font-display text-2xl tracking-tight text-ink">How we cook for you</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {menu.map((pkg) => (
            <Link
              key={pkg.slug}
              href={`/menu#${pkg.slug}`}
              className="group rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent"
            >
              <h3 className="font-display text-lg text-ink">{pkg.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{pkg.summary}</p>
              <p className="mt-4 text-sm font-medium text-accent-strong">
                {pkg.pricePerPerson === null
                  ? "Quoted per event"
                  : `From $${pkg.pricePerPerson} a head`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-raised px-6 py-8">
          <h2 className="font-display text-xl text-ink">Know what you want</h2>
          <p className="mt-3 text-ink-muted">
            Order platters and by the head straight from the site. Nothing is charged up front: we
            confirm the date, then invoice.
          </p>
          <Link href="/shop" className={`${buttonClass} mt-6`}>
            Order online
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-raised px-6 py-8">
          <h2 className="font-display text-xl text-ink">Something bigger</h2>
          <p className="mt-3 text-ink-muted">
            Weddings and anything unusual are quoted. Send the date, a rough head count, and
            anything we should know.
          </p>
          <Link href="/quote" className={`${secondaryButtonClass} mt-6`}>
            Request a quote
          </Link>
        </div>
      </section>
    </main>
  );
}
