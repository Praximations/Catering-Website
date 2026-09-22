import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { CartSidebar } from "@/components/cart-sidebar";
import { DietaryLegend, DietaryMarks } from "@/components/dietary";
import { ArrowIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { FactList, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { getCart } from "@/lib/cart";
import { getAvailableProducts } from "@/lib/catalog";
import { sandwichMinimum, serviceArea, smallestOnlineOrder } from "@/lib/facts";
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
  description: "Sandwich platters, office lunches, buffets and sharing platters, ordered online for delivery.",
};

/**
 * The online order page, laid out as a menu with an order column rather than
 * as a grid of product cards.
 *
 * A list is how food is read: down the page, name then price. It keeps every
 * item the same shape whether or not it has a photo, and it never leaves one
 * orphaned card on a row of its own.
 */
export default async function ShopPage() {
  const [cart, products] = await Promise.all([getCart(), getAvailableProducts()]);
  const hasOrder = cart.count > 0;

  return (
    <main className={`mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-16 ${hasOrder ? "pb-28 xl:pb-16" : ""}`}>
      <PageHeader
        title="Order catering online"
        lede="Choose what you need, pick a date and check out. We confirm every order with you before anything is charged."
      />

      <FactList
        className="border-y border-line py-5 sm:py-6"
        facts={[
          { label: "Office lunches", value: `From ${smallestOnlineOrder} people` },
          { label: "Sandwich platters", value: `From ${sandwichMinimum} sandwiches` },
          { label: "Payment", value: "After we confirm your date" },
          { label: "Delivering to", value: serviceArea },
        ]}
      />

      <nav
        aria-label="Order categories"
        className="mt-8 flex gap-6 overflow-x-auto border-b border-line text-sm"
      >
        {CATEGORY_ORDER.map((category) =>
          products.some((product) => product.category === category) ? (
            <a
              key={category}
              href={`#${category}`}
              className="-mb-px shrink-0 border-b-2 border-transparent pb-3 font-medium text-ink-muted transition-colors hover:border-ink hover:text-ink"
            >
              {CATEGORY_LABELS[category]}
            </a>
          ) : null
        )}
      </nav>

      <DietaryLegend className="mt-5" />

      <div className="mt-10 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
        <div className="space-y-16">
          {CATEGORY_ORDER.map((category) => {
            const inCategory = products.filter((product) => product.category === category);
            if (inCategory.length === 0) return null;

            return (
              <section key={category} id={category} aria-labelledby={`${category}-title`}>
                <h2 id={`${category}-title`} className="font-display text-3xl tracking-tight text-ink">
                  {CATEGORY_LABELS[category]}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>

                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {inCategory.map((product) => {
                    const detailsId = `details-${product.slug}`;
                    return (
                      <li
                        key={product.slug}
                        className="grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_15rem] sm:gap-8"
                      >
                        <div className="flex gap-4 sm:gap-5">
                          {product.image ? (
                            <div className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-raised sm:size-32">
                              <Image
                                src={product.image}
                                alt={product.imageAlt ?? product.name}
                                fill
                                sizes="8rem"
                                className="object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <h3 className="font-display text-xl leading-snug text-ink">
                              {product.name} <DietaryMarks tags={product.dietary} />
                            </h3>
                            <p className="mt-1.5 text-sm leading-6 text-ink-muted">{product.description}</p>
                            <p id={detailsId} className="mt-2 text-xs text-ink-muted">
                              {product.minQuantity > 1 ? `Minimum ${product.minQuantity}. ` : ""}
                              {product.serves ? `${product.serves}.` : ""}
                            </p>
                          </div>
                        </div>

                        <form action={addToCartAction} className="flex flex-col gap-3">
                          <input type="hidden" name="slug" value={product.slug} />
                          <p className="text-ink">
                            <span className="font-semibold">{formatMoney(product.priceMinor)}</span>{" "}
                            <span className="text-sm text-ink-muted">{unitLabel(product)}</span>
                          </p>
                          <div className="flex items-end gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <label htmlFor={`qty-${product.slug}`} className="text-xs text-ink-muted">
                                {quantityInputLabel(product)}
                              </label>
                              <input
                                id={`qty-${product.slug}`}
                                name="quantity"
                                type="number"
                                inputMode="numeric"
                                min={product.minQuantity}
                                defaultValue={product.minQuantity}
                                required
                                aria-describedby={detailsId}
                                className={inputClass}
                              />
                            </div>
                            <SubmitButton pendingLabel="Adding..." className={buttonClass}>
                              Add
                            </SubmitButton>
                          </div>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <p className="text-sm text-ink-muted">
            Looking for a hot buffet or something made for your event?{" "}
            <Link href="/menu" className="font-semibold text-accent underline-offset-4 hover:underline">
              See the event menus
            </Link>
            .
          </p>
        </div>

        <CartSidebar cart={cart} />
      </div>

      {/* Below xl the basket sidebar is hidden, so an order in progress needs
          another way back to it. A bar at the bottom of the screen is where a
          thumb already is on a phone. */}
      {hasOrder ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <p className="text-sm text-ink">
              <span className="font-semibold">
                {cart.count} {cart.count === 1 ? "item" : "items"}
              </span>{" "}
              <span className="text-ink-muted">· {formatMoney(cart.subtotalMinor)}</span>
            </p>
            <Link href="/cart" className={buttonClass}>
              Review order <ArrowIcon className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
