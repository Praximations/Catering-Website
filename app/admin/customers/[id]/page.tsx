import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markThreadReadAction, ownerReplyAction } from "@/app/actions/messages";
import { ContactStatusBadge, formatSentAt, packageLabel, relativeDay, StatusBadge } from "@/components/enquiry";
import { ArrowLeftIcon, MailIcon, MapPinIcon, PhoneIcon, ReceiptIcon, SparklesIcon } from "@/components/icons";
import { AddressMap } from "@/components/map";
import { MarkRead } from "@/components/mark-read";
import { MessageComposer } from "@/components/message-composer";
import { MessageThread } from "@/components/messages";
import { DateTile, ListRow } from "@/components/owner";
import { OrderStatusBadge } from "@/components/order";
import { Avatar, cardClass, cx, EmptyState, Pill, Section, Stat } from "@/components/ui";
import { findCustomer } from "@/lib/customers";
import { db } from "@/lib/db";
import { listThread, orderThread, userThread, type ThreadKey } from "@/lib/messages";
import { telHref, toE164 } from "@/lib/phone";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { activeSmsProvider } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Customer",
};

/**
 * Everything about one customer on one page: how much they have ordered, what
 * is coming up, what they asked for, and the conversation, with a reply box.
 */
export default async function OwnerCustomer({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const customer = await findCustomer(id);
  if (!customer) notFound();

  const [orders, enquiries, contacts] = await Promise.all([
    db.orders.find({ all: { email: customer.email } }, { orderBy: "eventDate", direction: "desc" }),
    db.enquiries.find({ all: { email: customer.email } }, { orderBy: "createdAt", direction: "desc" }),
    db.contacts.find({ all: { email: customer.email } }, { orderBy: "createdAt", direction: "desc" }),
  ]);

  // Their conversation: the account's if they have one, else their most recent
  // guest order's. Null when there is nothing to hang a reply on yet.
  const thread: ThreadKey | null = customer.userId
    ? userThread(customer.userId)
    : orders[0]
      ? orderThread(orders[0].id)
      : null;
  const messages = thread ? await listThread(thread) : [];
  const unread = messages.some((message) => message.sender === "customer" && !message.readAt);
  const references = Object.fromEntries(orders.map((order) => [order.id, order.reference]));
  const latestAddress = orders.find((order) => order.address)?.address ?? "";
  const canText = Boolean(activeSmsProvider()) && Boolean(customer.phone && toE164(customer.phone));

  return (
    <div>
      {thread && unread ? <MarkRead action={markThreadReadAction} arg={thread} /> : null}

      <Link href="/admin/customers" className="group inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Customers
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={customer.name || customer.email} className="size-14 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-3xl font-semibold tracking-tight">{customer.name || customer.email}</h1>
            {customer.hasAccount ? <Pill tone="accent">Account</Pill> : <Pill tone="muted">Guest</Pill>}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 hover:text-accent">
              <MailIcon className="size-4" />
              {customer.email}
            </a>
            {customer.phone ? (
              <a href={telHref(customer.phone)} className="inline-flex items-center gap-1.5 hover:text-accent">
                <PhoneIcon className="size-4" />
                {customer.phone}
              </a>
            ) : null}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime value" value={formatMoney(customer.lifetimeValueMinor)} />
        <Stat label="Orders" value={customer.orders} />
        <Stat label="Quotes" value={customer.enquiries} />
        <Stat label="First seen" value={customer.firstSeen ? formatSentAt(customer.firstSeen) : "Unknown"} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <Section title="Orders">
            {orders.length === 0 ? (
              <EmptyState icon={ReceiptIcon} title="No orders" className="bg-surface" />
            ) : (
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {orders.map((order) => (
                  <ListRow
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    leading={<DateTile iso={order.eventDate} muted={order.status === "cancelled" || order.status === "fulfilled"} />}
                    title={`#${order.reference} · ${relativeDay(order.eventDate)}`}
                    subtitle={`${order.guests} guests · ${order.address}`}
                    meta={formatMoney(order.subtotalMinor, order.currency)}
                    trailing={<OrderStatusBadge status={order.status} />}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Conversation">
            <div className={cx(cardClass, "p-4 sm:p-5")}>
              <MessageThread
                messages={messages}
                viewer="owner"
                otherName={customer.name || "Customer"}
                orderReferences={references}
                emptyText={thread ? "No messages yet." : "Messages open once they have an order or an account."}
                className="mb-4"
              />
              {thread ? (
                <MessageComposer
                  action={ownerReplyAction}
                  hidden={{ thread }}
                  placeholder={`Message ${(customer.name || "them").split(" ")[0]}`}
                  smsAvailable={canText}
                />
              ) : null}
            </div>
          </Section>
        </div>

        <aside className="space-y-8">
          {latestAddress ? (
            <Section title="Latest delivery address">
              <div className={cx(cardClass, "p-4")}>
                <p className="flex items-start gap-2 text-sm">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  {latestAddress}
                </p>
                <AddressMap address={latestAddress} className="mt-3" height="h-40" />
              </div>
            </Section>
          ) : null}

          <Section title="Quote requests">
            {enquiries.length === 0 ? (
              <p className="text-sm text-ink-muted">None.</p>
            ) : (
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {enquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <Link href={`/admin/quotes?open=${enquiry.id}#${enquiry.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-raised/60">
                      <SparklesIcon className="size-4 shrink-0 text-ink-subtle" />
                      <span className="min-w-0 flex-1 truncate">
                        {enquiry.guests} guests · {packageLabel(enquiry.packageSlug)}
                      </span>
                      <StatusBadge status={enquiry.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Contact messages">
            {contacts.length === 0 ? (
              <p className="text-sm text-ink-muted">None.</p>
            ) : (
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {contacts.map((contact) => (
                  <li key={contact.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{contact.subject}</span>
                      <ContactStatusBadge status={contact.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-ink-muted">{contact.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
