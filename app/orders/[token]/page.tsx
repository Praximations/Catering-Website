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
import { startPaymentAction } from "@/app/actions/payments";
import { isPaymentConfigured } from "@/lib/payments";

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
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  // params is a Promise in this version of Next, and must be awaited.
  const { token } = await params;
  const { payment } = await searchParams;
  const [order, user] = await Promise.all([findOrderByToken(token), getCurrentUser()]);
  if (!order) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <PageHeader
        eyebrow="Order received"
        title={`Thank you, order ${order.reference}`}
        lede="We have your order. Pay securely online now, or leave it with us and we will follow up to confirm the details."
      />

      {payment === "success" ? (
        <div className="mb-6 border border-accent/30 bg-accent/5 px-5 py-4 text-sm text-accent-strong">
          Payment received. Your receipt is on its way by email.
        </div>
      ) : payment === "cancelled" ? (
        <div className="mb-6 border border-line bg-raised px-5 py-4 text-sm text-ink-muted">
          Payment was cancelled. Your order is still saved and you can try again below.
        </div>
      ) : null}

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
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="text-ink-muted">Payment</span>
          <span className={`font-semibold ${order.paymentStatus === "paid" ? "text-accent" : "text-highlight"}`}>
            {order.paymentStatus === "paid" ? "Paid online" : "Not paid"}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Before tax and any travel, which we confirm with you separately.
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

      {isPaymentConfigured && order.paymentStatus === "unpaid" && order.status !== "cancelled" ? (
        <div className="mt-6 bg-accent p-6 text-on-accent sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="font-display text-2xl">Pay securely online</p>
            <p className="mt-1 text-sm text-on-accent/70">You will continue to Stripe to complete payment.</p>
          </div>
          <form action={startPaymentAction} className="mt-5 sm:mt-0">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="inline-flex min-h-11 items-center bg-surface px-5 text-sm font-bold text-accent transition-transform hover:-translate-y-0.5">
              Pay {formatMoney(order.subtotalMinor)}
            </button>
          </form>
        </div>
      ) : null}

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
