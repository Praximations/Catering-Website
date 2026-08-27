import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEventDate, formatSentAt } from "@/components/enquiry";
import { OrderLines, OrderStatusBadge } from "@/components/order";
import { PageHeader, buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { ORDER_STATUS_HELP, findOrderByToken } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Your order",
  // A confirmation is nobody's business but the customer's, and it is
  // reachable by a link, so keep it out of search results.
  robots: { index: false, follow: false },
};

/**
 * The order confirmation, and the page a guest can come back to.
 *
 * Addressed by the order's unguessable token rather than its id or its
 * reference number, so this can be public without letting anyone read the
 * order next to theirs by editing the URL. A wrong token is a plain 404,
 * which also means it does not confirm whether an order exists.
 */
export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  // params is a Promise in this version of Next, and must be awaited.
  const { token } = await params;
  const [order, user] = await Promise.all([findOrderByToken(token), getCurrentUser()]);
  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <PageHeader
        eyebrow="Order confirmed"
        title={`Thank you, order ${order.reference}`}
        lede="We have it. Nothing has been charged: we check the date, confirm by email, and invoice you closer to the day."
      />

      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-ink">{formatEventDate(order.eventDate)}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {order.guests} {order.guests === 1 ? "person" : "people"} &middot; going to{" "}
              {order.address}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <OrderLines lines={order.lines} />

        <div className="mt-4 flex justify-between border-t border-line pt-4">
          <p className="text-ink-muted">Total</p>
          <p className="font-display text-xl text-ink">{formatMoney(order.subtotalMinor)}</p>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Before tax and any travel, which we confirm before invoicing.
        </p>

        {order.notes ? (
          <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
            <span className="text-ink-subtle">What you told us: </span>
            {order.notes}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-ink-muted">{ORDER_STATUS_HELP[order.status]}</p>
        <p className="mt-3 text-xs text-ink-subtle">Placed {formatSentAt(order.createdAt)}</p>
      </div>

      <div className="mt-8 rounded-md border border-line bg-raised px-5 py-4 text-sm text-ink-muted">
        {user ? (
          <p>
            This order is on{" "}
            <Link href="/account" className="text-accent-strong hover:underline">
              your account
            </Link>
            , where you can check its status any time.
          </p>
        ) : (
          <p>
            Keep this link to check back, or{" "}
            <Link href="/signup" className="text-accent-strong hover:underline">
              create an account
            </Link>{" "}
            with {order.email} and it will appear there.
          </p>
        )}
        <p className="mt-2">
          Something wrong? Call us on {business.phone} and quote order {order.reference}.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className={buttonClass}>
          Order something else
        </Link>
        <Link href="/" className={secondaryButtonClass}>
          Back to the site
        </Link>
      </div>
    </main>
  );
}
