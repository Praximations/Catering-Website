import Link from "next/link";
import { removeFromCartAction } from "@/app/actions/cart";
import type { Cart } from "@/lib/cart";
import { formatMoney, quantityLabel } from "@/lib/shop";
import { ArrowIcon, OrderIcon } from "./icons";
import { SubmitButton } from "./submit-button";

export function CartSidebar({ cart }: { cart: Cart }) {
  return (
    <aside className="sticky top-28 hidden self-start overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-lg xl:block">
      <div className="flex items-center justify-between bg-ink px-5 py-4 text-on-accent">
        <div className="flex items-center gap-2.5">
          <OrderIcon className="size-4" />
          <h2 className="font-display text-xl">Your basket</h2>
        </div>
        <span className="grid min-w-6 place-items-center rounded-full bg-surface/15 px-1.5 py-0.5 text-xs font-bold">
          {cart.count}
        </span>
      </div>

      {cart.lines.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-semibold text-ink">Your basket is empty.</p>
          <p className="mt-2 text-xs leading-5 text-ink-subtle">Add an item and it will appear here.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[24rem] divide-y divide-line overflow-y-auto px-5">
            {cart.lines.map((line) => (
              <li key={line.product.slug} className="py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-5 text-ink">{line.product.name}</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {quantityLabel(line.product, line.quantity)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink">
                    {formatMoney(line.lineTotalMinor)}
                  </p>
                </div>
                <form action={removeFromCartAction} className="mt-2">
                  <input type="hidden" name="slug" value={line.product.slug} />
                  <SubmitButton pendingLabel="Removing..." className="text-xs font-medium text-ink-subtle hover:text-highlight">
                    Remove
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <div className="border-t border-line bg-raised/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <strong className="font-display text-xl text-ink">{formatMoney(cart.subtotalMinor)}</strong>
            </div>
            <Link href="/cart" className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-on-accent">
              View full order <ArrowIcon className="size-4" />
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}
