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
import { ArrowIcon, ContactIcon, OrderIcon } from "@/components/icons";
import { OrderLines, OrderStatusBadge, PaymentBadge } from "@/components/order";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { listMessagesForUser } from "@/lib/customer-messages";
import { menu } from "@/lib/menu";
import { listOrdersForUser } from "@/lib/orders";
import { getSavedInfo } from "@/lib/saved-info";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import { isPaymentConfigured } from "@/lib/payments";
import type { CustomerOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Customer portal" };

function OrderCard({ order, current }: { order: CustomerOrder; current: boolean }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Order {order.reference}</p>
          <h3 className="mt-2 font-display text-2xl text-ink">{formatEventDate(order.eventDate)}</h3>
          <p className="mt-1 text-sm text-ink-muted">{order.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      <OrderLines lines={order.lines} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="text-xs text-ink-subtle">{order.guests} guests</p>
          <p className="font-display text-xl text-ink">{formatMoney(order.subtotalMinor)}</p>
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
  const totalCost = activeOrders.reduce((sum, order) => sum + order.subtotalMinor, 0);
  const amountPaid = activeOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.subtotalMinor, 0);
  const remaining = totalCost - amountPaid;
  const nextUnpaid = [...currentOrders]
    .filter((order) => order.paymentStatus === "unpaid")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Customer portal</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-0.035em] text-ink sm:text-5xl">Welcome, {user.name}.</h1>
          <p className="mt-3 text-sm text-ink-muted">Everything for your events, orders, and payments.</p>
        </div>
        <Link href="/shop" className={buttonClass}>Add another event</Link>
      </header>

      <nav aria-label="Account sections" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {["Overview", "Orders", "Payments", "Messages", "Saved"].map((label) => (
          <a key={label} href={`#${label.toLowerCase()}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <section id="overview" className="scroll-mt-28 pt-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-raised/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Amount due</p>
            <p className="mt-3 font-display text-3xl text-ink">{formatMoney(remaining)}</p>
          </div>
          <div className="rounded-2xl bg-raised/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Next payment deadline</p>
            <p className="mt-3 font-display text-2xl text-ink">{nextUnpaid ? formatEventDate(nextUnpaid.eventDate) : "Nothing due"}</p>
          </div>
          <div className="rounded-2xl bg-raised/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Current orders</p>
            <p className="mt-3 font-display text-3xl text-ink">{currentOrders.length}</p>
          </div>
        </div>

        {upcoming ? (
          <div className="mt-5 grid overflow-hidden rounded-[2rem] bg-ink text-on-accent lg:grid-cols-[1fr_auto]">
            <div className="p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-accent/55">Upcoming event</p>
              <h2 className="mt-3 font-display text-4xl">{formatEventDate(upcoming.eventDate)}</h2>
              <p className="mt-3 text-sm text-on-accent/70">{upcoming.address} / {upcoming.guests} guests</p>
              <div className="mt-5 flex flex-wrap gap-2"><OrderStatusBadge status={upcoming.status} /><PaymentBadge status={upcoming.paymentStatus} /></div>
            </div>
            <div className="flex min-w-72 flex-col justify-center gap-3 border-t border-on-accent/15 p-7 lg:border-l lg:border-t-0">
              <Link href={`/orders/${upcoming.token}`} className="flex items-center justify-between rounded-full bg-surface px-5 py-3 text-sm font-bold text-ink">View event <ArrowIcon className="size-4" /></Link>
              {upcoming.paymentStatus === "unpaid" && isPaymentConfigured ? (
                <form action={startPaymentAction}>
                  <input type="hidden" name="token" value={upcoming.token} />
                  <SubmitButton pendingLabel="Opening payment..." className="min-h-12 w-full rounded-full border border-on-accent/25 px-5 text-sm font-bold text-on-accent">Pay balance</SubmitButton>
                </form>
              ) : null}
              <a href="#messages" className="px-5 py-2 text-center text-sm font-semibold text-on-accent/75">Message or request changes</a>
            </div>
          </div>
        ) : (
          <div className="mt-5"><EmptyState title="No upcoming event yet."><Link href="/shop" className={`${buttonClass} mt-5`}>Start an order</Link></EmptyState></div>
        )}
      </section>

      <section id="orders" className="scroll-mt-28 pt-20">
        <div className="flex items-end justify-between gap-4">
          <div><p className="eyebrow">Orders</p><h2 className="mt-2 font-display text-4xl text-ink">Your events</h2></div>
          <OrderIcon className="size-6 text-ink-subtle" />
        </div>
        <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-ink-subtle">Current orders</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {currentOrders.length ? currentOrders.map((order) => <OrderCard key={order.id} order={order} current />) : <div className="lg:col-span-2"><EmptyState title="No current orders." /></div>}
        </div>
        {pastOrders.length ? (
          <><h3 className="mt-10 text-sm font-bold uppercase tracking-[0.12em] text-ink-subtle">Past orders</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{pastOrders.map((order) => <OrderCard key={order.id} order={order} current={false} />)}</div></>
        ) : null}
      </section>

      <section id="payments" className="scroll-mt-28 pt-20">
        <p className="eyebrow">Payments</p>
        <h2 className="mt-2 font-display text-4xl text-ink">Financial center</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ label: "Total event cost", value: totalCost }, { label: "Amount paid", value: amountPaid }, { label: "Remaining balance", value: remaining }].map((item) => (
            <div key={item.label} className="rounded-2xl border border-line p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-subtle">{item.label}</p><p className="mt-3 font-display text-3xl text-ink">{formatMoney(item.value)}</p></div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-raised/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-subtle">Payment schedule</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Balances are due before the event date unless your caterer confirms another schedule.</p>
          </div>
          <div className="rounded-2xl bg-raised/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-subtle">Payment method</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Credit or debit card through Stripe. Card details are never stored on this site.</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          {orders.length ? orders.map((order, index) => (
            <div key={order.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${index ? "border-t border-line" : ""}`}>
              <div><p className="font-semibold text-ink">Invoice {order.reference}</p><p className="mt-1 text-sm text-ink-muted">{formatEventDate(order.eventDate)} / {formatMoney(order.subtotalMinor)}</p></div>
              <div className="flex flex-wrap items-center gap-3"><PaymentBadge status={order.paymentStatus} /><Link href={`/orders/${order.token}`} className="text-sm font-semibold text-accent">{order.paymentStatus === "paid" ? "View receipt" : "View invoice"}</Link>{order.paymentStatus === "unpaid" && isPaymentConfigured && order.status !== "cancelled" ? <form action={startPaymentAction}><input type="hidden" name="token" value={order.token} /><SubmitButton pendingLabel="Opening..." className={secondaryButtonClass}>Pay now</SubmitButton></form> : null}</div>
            </div>
          )) : <EmptyState title="No invoices yet." />}
        </div>
      </section>

      <section id="messages" className="scroll-mt-28 pt-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="eyebrow">Messages</p>
            <h2 className="mt-2 font-display text-4xl text-ink">Your conversation</h2>
            <div className="mt-6 space-y-3 rounded-[1.5rem] bg-raised/60 p-5 sm:p-6">
              {messages.length ? messages.map((message) => {
                const order = orders.find((candidate) => candidate.id === message.orderId);
                return <article key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.sender === "customer" ? "ml-auto bg-ink text-on-accent" : "bg-surface text-ink shadow-sm"}`}><p className="text-xs font-bold uppercase tracking-[0.1em] opacity-55">{message.sender === "customer" ? "You" : "Catering coordinator"}{order ? ` / Order ${order.reference}` : ""}</p><p className="mt-2 text-sm leading-6">{message.body}</p><p className="mt-2 text-[0.68rem] opacity-55">{formatSentAt(message.createdAt)}</p></article>;
              }) : <p className="py-8 text-center text-sm text-ink-muted">No messages yet.</p>}
            </div>
          </div>
          <form action={sendCustomerMessageAction} className="self-start rounded-[1.5rem] border border-line p-5 sm:p-6">
            <div className="flex items-center gap-3"><ContactIcon className="size-5 text-accent" /><h3 className="font-display text-2xl text-ink">Send a message</h3></div>
            <label className="mt-6 block text-sm font-medium text-ink" htmlFor="message-order">Event</label>
            <select id="message-order" name="orderId" className={`${inputClass} mt-2`}><option value="">General question</option>{orders.map((order) => <option key={order.id} value={order.id}>Order {order.reference} / {order.eventDate}</option>)}</select>
            <label className="mt-5 block text-sm font-medium text-ink" htmlFor="message-kind">Type</label>
            <select id="message-kind" name="kind" className={`${inputClass} mt-2`}><option value="message">Message</option><option value="change_request">Request a change</option></select>
            <label className="mt-5 block text-sm font-medium text-ink" htmlFor="message-body">Message</label>
            <textarea id="message-body" name="body" rows={5} required maxLength={2000} placeholder="Ask about the menu, timing, or a change..." className={`${inputClass} mt-2`} />
            <SubmitButton pendingLabel="Sending..." className={`${buttonClass} mt-5 w-full`}>Send to caterer</SubmitButton>
          </form>
        </div>
      </section>

      <section id="saved" className="scroll-mt-28 pt-20">
        <p className="eyebrow">Saved information</p>
        <h2 className="mt-2 font-display text-4xl text-ink">Make the next event faster.</h2>
        <form action={saveCustomerInfoAction} className="mt-6 rounded-[2rem] border border-line p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div><label htmlFor="venues" className="text-sm font-medium text-ink">Venues</label><textarea id="venues" name="venues" rows={4} defaultValue={saved?.venues.join("\n")} placeholder="One venue per line" className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="addresses" className="text-sm font-medium text-ink">Delivery addresses</label><textarea id="addresses" name="addresses" rows={4} defaultValue={saved?.addresses.join("\n")} placeholder="One address per line" className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="guestPreferences" className="text-sm font-medium text-ink">Guest preferences</label><textarea id="guestPreferences" name="guestPreferences" rows={4} defaultValue={saved?.guestPreferences} placeholder="Service style, favorites, timing..." className={`${inputClass} mt-2`} /></div>
            <div><label htmlFor="dietaryInformation" className="text-sm font-medium text-ink">Dietary information</label><textarea id="dietaryInformation" name="dietaryInformation" rows={4} defaultValue={saved?.dietaryInformation} placeholder="Allergies and dietary needs" className={`${inputClass} mt-2`} /></div>
          </div>
          <fieldset className="mt-6"><legend className="text-sm font-medium text-ink">Favorite collections</legend><div className="mt-3 flex flex-wrap gap-2">{menu.map((item) => <label key={item.slug} className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted"><input type="checkbox" name="favoriteMenuSlugs" value={item.slug} defaultChecked={saved?.favoriteMenuSlugs.includes(item.slug)} /> {item.name}</label>)}</div></fieldset>
          <SubmitButton pendingLabel="Saving..." className={`${buttonClass} mt-7`}>Save information</SubmitButton>
        </form>
      </section>

      <section id="security" className="scroll-mt-28 pt-20">
        <p className="eyebrow">Security</p>
        <h2 className="mt-2 font-display text-4xl text-ink">Signed in somewhere else?</h2>
        <div className="mt-6 rounded-[2rem] border border-line p-6 sm:p-8">
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
