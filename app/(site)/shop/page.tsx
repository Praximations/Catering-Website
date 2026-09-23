import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AddToCart } from "@/components/add-to-cart";
import { CartSidebar } from "@/components/cart-sidebar";
import { CategoryNav } from "@/components/category-nav";
import { DietaryLegend, DietaryMarks } from "@/components/dietary";
import { ArrowRightIcon, BagIcon, CheckCircleIcon, MapPinIcon, UsersIcon } from "@/components/icons";
import { button, cardClass, Container, cx, FactChips, nudgeClass, PageHeader, reveal, textLinkClass } from "@/components/ui";
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
 * Order online. Chips to jump between sections, compact cards with a
 * quantity stepper, and the running order beside them on a wide screen or a
 * pill above the dock on a phone. Prices shown here are for reading only: the
 * server prices the basket from the catalog.
 */
export default async function ShopPage() {
  const [cart, products] = await Promise.all([getCart(), getAvailableProducts()]);
  const categories = CATEGORY_ORDER.filter((category) => products.some((product) => product.category === category));

  return (
    <Container className={cart.count > 0 ? "pb-24 xl:pb-0" : ""}>
      <PageHeader title="Order online" lede="Pick what you need, choose a date, and we confirm before anything is charged." />

      <FactChips
        facts={[
          { label: "Lunches", value: `From ${smallestOnlineOrder} people`, icon: UsersIcon },
          { label: "Platters", value: `From ${sandwichMinimum} sandwiches`, icon: BagIcon },
          { label: "Payment", value: "After we confirm", icon: CheckCircleIcon },
          { label: "Delivery", value: serviceArea, icon: MapPinIcon },
        ]}
      />

      <CategoryNav
        className="mt-6"
        label="Order sections"
        items={categories.map((category) => ({ id: category, label: CATEGORY_LABELS[category] }))}
      />
      <DietaryLegend className="mt-3" />

      <div className="mt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
        <div className="space-y-14">
          {categories.map((category) => {
            const inCategory = products.filter((product) => product.category === category);
            return (
              <section key={category} id={category} aria-labelledby={`${category}-title`}>
                <div {...reveal()}>
                  <h2 id={`${category}-title`} className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                    {CATEGORY_LABELS[category]}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{CATEGORY_DESCRIPTIONS[category]}</p>
                </div>

                <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {inCategory.map((product, index) => (
                    <li key={product.slug} className={cx(cardClass, "flex flex-col overflow-hidden")} {...reveal(index % 2)}>
                      <div className="flex gap-4 p-4 sm:p-5">
                        {product.image ? (
                          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-raised sm:size-24">
                            <Image
                              src={product.image}
                              alt={product.imageAlt ?? product.name}
                              fill
                              sizes="6rem"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold leading-snug text-ink">
                              {product.name} <DietaryMarks tags={product.dietary} />
                            </h3>
                            <p className="shrink-0 text-right text-sm">
                              <span className="block font-semibold text-ink tabular-nums">{formatMoney(product.priceMinor)}</span>
                              <span className="text-xs text-ink-subtle">{unitLabel(product)}</span>
                            </p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{product.description}</p>
                          <p className="mt-1.5 text-xs text-ink-subtle">
                            {product.minQuantity > 1 ? `From ${product.minQuantity}` : null}
                            {product.minQuantity > 1 && product.serves ? " · " : null}
                            {product.serves ?? null}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto border-t border-line px-4 py-3 sm:px-5">
                        <AddToCart
                          slug={product.slug}
                          min={product.minQuantity}
                          step={product.unit === "sandwich" ? 5 : 1}
                          unitLabel={quantityInputLabel(product)}
                          fullWidth
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <p className="text-sm text-ink-muted" {...reveal()}>
            Hot buffets and event menus are quoted for you.{" "}
            <Link href="/menu" className={textLinkClass}>
              See event menus <ArrowRightIcon className={nudgeClass} />
            </Link>
          </p>
        </div>

        <CartSidebar cart={cart} />
      </div>

      {/* Below xl the sidebar is hidden, so an order in progress floats above
          the dock, where a thumb already is. */}
      {cart.count > 0 ? (
        <div className="fixed inset-x-3 bottom-[5.75rem] z-30 animate-fade-up lg:bottom-4 xl:hidden">
          <Link
            href="/cart"
            className="mx-auto flex max-w-lg items-center justify-between gap-4 rounded-full bg-ink py-2 pr-2 pl-5 text-on-accent shadow-lg transition-transform active:scale-[0.98]"
          >
            <span className="text-sm">
              <span className="font-semibold">
                {cart.count} {cart.count === 1 ? "item" : "items"}
              </span>
              <span className="text-on-accent/70"> · {formatMoney(cart.subtotalMinor)}</span>
            </span>
            <span className={button("inverse", "sm")}>
              Review order <ArrowRightIcon className={nudgeClass} />
            </span>
          </Link>
        </div>
      ) : null}
    </Container>
  );
}
