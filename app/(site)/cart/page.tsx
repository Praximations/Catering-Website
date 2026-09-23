import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCartAction, setQuantityAction } from "@/app/actions/cart";
import { AlertIcon, ArrowLeftIcon, BagIcon, BookIcon, MinusIcon, PlusIcon, XIcon } from "@/components/icons";
import { Stepper } from "@/components/stepper";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cardClass, Container, cx, Disclosure, EmptyState } from "@/components/ui";
import { belowMinimum, getCart, type Cart } from "@/lib/cart";
import { mapsEnabled } from "@/lib/geo";
import { isPaymentConfigured } from "@/lib/payments";
import { getSavedInfo } from "@/lib/saved-info";
import { getCurrentUser } from "@/lib/session";
import { formatMoney, quantityLabel, unitLabel } from "@/lib/shop";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

/**
 * The basket and checkout, on one page. The order summary sits beside the form
 * on a wide screen and folds into one line above it on a phone, where the form
 * is what matters. Prices are computed on the server from the catalog; this
 * page never submits one.
 */
export default async function CartPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);

  if (cart.lines.length === 0) {
    return (
      <Container size="narrow">
        <EmptyState
          icon={BagIcon}
          title="Your order is empty"
          className="mt-6 bg-surface"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/shop" className={button("primary")}>
                Order online
              </Link>
              <Link href="/catalog" className={button("secondary")}>
                <BookIcon className="size-4" />
                Browse the catalog
              </Link>
            </div>
          }
        >
          Add what you need and it will appear here.
        </EmptyState>
      </Container>
    );
  }

  const saved = user ? await getSavedInfo(user.id) : null;
  const short = belowMinimum(cart);
  const today = new Date();
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <Container size="medium">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/shop" className="group inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
            <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Keep shopping
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Check out</h1>
        </div>
        <Stepper steps={["Your order", "Delivery", "Confirmed"]} current={1} className="sm:w-96" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        {/* On a phone the summary folds to one line above the form. */}
        <div className="lg:hidden">
          <Disclosure
            summary={
              <span className="flex items-center gap-2">
                <BagIcon className="size-4 text-accent" />
                {cart.count} {cart.count === 1 ? "item" : "items"}
              </span>
            }
            meta={<span className="font-semibold text-ink tabular-nums">{formatMoney(cart.subtotalMinor)}</span>}
            defaultOpen={short.length > 0}
          >
            <OrderSummaryLines cart={cart} />
          </Disclosure>
        </div>

        <div className="space-y-4">
          {short.length > 0 ? (
            <Alert tone="warning" icon={AlertIcon} title="A quantity is under its minimum">
              {short.map((line) => `${line.product.name} starts at ${line.product.minQuantity}`).join(". ")}.
            </Alert>
          ) : null}
          <CheckoutForm
            minDate={minDate}
            defaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
            savedAddresses={saved?.addresses ?? []}
            signedIn={Boolean(user)}
            total={formatMoney(cart.subtotalMinor)}
            onlinePayment={isPaymentConfigured}
            mapsEnabled={mapsEnabled}
          />
        </div>

        <aside aria-labelledby="summary-title" className={cx(cardClass, "sticky top-24 hidden p-5 lg:block")}>
          <div className="mb-3 flex items-center justify-between">
            <h2 id="summary-title" className="font-display text-lg font-semibold tracking-tight">
              Your order
            </h2>
            <Link href="/shop" className="text-sm font-medium text-accent hover:underline">
              Add more
            </Link>
          </div>
          <OrderSummaryLines cart={cart} />
        </aside>
      </div>
    </Container>
  );
}

/** Each line with a stepper to change it, then the subtotal. */
function OrderSummaryLines({ cart }: { cart: Cart }) {
  return (
    <div>
      <ul className="divide-y divide-line">
        {cart.lines.map((line) => {
          const under = line.quantity < line.product.minQuantity;
          return (
            <li key={line.product.slug} className="py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-ink">{line.product.name}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {formatMoney(line.product.priceMinor)} {unitLabel(line.product)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-ink tabular-nums">{formatMoney(line.lineTotalMinor)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-full border border-line bg-surface">
                  <form action={setQuantityAction}>
                    <input type="hidden" name="slug" value={line.product.slug} />
                    <input type="hidden" name="quantity" value={Math.max(line.quantity - 1, 1)} />
                    <SubmitButton
                      pendingLabel=""
                      className="grid size-8 place-items-center rounded-full text-ink-muted hover:text-ink active:scale-90 disabled:opacity-40"
                    >
                      <MinusIcon className="size-3.5" />
                      <span className="sr-only">One fewer</span>
                    </SubmitButton>
                  </form>
                  <span className={cx("min-w-16 text-center text-xs font-medium tabular-nums", under ? "text-warning" : "text-ink")}>
                    {quantityLabel(line.product, line.quantity)}
                  </span>
                  <form action={setQuantityAction}>
                    <input type="hidden" name="slug" value={line.product.slug} />
                    <input type="hidden" name="quantity" value={line.quantity + 1} />
                    <SubmitButton
                      pendingLabel=""
                      className="grid size-8 place-items-center rounded-full text-ink-muted hover:text-ink active:scale-90"
                    >
                      <PlusIcon className="size-3.5" />
                      <span className="sr-only">One more</span>
                    </SubmitButton>
                  </form>
                </div>
                <form action={removeFromCartAction}>
                  <input type="hidden" name="slug" value={line.product.slug} />
                  <SubmitButton
                    pendingLabel=""
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <XIcon className="size-3.5" />
                    Remove
                  </SubmitButton>
                </form>
              </div>
              {under ? (
                <p className="mt-1.5 text-xs font-medium text-warning">Minimum {line.product.minQuantity}.</p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm text-ink-muted">Subtotal</span>
        <span className="text-lg font-semibold text-ink tabular-nums">{formatMoney(cart.subtotalMinor)}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-subtle">Before tax and delivery, confirmed with you.</p>
    </div>
  );
}
