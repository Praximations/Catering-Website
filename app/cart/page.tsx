import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCartAction, setQuantityAction } from "@/app/actions/cart";
import { SubmitButton } from "@/components/submit-button";
import { Alert, EmptyState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { belowMinimum, getCart } from "@/lib/cart";
import { formatMoney, quantityInputLabel, quantityLabel, unitLabel } from "@/lib/shop";
import { getCurrentUser } from "@/lib/session";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Your cart",
};

export default async function CartPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);
  const short = belowMinimum(cart);

  const today = new Date();
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-6">
        <PageHeader eyebrow="Order" title="Your cart" />
        <EmptyState title="Your cart is empty.">
          <p>Choose something from the catalog to get started.</p>
          <Link href="/shop" className={`${buttonClass} mt-5`}>
            Open catalog
          </Link>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow="Checkout"
        title="Finish your order."
        lede="Review your selections and add the delivery details."
      />

      <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <section aria-labelledby="order-summary-title" className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h2 id="order-summary-title" className="font-display text-2xl text-ink">
              Order summary
            </h2>
            <Link href="/shop" className="text-sm font-semibold text-accent-strong hover:text-accent">
              Back to catalog
            </Link>
          </div>

          <ul className="divide-y divide-line">
            {cart.lines.map((line) => (
              <li key={line.product.slug} className="py-5">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink">{line.product.name}</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatMoney(line.product.priceMinor)} {unitLabel(line.product)} ·{" "}
                      {quantityLabel(line.product, line.quantity)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-ink">
                    {formatMoney(line.lineTotalMinor)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <form action={setQuantityAction} className="flex items-end gap-2">
                    <input type="hidden" name="slug" value={line.product.slug} />
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`cart-qty-${line.product.slug}`}
                        className="text-xs font-semibold text-ink-muted"
                      >
                        {quantityInputLabel(line.product)}
                      </label>
                      <input
                        id={`cart-qty-${line.product.slug}`}
                        name="quantity"
                        type="number"
                        min={line.product.minQuantity}
                        defaultValue={line.quantity}
                        required
                        className={`${inputClass} w-28`}
                      />
                    </div>
                    <SubmitButton
                      pendingLabel="Saving..."
                      className="min-h-11 rounded-md px-3 text-sm font-semibold text-accent-strong hover:bg-raised"
                    >
                      Update
                    </SubmitButton>
                  </form>

                  <form action={removeFromCartAction}>
                    <input type="hidden" name="slug" value={line.product.slug} />
                    <SubmitButton
                      pendingLabel="Removing..."
                      className="min-h-11 px-2 text-sm font-medium text-ink-subtle hover:text-highlight"
                    >
                      Remove
                    </SubmitButton>
                  </form>
                </div>

                {line.quantity < line.product.minQuantity ? (
                  <p className="mt-3 rounded-sm bg-highlight-soft px-3 py-2 text-xs font-medium text-highlight">
                    This selection requires at least {line.product.minQuantity}.
                  </p>
                ) : line.product.minQuantity > 1 ? (
                  <p className="mt-2 text-xs text-ink-subtle">
                    Minimum quantity: {line.product.minQuantity}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex items-end justify-between border-t border-line pt-5">
            <div>
              <p className="font-semibold text-ink">Estimated subtotal</p>
              <p className="mt-1 text-xs text-ink-subtle">Before tax and confirmed travel.</p>
            </div>
            <p className="font-display text-2xl text-ink">{formatMoney(cart.subtotalMinor)}</p>
          </div>
        </section>

        <section aria-labelledby="delivery-title" className="rounded-[1.5rem] bg-raised/70 p-5 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">
              Delivery details
            </p>
            <h2 id="delivery-title" className="mt-2 font-display text-3xl tracking-tight text-ink">
              Where and when
            </h2>
          </div>

          {short.length > 0 ? (
            <div className="mt-6">
              <Alert tone="error" title="A quantity is under its minimum.">
                <p>
                  {short.map((line) => line.product.name).join(", ")}. Update the quantity before
                  placing the order.
                </p>
              </Alert>
            </div>
          ) : null}

          <div className="mt-7">
            <CheckoutForm
              minDate={minDate}
              defaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
              total={formatMoney(cart.subtotalMinor)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
