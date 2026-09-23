import type { Metadata } from "next";
import { daysUntil, relativeDay } from "@/components/enquiry";
import { ReceiptIcon } from "@/components/icons";
import { DateTile, ListRow, SearchBox } from "@/components/owner";
import { OrderStatusBadge, PaymentBadge } from "@/components/order";
import { cardClass, cx, EmptyState, PageHeader, Tabs } from "@/components/ui";
import type { OrderRecord } from "@/lib/db/types";
import { listAllOrders } from "@/lib/orders";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Orders",
};

const VIEWS = ["all", "pending", "confirmed", "fulfilled", "cancelled", "unpaid"] as const;
type View = (typeof VIEWS)[number];

const LABELS: Record<View, string> = {
  all: "All",
  pending: "To confirm",
  confirmed: "Confirmed",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
  unpaid: "Unpaid",
};

function inView(order: OrderRecord, view: View): boolean {
  if (view === "all") return true;
  if (view === "unpaid") return order.paymentStatus === "unpaid" && order.status !== "cancelled";
  return order.status === view;
}

function matches(order: OrderRecord, query: string): boolean {
  if (!query) return true;
  const haystack = `${order.reference} ${order.name} ${order.email} ${order.phone} ${order.address}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

/**
 * Every order, filtered by where it is up to. Orders still to happen are
 * sorted soonest first, because that is the order they need attention in;
 * everything else newest first.
 */
export default async function OwnerOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const view: View = VIEWS.includes(params.status as View) ? (params.status as View) : "all";
  const query = typeof params.q === "string" ? params.q.slice(0, 80).trim() : "";

  const orders = await listAllOrders();
  const upcomingFirst = view === "pending" || view === "confirmed" || view === "unpaid";
  const list = orders
    .filter((order) => inView(order, view) && matches(order, query))
    .sort((a, b) => (upcomingFirst ? a.eventDate.localeCompare(b.eventDate) : b.createdAt.localeCompare(a.createdAt)));

  const href = (target: View) => {
    const search = new URLSearchParams({ ...(target !== "all" ? { status: target } : {}), ...(query ? { q: query } : {}) });
    return `/admin/orders${search.size ? `?${search}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Orders" actions={<SearchBox action="/admin/orders" defaultValue={query} placeholder="Search orders" hidden={view !== "all" ? { status: view } : {}} />} />

      <Tabs
        label="Order status"
        active={href(view)}
        items={VIEWS.map((target) => ({
          href: href(target),
          label: LABELS[target],
          count: orders.filter((order) => inView(order, target)).length,
        }))}
      />

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState icon={ReceiptIcon} title={query ? `Nothing matches "${query}"` : `No ${LABELS[view].toLowerCase()} orders`} className="bg-surface" />
        ) : (
          <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
            {list.map((order) => {
              const past = daysUntil(order.eventDate) < 0;
              return (
                <ListRow
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  leading={<DateTile iso={order.eventDate} muted={past || order.status === "cancelled"} />}
                  title={
                    <>
                      {order.name}{" "}
                      <span className="font-normal text-ink-subtle">
                        · #{order.reference} · {relativeDay(order.eventDate)}
                      </span>
                    </>
                  }
                  subtitle={`${order.guests} guests · ${order.address}`}
                  meta={<span className="font-medium text-ink tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</span>}
                  trailing={
                    <>
                      <OrderStatusBadge status={order.status} />
                      <span className="hidden sm:inline-flex">
                        <PaymentBadge status={order.paymentStatus} />
                      </span>
                    </>
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
