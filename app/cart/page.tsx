import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCartAction, setQuantityAction } from "@/app/actions/cart";
import { SubmitButton } from "@/components/submit-button";
import { Alert, EmptyState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { belowMinimum, getCart } from "@/lib/cart";
import { formatMoney, quantityLabel, unitLabel } from "@/lib/shop";
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
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <PageHeader eyebrow="Cart" title="Your cart" />
        <EmptyState title="Nothing in the cart yet.">
          <p>Everything we deliver by the head or by the platter is on the order page.</p>
          <Link href="/shop" className={`${buttonClass} mt-5`}>
            Start an order
          </Link>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <PageHeader eyebrow="Cart" title="Your cart" />

      <ul className="divide-y divide-line border-y border-line">
        {cart.lines.map((line) => (
          <li key={line.product.slug} className="py-5">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
              <div className="min-w-48 flex-1">
                <h2 className="font-medium text-ink">{line.product.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {formatMoney(line.product.priceMinor)} {unitLabel(line.product)},{" "}
                  {quantityLabel(line.product, line.quantity)}
                </p>
              </div>
              <p className="font-medium text-ink">{formatMoney(line.lineTotalMinor)}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <form action={setQuantityAction} className="flex items-end gap-2">
                <input type="hidden" name="slug" value={line.product.slug} />
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`cart-qty-${line.product.slug}`}
                    className="text-xs font-medium text-ink-muted"
                  >
                    {line.product.unit === "person" ? "People" : "Quantity"}
                  </label>
                  <input
                    id={`cart-qty-${line.product.slug}`}
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={line.quantity}
                    className={`${inputClass} w-24`}
                  />
                </div>
                <SubmitButton
                  pendingLabel="Saving..."
                  className="pb-2.5 text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  Update
                </SubmitButton>
              </form>

              <form action={removeFromCartAction}>
                <input type="hidden" name="slug" value={line.product.slug} />
                <SubmitButton
                  pendingLabel="Removing..."
                  className="pb-2.5 text-sm text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
                >
                  Remove
                </SubmitButton>
              </form>
            </div>

            {line.quantity < line.product.minQuantity ? (
              <p className="mt-3 text-xs text-accent-strong">
                Minimum for this is {line.product.minQuantity}.
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between border-b border-line pb-6">
        <p className="font-medium text-ink">Total</p>
        <p className="font-display text-xl text-ink">{formatMoney(cart.subtotalMinor)}</p>
      </div>
      <p className="mt-2 text-xs text-ink-subtle">
        Before tax and any travel, which we confirm with you before invoicing.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-tight text-ink">Where and when</h2>

        {short.length > 0 ? (
          <div className="mt-5">
            <Alert tone="error" title="One line is under its minimum.">
              <p>
                {short.map((line) => line.product.name).join(", ")}. Adjust the quantity above and
                the order will go through.
              </p>
            </Alert>
          </div>
        ) : null}

        <div className="mt-6">
          <CheckoutForm
            minDate={minDate}
            defaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
            total={formatMoney(cart.subtotalMinor)}
          />
        </div>
      </section>
    </main>
  );
}
