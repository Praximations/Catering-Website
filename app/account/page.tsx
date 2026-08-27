import type { Metadata } from "next";
import Link from "next/link";
import {
  CUSTOMER_STATUS_HELP,
  StatusBadge,
  formatEventDate,
  formatSentAt,
  packageLabel,
} from "@/components/enquiry";
import { OrderLines, OrderStatusBadge } from "@/components/order";
import { EmptyState, PageHeader, buttonClass, secondaryButtonClass } from "@/components/ui";
import { listEnquiriesForUser } from "@/lib/enquiries";
import { ORDER_STATUS_HELP, listOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "My account",
};

/**
 * The customer's page: their own orders and enquiries, nothing else.
 *
 * requireUser is called HERE rather than in a layout, because a layout
 * does not necessarily re-run on navigation and so cannot be trusted as
 * the gate. Both queries are scoped to this user as well, so even a
 * mistake here could not return somebody else's rows.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const [orders, enquiries] = await Promise.all([
    listOrdersForUser(user.id, user.email),
    listEnquiriesForUser(user.id, user.email),
  ]);

  const nothingAtAll = orders.length === 0 && enquiries.length === 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <PageHeader
        eyebrow={`Signed in as ${user.email}`}
        title="My account"
        lede="Your orders and enquiries, and where each one stands."
      />

      {nothingAtAll ? (
        <EmptyState title="Nothing here yet.">
          <p>Anything you order or ask us about will show up here.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={buttonClass}>
              Start an order
            </Link>
            <Link href="/quote" className={secondaryButtonClass}>
              Request a quote
            </Link>
          </div>
        </EmptyState>
      ) : null}

      {orders.length > 0 ? (
        <section className="mb-14">
          <h2 className="font-display text-2xl tracking-tight text-ink">Orders</h2>
          <ul className="mt-6 space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-ink">
                      {formatEventDate(order.eventDate)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Order {order.reference} &middot; {order.guests}{" "}
                      {order.guests === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <OrderLines lines={order.lines} />

                <div className="mt-4 flex justify-between border-t border-line pt-4">
                  <p className="text-sm text-ink-muted">Total</p>
                  <p className="font-medium text-ink">{formatMoney(order.subtotalMinor)}</p>
                </div>

                <p className="mt-4 text-sm text-ink-muted">{ORDER_STATUS_HELP[order.status]}</p>
                <p className="mt-3 text-xs text-ink-subtle">
                  Placed {formatSentAt(order.createdAt)} &middot; going to {order.address}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {enquiries.length > 0 ? (
        <section>
          <h2 className="font-display text-2xl tracking-tight text-ink">Enquiries</h2>
          <ul className="mt-6 space-y-4">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-ink">
                      {formatEventDate(enquiry.eventDate)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {enquiry.guests} {enquiry.guests === 1 ? "guest" : "guests"},{" "}
                      {packageLabel(enquiry.packageSlug)}
                    </p>
                  </div>
                  <StatusBadge status={enquiry.status} />
                </div>

                <p className="mt-4 text-sm text-ink-muted">
                  {CUSTOMER_STATUS_HELP[enquiry.status]}
                </p>

                {enquiry.notes ? (
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
                    <span className="text-ink-subtle">What you told us: </span>
                    {enquiry.notes}
                  </p>
                ) : null}

                <p className="mt-4 text-xs text-ink-subtle">
                  Sent {formatSentAt(enquiry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!nothingAtAll ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/shop" className={buttonClass}>
            Order again
          </Link>
          <Link href="/quote" className={secondaryButtonClass}>
            Request a quote
          </Link>
        </div>
      ) : null}
    </main>
  );
}
