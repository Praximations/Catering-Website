import Link from "next/link";
import { removeFromCartAction } from "@/app/actions/cart";
import type { Cart } from "@/lib/cart";
import { formatMoney, quantityLabel } from "@/lib/shop";
import { ArrowRightIcon, BagIcon, XIcon } from "./icons";
import { SubmitButton } from "./submit-button";
import { button, cardClass, cx, nudgeClass } from "./ui";

/** The running order beside the catalog. Shown from xl up; below that, a pill. */
export function CartSidebar({ cart }: { cart: Cart }) {
  return (
    <aside aria-labelledby="basket-title" className={cx(cardClass, "sticky top-24 hidden self-start overflow-hidden xl:block")}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 id="basket-title" className="font-display text-lg font-semibold tracking-tight">
          Your order
        </h2>
        {cart.count > 0 ? (
          <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-ink-muted">
            {cart.count} {cart.count === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>

      {cart.lines.length === 0 ? (
        <div className="flex flex-col items-center px-5 pt-4 pb-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-raised text-ink-subtle">
            <BagIcon className="size-5" />
          </span>
          <p className="mt-3 text-sm text-ink-muted">Nothing added yet.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[24rem] divide-y divide-line overflow-y-auto px-5">
            {cart.lines.map((line) => (
              <li key={line.product.slug} className="group flex animate-fade-in items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-ink">{line.product.name}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{quantityLabel(line.product, line.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-ink tabular-nums">{formatMoney(line.lineTotalMinor)}</p>
                  <form action={removeFromCartAction}>
                    <input type="hidden" name="slug" value={line.product.slug} />
                    <SubmitButton
                      pendingLabel=""
                      className="grid size-7 place-items-center rounded-full text-ink-subtle opacity-60 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                    >
                      <XIcon className="size-3.5" />
                      <span className="sr-only">Remove {line.product.name}</span>
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <strong className="text-lg font-semibold text-ink tabular-nums">{formatMoney(cart.subtotalMinor)}</strong>
            </div>
            <p className="mt-0.5 text-xs text-ink-subtle">Before tax and delivery.</p>
            <Link href="/cart" className={cx(button("primary"), "mt-4 w-full")}>
              Check out <ArrowRightIcon className={nudgeClass} />
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
