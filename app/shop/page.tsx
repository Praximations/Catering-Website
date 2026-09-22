import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, inputClass, secondaryButtonClass } from "@/components/ui";
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
  title: "Order catering online",
  description: "Order sandwich assortments, catering packages, platters, and extras.",
};

export default async function ShopPage() {
  const [cart, products] = await Promise.all([getCart(), getAvailableProducts()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-18">
      <div className="flex flex-col gap-8 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Order online"
          title="Lunch, sorted."
          lede="Choose what you need and reserve your delivery date. Pay securely online after placing the order, or wait for our confirmation."
        />

        {cart.count > 0 ? (
          <div className="flex shrink-0 items-center gap-4 rounded-md bg-raised px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                Your cart
              </p>
              <p className="mt-0.5 text-sm text-ink">
                {cart.count} {cart.count === 1 ? "selection" : "selections"} ·{" "}
                <span className="font-semibold">{formatMoney(cart.subtotalMinor)}</span>
              </p>
            </div>
            <Link href="/cart" className={secondaryButtonClass}>
              Review cart
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-12 space-y-18">
        {CATEGORY_ORDER.map((category) => {
          const inCategory = products.filter((product) => product.category === category);
          if (inCategory.length === 0) return null;

          return (
            <section key={category} id={category} className="scroll-mt-28">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,0.7fr)_minmax(16rem,1fr)] sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">
                    {category === "sandwich" ? "Bulk ordering" : "Catering menu"}
                  </p>
                  <h2 className="mt-2 font-display text-3xl tracking-tight text-ink">
                    {CATEGORY_LABELS[category]}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-ink-muted sm:justify-self-end">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>

              <ul className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {inCategory.map((product) => {
                  const minimumId = `minimum-${product.slug}`;
                  return (
                    <li
                      key={product.slug}
                      className={`flex min-h-full flex-col overflow-hidden rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
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
                            className="object-cover transition-transform duration-500 hover:scale-[1.025]"
                          />
                          <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-semibold text-accent-strong shadow-sm backdrop-blur">
                            50 minimum
                          </span>
                        </div>
                      ) : null}

                      <div className="flex flex-1 flex-col p-5">
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

                        <form action={addToCartAction} className="mt-6 flex items-end gap-2 border-t border-line pt-5">
                          <input type="hidden" name="slug" value={product.slug} />
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <label
                              htmlFor={`qty-${product.slug}`}
                              className="text-xs font-semibold text-ink-muted"
                            >
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
                            <p id={minimumId} className="text-xs text-ink-subtle">
                              Minimum {product.minQuantity}
                            </p>
                          </div>
                          <SubmitButton pendingLabel="Adding..." className={secondaryButtonClass}>
                            Add to cart
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

      <section className="mt-20 flex flex-col gap-6 rounded-lg bg-accent px-7 py-9 text-on-accent sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div>
          <h2 className="font-display text-2xl">Ready when your group is.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-on-accent/75">
            Add your favorites, reserve the date, and choose the payment path that works for you.
          </p>
        </div>
        <Link
          href="/cart"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-accent-strong shadow-sm"
        >
          Review cart
        </Link>
      </section>
    </main>
  );
}
