import type { Metadata } from "next";
import Link from "next/link";
import { reorderAction } from "@/app/actions/account";
import { startPaymentAction } from "@/app/actions/payments";
import { CUSTOMER_STATUS_HELP, formatEventDate, packageLabel, StatusBadge } from "@/components/enquiry";
import { ArrowRightIcon, CalendarIcon, ChevronDownIcon, ReceiptIcon, RepeatIcon, SparklesIcon } from "@/components/icons";
import { OrderLines, OrderStatusBadge, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, EmptyState, nudgeClass, Section, Tabs } from "@/components/ui";
import { listEnquiriesForUser } from "@/lib/enquiries";
import { listOrdersForUser, type CustomerOrder } from "@/lib/orders";
import { isPaymentConfigured } from "@/lib/payments";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

/**
 * Every order, and every event quote asked for, in one place. Each order is a
 * compact row; what was in it opens underneath when wanted.
 */
export default async function AccountOrders({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { view } = await searchParams;
  const [orders, quotes] = await Promise.all([
    listOrdersForUser(user.id, user.email),
    listEnquiriesForUser(user.id, user.email),
  ]);

  const isActive = (order: CustomerOrder) => order.status === "pending" || order.status === "confirmed";
  const showing = view === "past" ? "past" : "active";
  const list = orders
    .filter((order) => (showing === "past" ? !isActive(order) : isActive(order)))
    .sort((a, b) => (showing === "past" ? b.eventDate.localeCompare(a.eventDate) : a.eventDate.localeCompare(b.eventDate)));

  return (
    <div className="space-y-10">
      <Section
        title="Orders"
        action={
          <Tabs
            label="Which orders"
            active={showing === "past" ? "/account/orders?view=past" : "/account/orders"}
            items={[
              { href: "/account/orders", label: "Upcoming", count: orders.filter(isActive).length },
              { href: "/account/orders?view=past", label: "Past", count: orders.filter((o) => !isActive(o)).length },
            ]}
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title={showing === "past" ? "No past orders" : "No upcoming orders"}
            className="bg-surface"
            action={
              <Link href="/shop" className={button("primary")}>
                Order online
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {list.map((order) => (
              <li key={order.id} className={cx(cardClass, "overflow-hidden")}>
                <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-raised text-center">
                    <span className="block text-[0.625rem] font-semibold text-ink-muted uppercase">
                      {new Date(`${order.eventDate}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="-mt-1 block font-display text-lg font-semibold">
                      {new Date(`${order.eventDate}T00:00:00`).getDate()}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{formatEventDate(order.eventDate)}</p>
                    <p className="text-sm text-ink-muted">
                      Order {order.reference} · {order.guests} guests · {formatMoney(order.subtotalMinor, order.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <OrderStatusBadge status={order.status} />
                    <PaymentBadge status={order.paymentStatus} />
                  </div>
                </div>

                <details className="disclosure group border-t border-line">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink sm:px-5">
                    What was ordered
                    <ChevronDownIcon className="disclosure-chevron size-4 transition-transform duration-200" />
                  </summary>
                  <div className="px-4 pb-4 sm:px-5">
                    <OrderLines lines={order.lines} currency={order.currency} />
                  </div>
                </details>

                <div className="flex flex-wrap gap-2 border-t border-line bg-raised/40 px-4 py-3 sm:px-5">
                  <Link href={`/orders/${order.token}`} className={button("secondary", "sm")}>
                    Details <ArrowRightIcon className={nudgeClass} />
                  </Link>
                  {order.paymentStatus === "unpaid" && isPaymentConfigured && order.status !== "cancelled" ? (
                    <form action={startPaymentAction}>
                      <input type="hidden" name="token" value={order.token} />
                      <SubmitButton pendingLabel="Opening" className={button("primary", "sm")}>
                        Pay
                      </SubmitButton>
                    </form>
                  ) : null}
                  {!isActive(order) ? (
                    <form action={reorderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton pendingLabel="Adding" className={button("ghost", "sm")}>
                        <RepeatIcon className="size-4" />
                        Order again
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Event quotes"
        description="Events you have asked us to quote for."
        action={
          <Link href="/quote" className={button("ghost", "sm")}>
            <SparklesIcon className="size-4" />
            New request
          </Link>
        }
      >
        {quotes.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No quote requests" className="bg-surface" />
        ) : (
          <ul className={cx(cardClass, "divide-y divide-line")}>
            {quotes.map((quote) => (
              <li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {formatEventDate(quote.eventDate)} · {quote.guests} guests
                  </p>
                  <p className="text-sm text-ink-muted">
                    {packageLabel(quote.packageSlug)} · {CUSTOMER_STATUS_HELP[quote.status]}
                  </p>
                </div>
                <StatusBadge status={quote.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
