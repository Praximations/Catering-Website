import type { Metadata } from "next";
import Link from "next/link";
import {
  reorderAction,
  saveCustomerInfoAction,
  sendCustomerMessageAction,
} from "@/app/actions/account";
import { logoutEverywhereAction } from "@/app/actions/auth";
import { startPaymentAction } from "@/app/actions/payments";
import { formatEventDate, formatSentAt } from "@/components/enquiry";
import { ArrowIcon } from "@/components/icons";
import { OrderLines, OrderStatusBadge, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { listMessagesForUser } from "@/lib/customer-messages";
import { menu } from "@/lib/menu";
import { listOrdersForUser } from "@/lib/orders";
import { getSavedInfo } from "@/lib/saved-info";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { business } from "@/lib/business";
import { activeProvider, isPaymentConfigured } from "@/lib/payments";
import type { CustomerOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Your account",
  // Signed in only, and nothing here is for a search engine. robots.ts says so
  // too; this is the copy a crawler sees on the page itself.
  robots: { index: false, follow: false },
};

function OrderCard({ order, current }: { order: CustomerOrder; current: boolean }) {
  return (
    <article className="rounded-md border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Order {order.reference}</p>
          <h3 className="mt-1 font-display text-2xl text-ink">{formatEventDate(order.eventDate)}</h3>
          <p className="mt-1 text-sm text-ink-muted">{order.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      <OrderLines lines={order.lines} currency={order.currency} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="text-xs text-ink-subtle">{order.guests} guests</p>
          <p className="text-xl font-semibold text-ink">{formatMoney(order.subtotalMinor, order.currency)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/orders/${order.token}`} className={secondaryButtonClass}>View details</Link>
          {!current ? (
            <form action={reorderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <SubmitButton pendingLabel="Loading..." className={secondaryButtonClass}>Reorder</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  const [orders, messages, saved] = await Promise.all([
    listOrdersForUser(user.id, user.email),
    listMessagesForUser(user.id),
    getSavedInfo(user.id),
  ]);

  const currentOrders = orders.filter(
    (order) => order.status !== "fulfilled" && order.status !== "cancelled"
  );
  const pastOrders = orders.filter(
    (order) => order.status === "fulfilled" || order.status === "cancelled"
  );
  const upcoming = [...currentOrders].sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];
  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  /**
   * A REFUNDED order is left out of all three figures. It is not owed: the
   * money arrived and went back, and no path on this page offers to pay one,
   * because every Pay button filters on "unpaid". Counting it in totalCost but
   * not in amountPaid left a balance the page simultaneously said did not
   * exist.
   */
  const billableOrders = activeOrders.filter((order) => order.paymentStatus !== "refunded");
  const totalCost = billableOrders.reduce((sum, order) => sum + order.subtotalMinor, 0);
  const amountPaid = billableOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.subtotalMinor, 0);
  // Every order in an account is in whatever currency was configured when it
  // was placed. Rendering a SUM needs one currency, so use the newest order's
  // rather than today's setting, which may have moved since.
  const accountCurrency = orders[0]?.currency;
  const remaining = totalCost - amountPaid;
  const provider = activeProvider();
  const nextUnpaid = [...currentOrders]
    .filter((order) => order.paymentStatus === "unpaid")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">Hello, {user.name}</h1>
          <p className="mt-3 text-sm text-ink-muted">Your orders, payments and messages with us.</p>
        </div>
        <Link href="/shop" className={buttonClass}>Place a new order</Link>
      </header>

      <nav aria-label="Account sections" className="mt-6 flex gap-6 overflow-x-auto border-b border-line text-sm">
        {["Overview", "Orders", "Payments", "Messages", "Saved", "Security"].map((label) => (
          <a key={label} href={`#${label.toLowerCase()}`} className="-mb-px shrink-0 border-b-2 border-transparent pb-3 font-medium text-ink-muted hover:border-ink hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <section id="overview" className="scroll-mt-28 pt-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-line p-5">
            <p className="text-sm text-ink-muted">Still to pay</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatMoney(remaining, accountCurrency)}</p>
          </div>
          {/* The date of the next unpaid order, called what it is. It used to
              be labelled a "payment deadline", which is a date nobody set. */}
          <div className="rounded-md border border-line p-5">
            <p className="text-sm text-ink-muted">Next unpaid order</p>
            <p className="mt-2 text-xl font-semibold text-ink">{nextUnpaid ? formatEventDate(nextUnpaid.eventDate) : "None"}</p>
          </div>
          <div className="rounded-md border border-line p-5">
            <p className="text-sm text-ink-muted">Orders in progress</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{currentOrders.length}</p>
          </div>
        </div>

        {upcoming ? (
          <div className="mt-5 grid gap-6 rounded-md border border-line border-l-4 border-l-accent p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm text-ink-muted">Your next delivery</p>
              <h2 className="mt-1 font-display text-3xl text-ink">{formatEventDate(upcoming.eventDate)}</h2>
              <p className="mt-2 text-sm text-ink-muted">{upcoming.address} &middot; {upcoming.guests} guests</p>
              <div className="mt-4 flex flex-wrap gap-2"><OrderStatusBadge status={upcoming.status} /><PaymentBadge status={upcoming.paymentStatus} /></div>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-64">
              <Link href={`/orders/${upcoming.token}`} className={buttonClass}>View order <ArrowIcon className="size-4" /></Link>
              {upcoming.paymentStatus === "unpaid" && isPaymentConfigured ? (
                <form action={startPaymentAction}>
                  <input type="hidden" name="token" value={upcoming.token} />
                  <SubmitButton pendingLabel="Opening payment..." className={`${secondaryButtonClass} w-full`}>Pay now</SubmitButton>
                </form>
              ) : null}
              <a href="#messages" className="text-center text-sm font-semibold text-accent underline-offset-4 hover:underline">Ask for a change</a>
            </div>
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="Nothing booked yet."><Link href="/shop" className={`${buttonClass} mt-5`}>Place an order</Link></EmptyState></div>
        )}
      </section>

      <section id="orders" className="scroll-mt-28 pt-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Your orders</h2>
        </div>
        <h3 className="mt-8 text-sm font-semibold text-ink">In progress</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {currentOrders.length ? currentOrders.map((order) => <OrderCard key={order.id} order={order} current />) : <div className="lg:col-span-2"><EmptyState title="No orders in progress." /></div>}
        </div>
        {pastOrders.length ? (
          <><h3 className="mt-10 text-sm font-semibold text-ink">Past orders</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{pastOrders.map((order) => <OrderCard key={order.id} order={order} current={false} />)}</div></>
        ) : null}
      </section>

      <section id="payments" className="scroll-mt-28 pt-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Payments</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ label: "Total ordered", value: totalCost }, { label: "Paid", value: amountPaid }, { label: "Still to pay", value: remaining }].map((item) => (
            <div key={item.label} className="rounded-md border border-line p-5"><p className="text-sm text-ink-muted">{item.label}</p><p className="mt-2 text-3xl font-semibold text-ink">{formatMoney(item.value, accountCurrency)}</p></div>
          ))}
        </div>
        {/* No payment schedule is stated here: when a balance is due is the
            business's policy to set, not this page's. The method line names
            the configured provider from the registry, and says something
            different when there is none. */}
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          {provider
            ? `Pay online by card through ${provider.label}. Card details never reach this site.`
            : "We arrange payment with you directly."}
        </p>
        <div className="mt-6 overflow-hidden rounded-md border border-line">
          {orders.length ? orders.map((order, index) => (
            <div key={order.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t border-line" : ""}`}>
              <div><p className="font-semibold text-ink">Invoice {order.reference}</p><p className="mt-1 text-sm text-ink-muted">{formatEventDate(order.eventDate)} / {formatMoney(order.subtotalMinor, order.currency)}</p></div>
              <div className="flex flex-wrap items-center gap-3"><PaymentBadge status={order.paymentStatus} /><Link href={`/orders/${order.token}`} className="text-sm font-semibold text-accent">{order.paymentStatus === "paid" ? "View receipt" : "View invoice"}</Link>{order.paymentStatus === "unpaid" && isPaymentConfigured && order.status !== "cancelled" ? <form action={startPaymentAction}><input type="hidden" name="token" value={order.token} /><SubmitButton pendingLabel="Opening..." className={secondaryButtonClass}>Pay now</SubmitButton></form> : null}</div>
            </div>
          )) : <EmptyState title="No invoices yet." />}
        </div>
      </section>

      <section id="messages" className="scroll-mt-28 pt-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">Messages</h2>
            <div className="mt-6 space-y-3 rounded-md bg-raised p-5 sm:p-6">
              {messages.length ? messages.map((message) => {
                const order = orders.find((candidate) => candidate.id === message.orderId);
                return <article key={message.id} className={`max-w-[88%] rounded-md px-4 py-3 ${message.sender === "customer" ? "ml-auto bg-accent text-on-accent" : "bg-surface text-ink"}`}><p className="text-xs font-medium opacity-70">{message.sender === "customer" ? "You" : business.name}{order ? ` · Order ${order.reference}` : ""}</p><p className="mt-2 text-sm leading-6">{message.body}</p><p className="mt-2 text-xs opacity-60">{formatSentAt(message.createdAt)}</p></article>;
              }) : <p className="py-8 text-center text-sm text-ink-muted">No messages yet.</p>}
            </div>
          </div>
          <form action={sendCustomerMessageAction} className="self-start rounded-md border border-line p-5 sm:p-6">
            <h3 className="font-display text-2xl text-ink">Send us a message</h3>
            <label className="mt-6 block text-sm font-medium text-ink" htmlFor="message-order">About</label>
            <select id="message-order" name="orderId" className={`${inputClass} mt-2`}><option value="">A general question</option>{orders.map((order) => <option key={order.id} value={order.id}>Order {order.reference}, {formatEventDate(order.eventDate)}</option>)}</select>
            <label className="mt-5 block text-sm font-medium text-ink" htmlFor="message-kind">Type</label>
            <select id="message-kind" name="kind" className={`${inputClass} mt-2`}><option value="message">Message</option><option value="change_request">Request a change</option></select>
            <label className="mt-5 block text-sm font-medium text-ink" htmlFor="message-body">Message</label>
            <textarea id="message-body" name="body" rows={5} required maxLength={2000} placeholder="Ask about the menu, timing, or a change..." className={`${inputClass} mt-2`} />
            <SubmitButton pendingLabel="Sending..." className={`${buttonClass} mt-5 w-full`}>Send message</SubmitButton>
          </form>
        </div>
      </section>

      <section id="saved" className="scroll-mt-28 pt-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Saved details</h2>
        <p className="mt-2 text-sm text-ink-muted">So you do not have to type them again next time.</p>
        <form action={saveCustomerInfoAction} className="mt-6 rounded-md border border-line p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div><label htmlFor="venues" className="text-sm font-medium text-ink">Venues</label><textarea id="venues" name="venues" rows={4} defaultValue={saved?.venues.join("\n")} placeholder="One venue per line" className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="addresses" className="text-sm font-medium text-ink">Delivery addresses</label><textarea id="addresses" name="addresses" rows={4} defaultValue={saved?.addresses.join("\n")} placeholder="One address per line" className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="guestPreferences" className="text-sm font-medium text-ink">Guest preferences</label><textarea id="guestPreferences" name="guestPreferences" rows={4} defaultValue={saved?.guestPreferences} placeholder="Service style, favorites, timing..." className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="dietaryInformation" className="text-sm font-medium text-ink">Dietary information</label><textarea id="dietaryInformation" name="dietaryInformation" rows={4} defaultValue={saved?.dietaryInformation} placeholder="Allergies and dietary needs" className={`${inputClass} mt-2`} /></div>
          </div>
          <fieldset className="mt-6"><legend className="text-sm font-medium text-ink">Menus you like</legend><div className="mt-3 flex flex-wrap gap-2">{menu.map((item) => <label key={item.slug} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm text-ink-muted"><input type="checkbox" name="favoriteMenuSlugs" value={item.slug} defaultChecked={saved?.favoriteMenuSlugs.includes(item.slug)} /> {item.name}</label>)}</div></fieldset>
          <SubmitButton pendingLabel="Saving..." className={`${buttonClass} mt-7`}>Save details</SubmitButton>
        </form>
      </section>

      <section id="security" className="scroll-mt-28 pt-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl">Signed in somewhere else?</h2>
        <div className="mt-6 rounded-md border border-line p-6 sm:p-8">
          <p className="max-w-2xl text-sm leading-6 text-ink-muted">
            Signing out only closes this browser. If you used a shared or public
            computer, sign out everywhere: that ends every session on your
            account, on every device, straight away.
          </p>
          <form action={logoutEverywhereAction} className="mt-6">
            <SubmitButton pendingLabel="Signing out..." className={secondaryButtonClass}>
              Sign out everywhere
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
