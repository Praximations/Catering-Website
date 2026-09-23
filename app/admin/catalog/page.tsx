import type { Metadata } from "next";
import Image from "next/image";
import { clearOverrideAction, setAvailabilityAction } from "@/app/actions/owner";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, PageHeader, Pill, Section } from "@/components/ui";
import { business } from "@/lib/business";
import { getAllProducts } from "@/lib/catalog";
import { requireOwner } from "@/lib/session";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatMoney, unitLabel } from "@/lib/shop";
import { PriceForm } from "./price-form";

export const metadata: Metadata = {
  title: "Catalog",
};

/**
 * What can be ordered online, with the two changes the owner makes most:
 * taking something off sale for a while, and changing its price. Both are
 * overrides on top of lib/shop.ts, which stays the source of what exists, so
 * "Reset" always puts an item back exactly as the file has it.
 */
export default async function OwnerCatalog() {
  await requireOwner();
  const products = await getAllProducts();
  const symbol =
    new Intl.NumberFormat(business.locale, { style: "currency", currency: business.currency.toUpperCase() })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? "";

  return (
    <div>
      <PageHeader
        title="Catalog"
        lede="Take items off sale or change a price. Prices stay within three times the listed price, to catch a slipped decimal point."
      />

      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const items = products.filter((product) => product.category === category);
          if (items.length === 0) return null;
          return (
            <Section key={category} title={CATEGORY_LABELS[category]}>
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {items.map((product) => (
                  <li key={product.slug} className={cx("flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5", !product.available && "bg-raised/50")}>
                    {product.image ? (
                      <div className={cx("relative size-12 shrink-0 overflow-hidden rounded-lg bg-raised", !product.available && "opacity-50 grayscale")}>
                        <Image src={product.image} alt="" fill sizes="3rem" className="object-cover" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className={cx("font-medium", product.available ? "text-ink" : "text-ink-muted")}>{product.name}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
                        {unitLabel(product)} · from {product.minQuantity}
                        {product.priceOverridden ? (
                          <Pill tone="info" className="h-5 text-[0.6875rem]">
                            Listed {formatMoney(product.basePriceMinor)}
                          </Pill>
                        ) : null}
                        {!product.available ? (
                          <Pill tone="muted" className="h-5 text-[0.6875rem]">
                            Off sale
                          </Pill>
                        ) : null}
                      </p>
                    </div>

                    <PriceForm slug={product.slug} priceMinor={product.priceMinor} symbol={symbol} />

                    <div className="flex items-center gap-1">
                      <form action={setAvailabilityAction}>
                        <input type="hidden" name="slug" value={product.slug} />
                        <input type="hidden" name="available" value={product.available ? "false" : "true"} />
                        {/* A switch that says what it is now and flips on press. */}
                        <SubmitButton
                          pendingLabel=""
                          className={cx(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                            product.available ? "bg-accent" : "bg-sunken"
                          )}
                        >
                          <span className="sr-only">{product.available ? `Take ${product.name} off sale` : `Put ${product.name} on sale`}</span>
                          <span
                            aria-hidden
                            className={cx(
                              "inline-block size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-soft",
                              product.available ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </SubmitButton>
                      </form>
                      {product.priceOverridden || !product.available ? (
                        <form action={clearOverrideAction}>
                          <input type="hidden" name="slug" value={product.slug} />
                          <SubmitButton pendingLabel="" className={button("ghost", "sm")}>
                            Reset
                          </SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
