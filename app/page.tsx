import Image from "next/image";
import Link from "next/link";
import { buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";
import { formatMoney, products } from "@/lib/shop";

const sandwichAssortments = products
  .filter((product) => product.category === "sandwich")
  .slice(0, 3);

export default function Home() {
  return (
    <main>
      <section className="overflow-hidden border-b border-line">
        <div className="mx-auto grid min-h-[calc(100svh-8rem)] w-full max-w-[90rem] lg:grid-cols-[0.87fr_1.13fr]">
          <div className="flex items-center px-5 py-16 sm:px-10 sm:py-24 lg:px-16 xl:px-24">
            <div className="max-w-xl">
              <p className="eyebrow">Gather well</p>
              <h1 className="mt-6 font-display text-[3.55rem] leading-[0.94] tracking-[-0.052em] text-ink sm:text-7xl xl:text-[5.6rem]">
                Good food makes <span className="font-normal italic text-accent">the occasion.</span>
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-ink-muted sm:text-xl">
                {business.blurb}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/shop" className={buttonClass}>
                  Start an order
                </Link>
                <Link href="/menu" className={secondaryButtonClass}>
                  View catalog
                </Link>
              </div>
            </div>
          </div>

          <div className="relative min-h-[31rem] bg-raised lg:min-h-full">
            <Image
              src="/images/gathered-table-hero.png"
              alt="A sunlit catered table with artisan sandwiches, seasonal salads, and shared plates"
              fill
              priority
              sizes="(min-width: 1024px) 57vw, 100vw"
              className="object-cover"
            />
            <div className="absolute bottom-6 left-6 max-w-[15rem] bg-surface/95 p-4 shadow-lg backdrop-blur sm:bottom-8 sm:left-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-highlight">At your table</p>
              <p className="mt-2 font-display text-xl leading-tight text-ink">Seasonal food, prepared to share.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-raised/55">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">The lunch edit</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.035em] text-ink sm:text-5xl">
                Sandwiches worth gathering for.
              </h2>
            </div>
            <Link href="/shop#sandwich" className="text-sm font-bold text-accent hover:text-accent-strong">
              Shop all catering
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {sandwichAssortments.map((product, index) => (
              <Link key={product.slug} href="/shop#sandwich" className="group block">
                <div className={`relative overflow-hidden bg-surface ${index === 1 ? "md:mt-10" : ""}`}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={product.image!}
                      alt={product.imageAlt ?? product.name}
                      fill
                      sizes="(min-width: 768px) 32vw, 100vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-5 p-5 sm:p-6">
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-highlight">Collection 0{index + 1}</p>
                      <h3 className="mt-2 font-display text-2xl leading-tight text-ink">{product.name}</h3>
                    </div>
                    <p className="shrink-0 font-semibold text-accent">
                      {formatMoney(product.priceMinor)}
                      <span className="block text-right text-[0.65rem] font-medium text-ink-subtle">each</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow">The catalog</p>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-[-0.035em] text-ink sm:text-5xl">
            Built around your kind of gathering.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-muted">
            Start with a signature collection or ask us to shape something for your event.
          </p>
          <Link href="/contact" className={`${secondaryButtonClass} mt-7`}>
            Plan something custom
          </Link>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {menu.map((pkg, index) => (
            <Link
              key={pkg.slug}
              href={`/menu#${pkg.slug}`}
              className="group grid gap-4 py-7 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:py-9"
            >
              <span className="text-xs font-bold tracking-[0.14em] text-highlight">0{index + 1}</span>
              <div>
                <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-accent">{pkg.name}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">{pkg.summary}</p>
              </div>
              <p className="text-sm font-semibold text-accent">
                {pkg.pricePerPerson === null ? "Custom quote" : `From $${pkg.pricePerPerson} per guest`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8">
        <div className="mx-auto grid w-full max-w-7xl overflow-hidden bg-accent text-on-accent lg:grid-cols-[1fr_auto]">
          <div className="px-7 py-12 sm:px-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-accent/65">Your date, our table</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
              Tell us who is coming. We will take care of what they eat.
            </h2>
          </div>
          <div className="flex items-center border-t border-on-accent/20 px-7 py-8 lg:border-l lg:border-t-0 lg:px-12">
            <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full bg-surface px-6 text-sm font-bold text-ink shadow-sm transition-transform hover:-translate-y-0.5">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
