import type { Metadata } from "next";
import Link from "next/link";
import { daysUntil, formatWhen, relativeDay } from "@/components/enquiry";
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  CreditCardIcon,
  InboxIcon,
  KeyIcon,
  MailIcon,
  ReceiptIcon,
  SlidersIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
  type Icon,
} from "@/components/icons";
import { AttentionItem, DateTile, ListRow } from "@/components/owner";
import { OrderStatusBadge, PaymentBadge } from "@/components/order";
import { cardClass, cx, EmptyState, nudgeClass, PageHeader, reveal, Section, Stat, textLinkClass } from "@/components/ui";
import { isPlaceholderBusiness } from "@/lib/business";
import { contactCounts, listContacts } from "@/lib/contacts";
import { listApprovals } from "@/lib/control";
import { listCustomers } from "@/lib/customers";
import { enquiryCounts, listAllEnquiries } from "@/lib/enquiries";
import { listConversations } from "@/lib/messages";
import { listAllOrders, orderCounts } from "@/lib/orders";
import { isPaymentConfigured } from "@/lib/payments";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { activeSmsProvider } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Overview",
};

/**
 * The owner's first screen. It answers, in order: is anything waiting on me,
 * what is coming up, and how is the business doing. Detail lives one click
 * away on each section's own page.
 */
export default async function OwnerOverview() {
  const owner = await requireOwner();
  const [orders, stats, quotes, quoteStats, contacts, contactStats, conversations, customers, approvals] =
    await Promise.all([
      listAllOrders(),
      orderCounts(),
      listAllEnquiries(),
      enquiryCounts(),
      listContacts(),
      contactCounts(),
      listConversations(),
      listCustomers(),
      listApprovals("pending", 100),
    ]);

  const upcoming = orders
    .filter((order) => (order.status === "pending" || order.status === "confirmed") && daysUntil(order.eventDate) >= 0)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const thisWeek = upcoming.filter((order) => daysUntil(order.eventDate) <= 7);
  const unpaidSoon = thisWeek.filter((order) => order.paymentStatus === "unpaid");
  const unread = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
  const unreadThreads = conversations.filter((conversation) => conversation.unread > 0);

  /* What is waiting on the owner, most urgent first. Only real items. */
  const attention: { href: string; icon: Icon; label: string; detail?: string; count?: number; tone?: "warning" | "danger" | "info" | "highlight" | "neutral" }[] = [];
  if (stats.pending > 0) {
    attention.push({ href: "/admin/orders?status=pending", icon: ReceiptIcon, label: "Orders to confirm", count: stats.pending, tone: "warning" });
  }
  if (unread > 0) {
    attention.push({
      href: "/admin/inbox",
      icon: ChatIcon,
      label: "Unread messages",
      detail: unreadThreads.slice(0, 3).map((c) => c.name).join(", "),
      count: unread,
      tone: "highlight",
    });
  }
  if (quoteStats.new > 0) {
    attention.push({ href: "/admin/quotes?status=new", icon: SparklesIcon, label: "New quote requests", count: quoteStats.new, tone: "warning" });
  }
  if (contactStats.new > 0) {
    attention.push({ href: "/admin/inbox?tab=contact", icon: MailIcon, label: "New contact messages", count: contactStats.new, tone: "info" });
  }
  if (unpaidSoon.length > 0) {
    attention.push({
      href: "/admin/orders?status=unpaid",
      icon: CreditCardIcon,
      label: "Unpaid, delivering this week",
      detail: unpaidSoon.slice(0, 3).map((o) => `#${o.reference}`).join(", "),
      count: unpaidSoon.length,
      tone: "danger",
    });
  }
  if (approvals.length > 0) {
    attention.push({ href: "/admin/praxi", icon: KeyIcon, label: "Assistant requests waiting", count: approvals.length, tone: "info" });
  }

  const setup: { href: string; label: string }[] = [];
  if (isPlaceholderBusiness) setup.push({ href: "/admin/settings#business", label: "Replace the placeholder business details" });
  if (!isPaymentConfigured) setup.push({ href: "/admin/settings#integrations", label: "Connect online payments" });
  if (!activeSmsProvider()) setup.push({ href: "/admin/settings#integrations", label: "Connect text messaging" });

  /* The last few things that happened, newest first. */
  const activity = [
    ...orders.slice(0, 6).map((order) => ({
      at: order.createdAt,
      icon: ReceiptIcon,
      text: `${order.name} placed order ${order.reference}`,
      href: `/admin/orders/${order.id}`,
    })),
    ...quotes.slice(0, 6).map((quote) => ({
      at: quote.createdAt,
      icon: SparklesIcon,
      text: `${quote.name} asked for a quote, ${quote.guests} guests`,
      href: `/admin/quotes?open=${quote.id}`,
    })),
    ...conversations.slice(0, 6).map((conversation) => ({
      at: conversation.lastAt,
      icon: ChatIcon,
      text: `${conversation.lastSender === "customer" ? conversation.name : "You"}: ${conversation.lastBody}`,
      href: `/admin/inbox?c=${conversation.key}`,
    })),
    ...contacts.slice(0, 6).map((contact) => ({
      at: contact.createdAt,
      icon: MailIcon,
      text: `${contact.name}: ${contact.subject}`,
      href: "/admin/inbox?tab=contact",
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        title={`Welcome back, ${owner.name.split(" ")[0]}`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <Section title="Needs attention">
            {attention.length > 0 ? (
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")} {...reveal()}>
                {attention.map((item) => (
                  <AttentionItem key={item.label} {...item} />
                ))}
              </ul>
            ) : (
              <div className={cx(cardClass, "flex items-center gap-3 p-5")}>
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <CheckCircleIcon className="size-5" />
                </span>
                <p className="text-sm text-ink">All clear. Nothing is waiting on you.</p>
              </div>
            )}
          </Section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="This week" value={thisWeek.length} hint="Deliveries in 7 days" icon={TruckIcon} href="/admin/orders?status=confirmed" />
            <Stat label="Booked value" value={formatMoney(stats.revenueMinor)} hint="Excludes cancelled and refunded" icon={ReceiptIcon} />
            <Stat label="Customers" value={customers.length} icon={UsersIcon} href="/admin/customers" />
            <Stat label="Open quotes" value={quoteStats.new + quoteStats.contacted} icon={SparklesIcon} href="/admin/quotes" />
          </div>

          <Section
            title="Coming up"
            action={
              <Link href="/admin/orders" className={textLinkClass}>
                All orders <ArrowRightIcon className={nudgeClass} />
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarIcon} title="Nothing booked ahead" className="bg-surface">
                Orders appear here as they come in.
              </EmptyState>
            ) : (
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {upcoming.slice(0, 6).map((order) => (
                  <ListRow
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    leading={<DateTile iso={order.eventDate} />}
                    title={
                      <>
                        {order.name} <span className="font-normal text-ink-subtle">· {relativeDay(order.eventDate)}</span>
                      </>
                    }
                    subtitle={`${order.guests} guests · ${order.address}`}
                    meta={formatMoney(order.subtotalMinor, order.currency)}
                    trailing={
                      <>
                        <OrderStatusBadge status={order.status} />
                        {order.paymentStatus !== "unpaid" ? <PaymentBadge status={order.paymentStatus} /> : null}
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-8">
          <Section title="Recent activity">
            {activity.length === 0 ? (
              <EmptyState icon={InboxIcon} title="No activity yet" className="bg-surface" />
            ) : (
              <ol className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {activity.map((item, index) => (
                  <li key={`${item.href}-${index}`}>
                    <Link href={item.href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised/60">
                      <item.icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.text}</span>
                      <span className="shrink-0 text-xs text-ink-subtle">{formatWhen(item.at)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {setup.length > 0 ? (
            <Section title="Finish setting up">
              <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
                {setup.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="group flex items-center gap-3 px-4 py-3 text-sm text-ink transition-colors hover:bg-raised/60">
                      <AlertIcon className="size-4 shrink-0 text-warning" />
                      <span className="flex-1">{item.label}</span>
                      <SlidersIcon className="size-4 text-ink-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
