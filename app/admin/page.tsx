import type { Metadata } from "next";
import Link from "next/link";
import { updateEnquiryAction } from "@/app/actions/enquiries";
import { updateOrderAction } from "@/app/actions/orders";
import { StatusBadge, formatEventDate, formatSentAt, packageLabel } from "@/components/enquiry";
import { OrderLines, OrderStatusBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, inputClass, secondaryButtonClass } from "@/components/ui";
import { countPendingApprovals } from "@/lib/control";
import { ENQUIRY_STATUSES, STATUS_LABELS, enquiryCounts, listAllEnquiries } from "@/lib/enquiries";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, listAllOrders, orderCounts } from "@/lib/orders";
import { praxiConfigured } from "@/lib/praxi";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * The owner's dashboard: every order and every enquiry, with the controls
 * to move each one along.
 *
 * requireOwner runs here, and each action checks the role AGAIN on its
 * own, because a Server Action is a public endpoint that can be called
 * without this page ever being loaded.
 */
export default async function AdminPage() {
  const owner = await requireOwner();
  const [orders, orderStats, enquiries, enquiryStats, pendingApprovals] = await Promise.all([
    listAllOrders(),
    orderCounts(),
    listAllEnquiries(),
    enquiryCounts(),
    countPendingApprovals(),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <PageHeader
        eyebrow={`Signed in as ${owner.email}`}
        title="Dashboard"
        lede="Everything that has come in through the site."
      />

      {/* Real numbers, including real zeros. Nothing here is a sample. */}
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Orders</dt>
          <dd className="mt-1 font-display text-2xl text-ink">{orderStats.total}</dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Booked value</dt>
          <dd className="mt-1 font-display text-2xl text-ink">
            {formatMoney(orderStats.revenueMinor)}
          </dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Enquiries</dt>
          <dd className="mt-1 font-display text-2xl text-ink">{enquiryStats.total}</dd>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-ink-subtle">Unanswered</dt>
          <dd className="mt-1 font-display text-2xl text-ink">{enquiryStats.new}</dd>
        </div>
      </dl>

      {/* Say plainly whether the Praxi connection is live, rather than
          implying an integration that is not configured. Anything waiting
          on the owner is surfaced HERE, because a request sitting unseen
          on another page is the same as no approval system at all. */}
      <div className="mb-12 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-raised px-4 py-3">
        <p className="text-xs text-ink-subtle">
          {praxiConfigured()
            ? "Praxi is connected. Orders, customers, and enquiries are mirrored to it as they happen."
            : "Praxi is not connected. Set PRAXI_API_URL and PRAXI_SECRET_KEY to mirror orders and enquiries to it."}
        </p>
        <Link
          href="/admin/praxi"
          className={
            pendingApprovals > 0
              ? "rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-on-accent"
              : "text-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          }
        >
          {pendingApprovals > 0
            ? `${pendingApprovals} request${pendingApprovals === 1 ? "" : "s"} waiting for you`
            : "What Praxi may do"}
        </Link>
      </div>

      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight text-ink">Orders</h2>

        {orders.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No orders yet.">
              <p>
                Anything placed through{" "}
                <Link href="/shop" className="text-accent-strong hover:underline">
                  the order page
                </Link>{" "}
                lands here.
              </p>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-6 space-y-5">
            {orders.map((order) => (
              <li key={order.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-ink">
                      Order {order.reference} &middot; {formatEventDate(order.eventDate)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {order.guests} {order.guests === 1 ? "person" : "people"} &middot;{" "}
                      {formatMoney(order.subtotalMinor)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <OrderLines lines={order.lines} />

                <div className="mt-4 grid gap-x-6 gap-y-1 border-t border-line pt-4 text-sm sm:grid-cols-2">
                  <p className="text-ink">
                    {order.name}
                    {order.userId ? (
                      <span className="ml-2 text-xs text-ink-subtle">has an account</span>
                    ) : null}
                  </p>
                  <p>
                    <a href={`mailto:${order.email}`} className="text-accent-strong hover:underline">
                      {order.email}
                    </a>
                  </p>
                  <p>
                    <a
                      href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                      className="text-ink-muted hover:text-ink"
                    >
                      {order.phone}
                    </a>
                  </p>
                  <p className="text-ink-subtle">Placed {formatSentAt(order.createdAt)}</p>
                  <p className="text-ink-muted sm:col-span-2">Deliver to {order.address}</p>
                </div>

                {order.notes ? (
                  <p className="mt-4 rounded-md bg-raised px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {order.notes}
                  </p>
                ) : null}

                <form action={updateOrderAction} className="mt-5 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={order.id} />

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`order-status-${order.id}`}
                      className="text-xs font-medium text-ink-muted"
                    >
                      Status
                    </label>
                    <select
                      id={`order-status-${order.id}`}
                      name="status"
                      defaultValue={order.status}
                      className={`${inputClass} w-auto`}
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                    <label
                      htmlFor={`order-notes-${order.id}`}
                      className="text-xs font-medium text-ink-muted"
                    >
                      Your notes, private
                    </label>
                    <input
                      id={`order-notes-${order.id}`}
                      name="ownerNotes"
                      type="text"
                      defaultValue={order.ownerNotes}
                      placeholder="Invoiced, waiting on the deposit"
                      className={inputClass}
                    />
                  </div>

                  <SubmitButton pendingLabel="Saving..." className={secondaryButtonClass}>
                    Save
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-tight text-ink">Enquiries</h2>

        {enquiries.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No enquiries yet.">
              <p>
                When somebody sends the form on{" "}
                <Link href="/quote" className="text-accent-strong hover:underline">
                  the quote page
                </Link>
                , it lands here.
              </p>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-6 space-y-5">
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

                <div className="mt-4 grid gap-x-6 gap-y-1 border-t border-line pt-4 text-sm sm:grid-cols-2">
                  <p className="text-ink">
                    {enquiry.name}
                    {enquiry.userId ? (
                      <span className="ml-2 text-xs text-ink-subtle">has an account</span>
                    ) : null}
                  </p>
                  <p>
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="text-accent-strong hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  </p>
                  {enquiry.phone ? (
                    <p>
                      <a
                        href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}
                        className="text-ink-muted hover:text-ink"
                      >
                        {enquiry.phone}
                      </a>
                    </p>
                  ) : null}
                  <p className="text-ink-subtle">Sent {formatSentAt(enquiry.createdAt)}</p>
                </div>

                {enquiry.notes ? (
                  <p className="mt-4 rounded-md bg-raised px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {enquiry.notes}
                  </p>
                ) : null}

                <form action={updateEnquiryAction} className="mt-5 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={enquiry.id} />

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`status-${enquiry.id}`}
                      className="text-xs font-medium text-ink-muted"
                    >
                      Status
                    </label>
                    <select
                      id={`status-${enquiry.id}`}
                      name="status"
                      defaultValue={enquiry.status}
                      className={`${inputClass} w-auto`}
                    >
                      {ENQUIRY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                    <label
                      htmlFor={`notes-${enquiry.id}`}
                      className="text-xs font-medium text-ink-muted"
                    >
                      Your notes, private
                    </label>
                    <input
                      id={`notes-${enquiry.id}`}
                      name="ownerNotes"
                      type="text"
                      defaultValue={enquiry.ownerNotes}
                      placeholder="Quoted 1,400, waiting to hear back"
                      className={inputClass}
                    />
                  </div>

                  <SubmitButton pendingLabel="Saving..." className={secondaryButtonClass}>
                    Save
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
