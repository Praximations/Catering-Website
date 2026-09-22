import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { ArrowIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, inputClass } from "@/components/ui";
import { getCart } from "@/lib/cart";
import { getAvailableProducts } from "@/lib/catalog";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatMoney,
  quantityInputLabel,
  unitLabel,
} from "@/lib/shop";

export const metadata: Metadata = {
  title: "Order catering",
  description: "Build a catering order from our current catalog.",
};

export default async function ShopPage() {
  const [cart, products] = await Promise.all([getCart(), getAvailableProducts()]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-8 rounded-[2rem] bg-raised/70 px-6 py-9 sm:px-10 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Order online</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.045em] text-ink sm:text-6xl">
            Build your order.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink-muted">
            Pick your favorites, choose a delivery date, and check out securely.
          </p>
        </div>

        {cart.count > 0 ? (
          <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">Your cart</p>
              <p className="mt-0.5 text-sm text-ink">
                {cart.count} {cart.count === 1 ? "item" : "items"} /{" "}
                <span className="font-semibold">{formatMoney(cart.subtotalMinor)}</span>
              </p>
            </div>
            <Link
              href="/cart"
              className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-on-accent transition-transform hover:-translate-y-0.5"
              aria-label="Review cart"
            >
              <ArrowIcon className="size-4" />
            </Link>
          </div>
        ) : null}
      </header>

      <nav aria-label="Catalog categories" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {CATEGORY_ORDER.map((category) => (
          <a
            key={category}
            href={`#${category}`}
            className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/35 hover:text-accent"
          >
            {CATEGORY_LABELS[category]}
          </a>
        ))}
      </nav>

      <div className="mt-14 space-y-20">
        {CATEGORY_ORDER.map((category) => {
          const inCategory = products.filter((product) => product.category === category);
          if (inCategory.length === 0) return null;

          return (
            <section key={category} id={category} className="scroll-mt-28">
              <div className="grid gap-3 border-b border-line pb-6 sm:grid-cols-[minmax(0,0.7fr)_minmax(16rem,1fr)] sm:items-end">
                <h2 className="font-display text-4xl tracking-[-0.03em] text-ink">
                  {CATEGORY_LABELS[category]}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-ink-muted sm:justify-self-end">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>

              <ul className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {inCategory.map((product) => {
                  const minimumId = `minimum-${product.slug}`;
                  return (
                    <li
                      key={product.slug}
                      className={`group flex min-h-full flex-col overflow-hidden rounded-[1.5rem] border transition-all hover:-translate-y-1 hover:shadow-lg ${
                        category === "sandwich"
                          ? "border-accent/20 bg-raised/70"
                          : "border-line bg-surface"
                      }`}
                    >
                      {product.image ? (
                        <div className="relative aspect-[4/3] overflow-hidden bg-raised">
                          <Image
                            src={product.image}
                            alt={product.imageAlt ?? product.name}
                            fill
                            sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                          />
                          {product.minQuantity > 1 ? (
                            <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur">
                              Minimum {product.minQuantity}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-display text-xl text-ink">{product.name}</h3>
                          <p className="shrink-0 text-right">
                            <strong className="block font-display text-xl text-accent-strong">
                              {formatMoney(product.priceMinor)}
                            </strong>
                            <span className="text-xs text-ink-subtle">{unitLabel(product)}</span>
                          </p>
                        </div>

                        <p className="mt-3 flex-1 text-sm leading-6 text-ink-muted">
                          {product.description}
                        </p>

                        <form action={addToCartAction} className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-line pt-5">
                          <input type="hidden" name="slug" value={product.slug} />
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <label htmlFor={`qty-${product.slug}`} className="text-xs font-semibold text-ink-muted">
                              {quantityInputLabel(product)}
                            </label>
                            <input
                              id={`qty-${product.slug}`}
                              name="quantity"
                              type="number"
                              min={product.minQuantity}
                              defaultValue={product.minQuantity}
                              required
                              aria-describedby={minimumId}
                              className={inputClass}
                            />
                            <span id={minimumId} className="sr-only">Minimum {product.minQuantity}</span>
                          </div>
                          <SubmitButton pendingLabel="Adding..." className={`${buttonClass} min-h-11 rounded-xl px-5`}>
                            Add
                          </SubmitButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {cart.count > 0 ? (
        <section className="mt-20 flex flex-col gap-5 rounded-[2rem] bg-ink px-7 py-8 text-on-accent sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-display text-3xl">Your order is taking shape.</h2>
            <p className="mt-2 text-sm text-on-accent/70">Review delivery details and finish when you are ready.</p>
          </div>
          <Link href="/cart" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-surface px-6 text-sm font-bold text-ink">
            Review cart <ArrowIcon className="size-4" />
          </Link>
        </section>
      ) : null}
    </main>
  );
}
