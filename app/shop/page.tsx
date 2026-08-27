import type { Metadata } from "next";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, inputClass, secondaryButtonClass } from "@/components/ui";
import { getCart } from "@/lib/cart";
import { getAvailableProducts } from "@/lib/catalog";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatMoney, unitLabel } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Order online",
  description: "Order catering for a date, by the head or by the platter.",
};

/**
 * The shop. Ordinary forms posting to Server Actions, so adding to the
 * cart works with no client JavaScript at all.
 */
export default async function ShopPage() {
  // The LIVE catalog: anything taken off sale is simply not here, and any
  // price change is already applied.
  const [cart, products] = await Promise.all([getCart(), getAvailableProducts()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <PageHeader
        eyebrow="Order online"
        title="Order for a date"
        lede="Pick what you need and tell us where it is going. Nothing is charged here: we confirm the date first, then invoice you."
      />

      {cart.count > 0 ? (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-raised px-4 py-3">
          <p className="text-sm text-ink-muted">
            {cart.count} {cart.count === 1 ? "item" : "items"} in your cart,{" "}
            <span className="text-ink">{formatMoney(cart.subtotalMinor)}</span>
          </p>
          <Link href="/cart" className={secondaryButtonClass}>
            Go to cart
          </Link>
        </div>
      ) : null}

      <div className="space-y-12">
        {CATEGORY_ORDER.map((category) => {
          const inCategory = products.filter((p) => p.category === category);
          if (inCategory.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="font-display text-2xl tracking-tight text-ink">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {inCategory.map((product) => (
                  <li
                    key={product.slug}
                    className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 py-5"
                  >
                    <div className="min-w-56 flex-1">
                      <h3 className="font-medium text-ink">{product.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {product.description}
                      </p>
                      <p className="mt-2 text-sm font-medium text-accent-strong">
                        {formatMoney(product.priceMinor)} {unitLabel(product)}
                        {product.minQuantity > 1 ? (
                          <span className="ml-2 font-normal text-ink-subtle">
                            minimum {product.minQuantity}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <form action={addToCartAction} className="flex items-end gap-2">
                      <input type="hidden" name="slug" value={product.slug} />
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`qty-${product.slug}`}
                          className="text-xs font-medium text-ink-muted"
                        >
                          {product.unit === "person" ? "People" : "Quantity"}
                        </label>
                        <input
                          id={`qty-${product.slug}`}
                          name="quantity"
                          type="number"
                          min={1}
                          defaultValue={product.minQuantity}
                          className={`${inputClass} w-24`}
                        />
                      </div>
                      <SubmitButton pendingLabel="Adding..." className={secondaryButtonClass}>
                        Add
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-14 rounded-lg border border-line bg-raised px-6 py-8">
        <h2 className="font-display text-xl text-ink">Not on the list?</h2>
        <p className="mt-2 text-ink-muted">
          Weddings and anything unusual are quoted rather than ordered off a page. Tell us what you
          have in mind.
        </p>
        <Link href="/quote" className={`${secondaryButtonClass} mt-5`}>
          Request a quote
        </Link>
      </div>

      <p className="mt-10 text-xs text-ink-subtle">
        Sample catalog. The items and prices above are stand-ins, set in lib/shop.ts.
      </p>
    </main>
  );
}
