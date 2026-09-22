import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEventDate, formatSentAt } from "@/components/enquiry";
import { OrderLines, OrderStatusBadge } from "@/components/order";
import { PageHeader, buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";
import { ORDER_STATUS_HELP, PAYMENT_STATUS_LABELS, findOrderByToken } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { startPaymentAction } from "@/app/actions/payments";
import { activeProvider } from "@/lib/payments";
import { phoneHref } from "@/lib/facts";
import type { OrderStatus } from "@/lib/db/types";

/**
 * Where an order is, as three steps the customer recognises. Cancelled is not
 * a step: it replaces the tracker rather than appearing as a fourth stop.
 */
const PROGRESS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "fulfilled", label: "Delivered" },
];

function OrderProgress({ status }: { status: OrderStatus }) {
  const reached = PROGRESS.findIndex((step) => step.status === status);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Order progress">
      {PROGRESS.map((step, index) => {
        const done = index <= reached;
        return (
          <li key={step.status} aria-current={index === reached ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${done ? "bg-accent" : "bg-line"}`} />
            <span className={`mt-2 block text-xs font-medium ${done ? "text-ink" : "text-ink-subtle"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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

  const provider = activeProvider();
  const canPayOnline = Boolean(provider) && order.paymentStatus === "unpaid" && order.status !== "cancelled";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <PageHeader
        title="Thank you, your order is in"
        lede={
          <>
            Order reference <strong className="font-semibold text-ink">{order.reference}</strong>.{" "}
            {canPayOnline
              ? "We will check the date and confirm it with you. You can pay online now, or leave it until we have been in touch."
              : "We will check the date and confirm it with you."}
          </>
        }
      />

      {/* The redirect back from the provider is NOT proof of payment: anybody
          can open that URL. So this says the payment is being confirmed, and
          only the webhook, through paymentStatus, ever says it is paid. */}
      {payment === "success" && order.paymentStatus !== "paid" ? (
        <div className="mb-6 rounded-md border border-accent/30 bg-accent/5 px-5 py-4 text-sm text-accent-strong">
          Thank you. Your payment is being confirmed, and this page will show it as paid once it has
          cleared.
        </div>
      ) : payment === "cancelled" ? (
        <div className="mb-6 rounded-md border border-line bg-raised px-5 py-4 text-sm text-ink-muted">
          Payment was cancelled. Your order is still saved and you can try again below.
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-surface p-6">
        {order.status === "cancelled" ? (
          <OrderStatusBadge status={order.status} />
        ) : (
          <OrderProgress status={order.status} />
        )}

        <div className="mt-6 border-t border-line pt-5">
          <p className="font-display text-xl text-ink">{formatEventDate(order.eventDate)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {order.guests} {order.guests === 1 ? "guest" : "guests"} &middot; delivering to {order.address}
          </p>
        </div>

        <OrderLines lines={order.lines} currency={order.currency} />

        <div className="mt-4 flex justify-between border-t border-line pt-4">
          <p className="text-ink-muted">Total</p>
          <p className="text-xl font-semibold text-ink">{formatMoney(order.subtotalMinor, order.currency)}</p>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-muted">Payment</span>
          <span className={`font-semibold ${order.paymentStatus === "paid" ? "text-accent" : "text-ink"}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">
          Before tax and any delivery charge, which we confirm with you separately.
        </p>

        {order.notes ? (
          <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-muted">
            <span className="text-ink-subtle">Your notes: </span>
            {order.notes}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-ink-muted">{ORDER_STATUS_HELP[order.status]}</p>
        <p className="mt-3 text-xs text-ink-subtle">Placed {formatSentAt(order.createdAt)}</p>
      </div>

      {canPayOnline && provider ? (
        <div className="mt-6 flex flex-col gap-4 rounded-md border border-line p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl text-ink">Pay online</p>
            {/* The provider's own name, from the registry, so this page never
                names a payment company itself. */}
            <p className="mt-1 text-sm text-ink-muted">Secure payment through {provider.label}.</p>
          </div>
          <form action={startPaymentAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={buttonClass}>
              Pay {formatMoney(order.subtotalMinor, order.currency)}
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
          Something wrong? Call us on{" "}
          <a href={phoneHref} className="font-semibold text-ink underline underline-offset-4">
            {business.phone}
          </a>{" "}
          and quote order {order.reference}.
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
