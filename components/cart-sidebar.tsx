import Link from "next/link";
import { removeFromCartAction } from "@/app/actions/cart";
import type { Cart } from "@/lib/cart";
import { formatMoney, quantityLabel } from "@/lib/shop";
import { buttonClass } from "./ui";
import { SubmitButton } from "./submit-button";

/** The running order beside the catalog. Shown from xl up; below that, a bar. */
export function CartSidebar({ cart }: { cart: Cart }) {
  return (
    <aside
      aria-labelledby="basket-title"
      className="sticky top-24 hidden self-start rounded-md border border-line bg-surface xl:block"
    >
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h2 id="basket-title" className="font-display text-xl text-ink">
          Your order
        </h2>
        {cart.count > 0 ? (
          <span className="text-sm text-ink-muted">
            {cart.count} {cart.count === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>

      {cart.lines.length === 0 ? (
        <p className="px-5 py-8 text-sm leading-6 text-ink-muted">
          Nothing added yet. Choose what you need and it will appear here.
        </p>
      ) : (
        <>
          <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto px-5">
            {cart.lines.map((line) => (
              <li key={line.product.slug} className="py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium leading-5 text-ink">{line.product.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {quantityLabel(line.product, line.quantity)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-ink">
                    {formatMoney(line.lineTotalMinor)}
                  </p>
                </div>
                <form action={removeFromCartAction} className="mt-1.5">
                  <input type="hidden" name="slug" value={line.product.slug} />
                  <SubmitButton
                    pendingLabel="Removing..."
                    className="text-xs text-ink-subtle underline-offset-2 hover:text-highlight hover:underline"
                  >
                    Remove
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <strong className="text-lg font-semibold text-ink">{formatMoney(cart.subtotalMinor)}</strong>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">Before tax and delivery, confirmed with you.</p>
            <Link href="/cart" className={`${buttonClass} mt-4 w-full`}>
              Review and check out
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
