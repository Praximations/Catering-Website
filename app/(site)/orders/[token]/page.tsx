import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markOrderReadAction, sendOrderMessageAction } from "@/app/actions/messages";
import { startPaymentAction } from "@/app/actions/payments";
import { ClearCheckoutDraft } from "../../cart/clear-draft";
import { formatEventDate, relativeDay } from "@/components/enquiry";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  CreditCardIcon,
  MapPinIcon,
  PhoneIcon,
  ReceiptIcon,
  RepeatIcon,
  UsersIcon,
} from "@/components/icons";
import { AddressMap } from "@/components/map";
import { MarkRead } from "@/components/mark-read";
import { MessageComposer } from "@/components/message-composer";
import { MessageThread } from "@/components/messages";
import { OrderLines, OrderStatusBadge, OrderTimeline, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cardClass, Container, cx, Disclosure, IconTile, nudgeClass } from "@/components/ui";
import { business } from "@/lib/business";
import { phoneHref } from "@/lib/facts";
import { listThreadForOrder } from "@/lib/messages";
import { ORDER_STATUS_HELP, findOrderByToken } from "@/lib/orders";
import { activeProvider } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Your order",
  // Reachable by a link, and nobody's business but the customer's.
  robots: { index: false, follow: false },
};

/**
 * One order: where it is, the facts that matter, and a way to talk about it.
 *
 * Addressed by the order's unguessable token, never its id or reference, so
 * it can be public without letting anyone read the order next to theirs. A
 * wrong token is a plain 404, which also does not confirm an order exists.
 *
 * ORDER OF THINGS: status first (the question everyone arrives with), then
 * when, how many and how much, then paying, then the detail folded away, then
 * the conversation.
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string; placed?: string }>;
}) {
  const { token } = await params;
  const { payment, placed } = await searchParams;
  const [order, user] = await Promise.all([findOrderByToken(token), getCurrentUser()]);
  if (!order) notFound();

  const messages = await listThreadForOrder(order.id);
  const unreadFromUs = messages.some((message) => message.sender === "owner" && !message.readAt);

  const provider = activeProvider();
  const canPayOnline = Boolean(provider) && order.paymentStatus === "unpaid" && order.status !== "cancelled";
  const justPlaced = placed === "1";

  return (
    <Container size="narrow">
      {justPlaced ? <ClearCheckoutDraft /> : null}
      {unreadFromUs ? <MarkRead action={markOrderReadAction} arg={token} /> : null}

      {/* ------------------------------ status ------------------------------ */}
      <section className={cx(cardClass, "overflow-hidden")}>
        <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
          {justPlaced ? (
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 animate-pop place-items-center rounded-full bg-accent text-on-accent shadow-sm">
                <CheckIcon className="size-5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">Thank you, your order is in</p>
                <p className="text-sm text-ink-muted">We check the date and confirm it with you.</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-muted">Order {order.reference}</p>
              <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {formatEventDate(order.eventDate)}
              </h1>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <OrderStatusBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>

          <div className="mt-8">
            {order.status === "cancelled" ? (
              <Alert tone="info">This order was cancelled.</Alert>
            ) : (
              <OrderTimeline status={order.status} />
            )}
          </div>
          <p className="mt-6 text-center text-sm text-ink-muted">{ORDER_STATUS_HELP[order.status]}</p>
        </div>

        {/* The provider's redirect back is NOT proof of payment: anybody can
            open that URL. Only the webhook, through paymentStatus, says paid. */}
        {payment === "success" && order.paymentStatus !== "paid" ? (
          <p className="border-t border-line bg-accent-soft px-5 py-3 text-center text-sm text-accent-strong sm:px-8">
            Thank you. Your payment is being confirmed and will show here once it clears.
          </p>
        ) : payment === "cancelled" ? (
          <p className="border-t border-line bg-raised px-5 py-3 text-center text-sm text-ink-muted sm:px-8">
            Payment was cancelled. Your order is saved; you can pay below.
          </p>
        ) : null}
      </section>

      {/* ------------------------------ the facts ---------------------------- */}
      {/* Two across on a phone, with the total given the full row: a money
          figure is the one value that must never be cut short. */}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "When", value: relativeDay(order.eventDate), icon: CalendarIcon },
          { label: "Guests", value: String(order.guests), icon: UsersIcon },
          { label: "Total", value: formatMoney(order.subtotalMinor, order.currency), icon: ReceiptIcon, wide: true },
        ].map((fact) => (
          <div key={fact.label} className={cx(cardClass, "p-4", fact.wide && "col-span-2 sm:col-span-1")}>
            <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
              <fact.icon className="size-3.5" />
              {fact.label}
            </dt>
            <dd className="mt-1 truncate font-display text-lg font-semibold tracking-tight tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/* -------------------------------- pay -------------------------------- */}
      {canPayOnline && provider ? (
        <section className={cx(cardClass, "mt-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8")}>
          <div className="flex items-center gap-3">
            <IconTile icon={CreditCardIcon} />
            <div>
              <p className="font-semibold">Pay online</p>
              {/* The provider's own name, from the registry. */}
              <p className="text-sm text-ink-muted">Securely through {provider.label}.</p>
            </div>
          </div>
          <form action={startPaymentAction}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton pendingLabel="Opening payment" className={cx(button("primary"), "w-full sm:w-auto")}>
              Pay {formatMoney(order.subtotalMinor, order.currency)}
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {/* ------------------------------ details ------------------------------ */}
      <div className="mt-3 space-y-3">
        <Disclosure
          summary={
            <span className="flex items-center gap-2">
              <MapPinIcon className="size-4 text-accent" />
              Delivery
            </span>
          }
          meta={<span className="hidden max-w-56 truncate text-sm sm:inline">{order.address}</span>}
          metaWhenClosed
          defaultOpen
        >
          <p className="text-sm text-ink">{order.address}</p>
          <AddressMap address={order.address} title="Map of the delivery address" className="mt-3" height="h-48" />
        </Disclosure>

        <Disclosure
          summary={
            <span className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-accent" />
              {order.lines.length} {order.lines.length === 1 ? "item" : "items"}
            </span>
          }
          meta={<span className="text-sm font-medium text-ink tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</span>}
        >
          <OrderLines lines={order.lines} currency={order.currency} />
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-subtle">
            Before tax and any delivery charge, which we confirm with you.
          </p>
          {order.notes ? (
            <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-sm text-ink-muted">
              <span className="text-ink-subtle">Your notes: </span>
              {order.notes}
            </p>
          ) : null}
        </Disclosure>
      </div>

      {/* ---------------------------- conversation --------------------------- */}
      <section id="messages" aria-labelledby="messages-title" className={cx(cardClass, "mt-3 p-5 sm:p-8")}>
        <div className="mb-4 flex items-center gap-2">
          <ChatIcon className="size-4 text-accent" />
          <h2 id="messages-title" className="font-display text-lg font-semibold tracking-tight">
            Messages about this order
          </h2>
        </div>
        <MessageThread
          messages={messages}
          viewer="customer"
          otherName={business.name}
          emptyText="Need a change, or have a question? Send us a message."
          className="mb-4"
        />
        <MessageComposer
          action={sendOrderMessageAction}
          hidden={{ token }}
          placeholder="Ask a question or request a change"
          allowChangeRequest
        />
      </section>

      {/* ---------------------------- keep it ------------------------------- */}
      {!user ? (
        <section className="mt-3 flex flex-col gap-4 rounded-xl bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-semibold text-accent-strong">Keep track of this order</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Create an account with {order.email} to see every order, reorder in one tap, and keep your messages.
            </p>
          </div>
          <Link href={`/signup?email=${encodeURIComponent(order.email)}`} className={cx(button("primary"), "shrink-0")}>
            Create account <ArrowRightIcon className={nudgeClass} />
          </Link>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm text-ink-muted sm:flex-row sm:justify-between sm:text-left">
        <p>
          Something urgent?{" "}
          <a href={phoneHref} className="inline-flex items-center gap-1 font-semibold text-ink hover:text-accent">
            <PhoneIcon className="size-3.5" />
            {business.phone}
          </a>
          , quoting {order.reference}.
        </p>
        <div className="flex gap-2">
          {user ? (
            <Link href="/account/orders" className={button("ghost", "sm")}>
              All orders
            </Link>
          ) : null}
          <Link href="/shop" className={button("secondary", "sm")}>
            <RepeatIcon className="size-4" />
            Order again
          </Link>
        </div>
      </div>
    </Container>
  );
}
