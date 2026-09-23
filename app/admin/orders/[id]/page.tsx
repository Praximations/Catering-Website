import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markThreadReadAction, ownerReplyAction } from "@/app/actions/messages";
import { updateOrderAction } from "@/app/actions/orders";
import { ConfirmButton } from "@/components/confirm-button";
import { formatEventDate, formatSentAt, relativeDay } from "@/components/enquiry";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  ExternalIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ReceiptIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import { AddressMap } from "@/components/map";
import { MarkRead } from "@/components/mark-read";
import { MessageComposer } from "@/components/message-composer";
import { MessageThread } from "@/components/messages";
import { OrderLines, OrderStatusBadge, OrderTimeline, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, KeyValues, Pill, Section, textareaClass } from "@/components/ui";
import { customerId } from "@/lib/customers";
import { db } from "@/lib/db";
import { directionsUrl } from "@/lib/geo";
import { listThreadForOrder, orderThread, userThread } from "@/lib/messages";
import { findOrderById, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { telHref, toE164 } from "@/lib/phone";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { activeSmsProvider } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Order",
};

/**
 * One order, for the owner. The next thing to do with it is the first thing
 * on the page (confirm it, mark it delivered); then what was ordered and the
 * conversation about it; the customer, the delivery and the money beside.
 */
export default async function OwnerOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const order = await findOrderById(id.slice(0, 100));
  if (!order) notFound();

  const [messages, account] = await Promise.all([
    listThreadForOrder(order.id),
    order.userId
      ? db.users.findOne({ all: { id: order.userId } })
      : db.users.findOne({ all: { email: order.email.toLowerCase() } }),
  ]);

  // The conversation this order belongs to: the account's, or the order's own
  // for a guest. Replies are filed under this order either way.
  const thread = account ? userThread(account.id) : orderThread(order.id);
  const unread = messages.some((message) => message.sender === "customer" && !message.readAt);
  const canText = Boolean(activeSmsProvider()) && Boolean(toE164(order.phone));

  return (
    <div>
      {unread ? <MarkRead action={markThreadReadAction} arg={thread} /> : null}

      <Link href="/admin/orders" className="group inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Orders
      </Link>

      <header className="mt-3 mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Order {order.reference}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {order.name} · placed {formatSentAt(order.createdAt)}
          </p>
        </div>

        {/* The next step for this order, as buttons. */}
        <div className="flex flex-wrap gap-2">
          {order.status === "pending" ? (
            <StatusForm id={order.id} status="confirmed">
              <SubmitButton pendingLabel="Confirming" className={button("primary")}>
                <CheckCircleIcon className="size-4" />
                Confirm order
              </SubmitButton>
            </StatusForm>
          ) : null}
          {order.status === "confirmed" ? (
            <StatusForm id={order.id} status="fulfilled">
              <SubmitButton pendingLabel="Saving" className={button("primary")}>
                <TruckIcon className="size-4" />
                Mark delivered
              </SubmitButton>
            </StatusForm>
          ) : null}
          {order.status === "confirmed" ? (
            <StatusForm id={order.id} status="pending">
              <SubmitButton pendingLabel="Saving" className={button("ghost")}>
                Back to pending
              </SubmitButton>
            </StatusForm>
          ) : null}
          {order.status === "fulfilled" || order.status === "cancelled" ? (
            <StatusForm id={order.id} status={order.status === "fulfilled" ? "confirmed" : "pending"}>
              <SubmitButton pendingLabel="Saving" className={button("secondary")}>
                Reopen
              </SubmitButton>
            </StatusForm>
          ) : null}
          {order.status === "pending" || order.status === "confirmed" ? (
            <StatusForm id={order.id} status="cancelled">
              <ConfirmButton
                confirmLabel="Press again to cancel"
                className={button("danger")}
                armedClassName="bg-danger text-on-accent hover:bg-danger"
              >
                Cancel order
              </ConfirmButton>
            </StatusForm>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {order.status !== "cancelled" ? (
            <div className={cx(cardClass, "px-5 py-6 sm:px-8")}>
              <OrderTimeline status={order.status} />
            </div>
          ) : null}

          <Section title="Items" description={`${order.lines.length} ${order.lines.length === 1 ? "line" : "lines"}`}>
            <div className={cx(cardClass, "p-5")}>
              <OrderLines lines={order.lines} currency={order.currency} />
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm text-ink-muted">Subtotal</span>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</span>
              </div>
              {order.notes ? (
                <div className="mt-4 rounded-lg bg-warning-soft px-4 py-3 text-sm text-ink">
                  <p className="text-xs font-semibold text-warning">Customer notes</p>
                  <p className="mt-1 whitespace-pre-line">{order.notes}</p>
                </div>
              ) : null}
            </div>
          </Section>

          <Section
            title="Conversation"
            description="Messages about this order."
            action={
              <Link href={`/admin/inbox?c=${thread}`} className={button("ghost", "sm")}>
                <ChatIcon className="size-4" />
                Open in inbox
              </Link>
            }
          >
            <div className={cx(cardClass, "p-4 sm:p-5")}>
              <MessageThread
                messages={messages}
                viewer="owner"
                otherName={order.name}
                emptyText="No messages about this order yet."
                className="mb-4"
              />
              <MessageComposer
                action={ownerReplyAction}
                hidden={{ thread, orderId: order.id }}
                placeholder={`Message ${order.name.split(" ")[0]}`}
                smsAvailable={canText}
              />
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="Event">
            <div className={cx(cardClass, "p-5")}>
              <KeyValues
                items={[
                  { label: "Date", value: formatEventDate(order.eventDate), icon: CalendarIcon },
                  { label: "When", value: relativeDay(order.eventDate), icon: CalendarIcon },
                  { label: "Guests", value: order.guests, icon: UsersIcon },
                ]}
              />
            </div>
          </Section>

          <Section
            title="Customer"
            action={
              <Link href={`/admin/customers/${customerId(order.email)}`} className="text-sm font-medium text-accent hover:underline">
                Profile
              </Link>
            }
          >
            <div className={cx(cardClass, "space-y-2.5 p-5 text-sm")}>
              <p className="flex items-center gap-2 font-medium">
                <UserIcon className="size-4 text-ink-subtle" />
                {order.name}
                {account ? <Pill tone="accent">Account</Pill> : <Pill tone="muted">Guest</Pill>}
              </p>
              <a href={`mailto:${order.email}`} className="flex items-center gap-2 break-all text-ink-muted hover:text-accent">
                <MailIcon className="size-4 shrink-0 text-ink-subtle" />
                {order.email}
              </a>
              {order.phone ? (
                <a href={telHref(order.phone)} className="flex items-center gap-2 text-ink-muted hover:text-accent">
                  <PhoneIcon className="size-4 shrink-0 text-ink-subtle" />
                  {order.phone}
                </a>
              ) : null}
            </div>
          </Section>

          <Section title="Delivery">
            <div className={cx(cardClass, "p-5")}>
              <p className="flex items-start gap-2 text-sm">
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                {order.address}
              </p>
              <AddressMap address={order.address} className="mt-3" height="h-44" />
              <a
                href={directionsUrl(order.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Directions <ExternalIcon className="size-3.5" />
              </a>
            </div>
          </Section>

          <Section title="Payment">
            <div className={cx(cardClass, "p-5")}>
              <KeyValues
                items={[
                  { label: "Status", value: PAYMENT_STATUS_LABELS[order.paymentStatus], icon: ReceiptIcon },
                  ...(order.paidAt ? [{ label: "Paid", value: formatSentAt(order.paidAt) }] : []),
                  ...(order.paymentProvider ? [{ label: "Through", value: order.paymentProvider }] : []),
                ]}
              />
            </div>
          </Section>

          <Section title="Private notes" description="Only you see these.">
            <form action={updateOrderAction} className={cx(cardClass, "p-4")}>
              <input type="hidden" name="id" value={order.id} />
              <label htmlFor="ownerNotes" className="sr-only">
                Private notes
              </label>
              <textarea
                id="ownerNotes"
                name="ownerNotes"
                rows={3}
                defaultValue={order.ownerNotes}
                placeholder="Invoiced, waiting on the deposit"
                className={textareaClass}
              />
              <SubmitButton pendingLabel="Saving" className={cx(button("secondary", "sm"), "mt-2")}>
                Save notes
              </SubmitButton>
            </form>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function StatusForm({ id, status, children }: { id: string; status: string; children: React.ReactNode }) {
  return (
    <form action={updateOrderAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {children}
    </form>
  );
}
