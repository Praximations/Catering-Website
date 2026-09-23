import type { Metadata } from "next";
import Link from "next/link";
import { startPaymentAction } from "@/app/actions/payments";
import { formatEventDate, relativeDay } from "@/components/enquiry";
import {
  ArrowRightIcon,
  BagIcon,
  CalendarIcon,
  ChatIcon,
  CreditCardIcon,
  MapPinIcon,
  ReceiptIcon,
  SparklesIcon,
  UsersIcon,
  type Icon,
} from "@/components/icons";
import { OrderStatusBadge, OrderTimeline, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, EmptyState, IconTile, interactiveCardClass, nudgeClass, Stat } from "@/components/ui";
import { business } from "@/lib/business";
import { listThreadForUser } from "@/lib/messages";
import { listOrdersForUser } from "@/lib/orders";
import { isPaymentConfigured } from "@/lib/payments";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * What is next, and the three things people come here to do. Everything else
 * is one tab away rather than on this page.
 */
export default async function AccountOverview() {
  const user = await requireUser();
  const orders = await listOrdersForUser(user.id, user.email);
  const messages = await listThreadForUser(
    user.id,
    orders.map((order) => order.id)
  );

  const active = orders.filter((order) => order.status === "pending" || order.status === "confirmed");
  const next = [...active].sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];

  // A refunded order is not owed and a cancelled one is not either.
  const owed = active.filter((order) => order.paymentStatus === "unpaid");
  const owedMinor = owed.reduce((sum, order) => sum + order.subtotalMinor, 0);
  const currency = orders[0]?.currency;
  const unread = messages.filter((message) => message.sender === "owner" && !message.readAt).length;
  const lastMessage = messages.at(-1);

  const actions: { href: string; label: string; body: string; icon: Icon }[] = [
    { href: "/shop", label: "Order a lunch", body: "Platters and per-guest menus", icon: BagIcon },
    { href: "/quote", label: "Plan an event", body: "A menu and a price for you", icon: SparklesIcon },
    { href: "/account/messages", label: "Message us", body: "Questions and changes", icon: ChatIcon },
  ];

  return (
    <div className="space-y-6">
      {next ? (
        <section className={cx(cardClass, "overflow-hidden")} aria-labelledby="next-title">
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Next delivery · {relativeDay(next.eventDate)}</p>
                <h2 id="next-title" className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {formatEventDate(next.eventDate)}
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <OrderStatusBadge status={next.status} />
                <PaymentBadge status={next.paymentStatus} />
              </div>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{next.address}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="size-4" />
                {next.guests} guests
              </span>
            </p>
            <div className="mt-6 grid grid-cols-1 gap-5 border-t border-line pt-6 lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-center">
              <OrderTimeline status={next.status} compact />
              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                {next.paymentStatus === "unpaid" && isPaymentConfigured ? (
                  <form action={startPaymentAction}>
                    <input type="hidden" name="token" value={next.token} />
                    <SubmitButton pendingLabel="Opening payment" className={cx(button("secondary"), "w-full")}>
                      <CreditCardIcon className="size-4" />
                      Pay {formatMoney(next.subtotalMinor, next.currency)}
                    </SubmitButton>
                  </form>
                ) : null}
                <Link href={`/orders/${next.token}`} className={button("primary")}>
                  View order <ArrowRightIcon className={nudgeClass} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={CalendarIcon}
          title="Nothing booked yet"
          className="bg-surface"
          action={
            <Link href="/shop" className={button("primary")}>
              Place an order
            </Link>
          }
        >
          Your next delivery will show here, with where it is up to.
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="In progress" value={active.length} icon={ReceiptIcon} href="/account/orders" />
        <Stat
          label="Still to pay"
          value={formatMoney(owedMinor, currency)}
          hint={owed.length > 0 ? `${owed.length} ${owed.length === 1 ? "order" : "orders"}` : "Nothing owed"}
          icon={CreditCardIcon}
          tone={owedMinor > 0 ? "warning" : "accent"}
        />
        <Stat
          label="Unread messages"
          value={unread}
          icon={ChatIcon}
          tone={unread > 0 ? "highlight" : "neutral"}
          href="/account/messages"
        />
      </div>

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="sr-only">
          Quick actions
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <li key={action.href}>
              <Link href={action.href} className={cx(interactiveCardClass, "group flex items-center gap-3 p-4")}>
                <IconTile icon={action.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{action.label}</span>
                  <span className="block truncate text-xs text-ink-muted">{action.body}</span>
                </span>
                <ArrowRightIcon className={cx(nudgeClass, "text-ink-subtle group-hover:text-accent")} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {lastMessage ? (
        <Link href="/account/messages" className={cx(interactiveCardClass, "group flex items-start gap-3 p-5")}>
          <IconTile icon={ChatIcon} tone={unread > 0 ? "highlight" : "neutral"} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink">
                {lastMessage.sender === "owner" ? business.name : "You"}
              </span>
              {unread > 0 ? <span className="text-xs font-semibold text-highlight">{unread} new</span> : null}
            </span>
            <span className="mt-0.5 line-clamp-2 block text-sm text-ink-muted">{lastMessage.body}</span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}
