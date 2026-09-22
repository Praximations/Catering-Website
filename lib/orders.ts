import { business } from "./business";
import type { Cart } from "./cart";
import { counts, db, store, type OrderRow } from "./db";
import type {
  OrderLine,
  OrderLineRecord,
  OrderRecord,
  OrderStatus,
  PaymentStatus,
} from "./db/types";
import { recordFromRow } from "./db/naming";

/**
 * Orders. What a customer actually bought, as opposed to an enquiry,
 * which is a question about whether we can cook it at all.
 *
 * Payment is optional. Orders exist independently, then a payment provider
 * can collect the exact snapshotted total when the customer chooses to pay
 * online.
 */

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "fulfilled", "cancelled"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
};

/** What each status means to the person who placed the order. */
export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  pending: "We have your order and are checking the date. Nothing is charged yet.",
  confirmed: "Booked. It is in the diary and we will stay in touch as the day approaches.",
  fulfilled: "Delivered. Thank you.",
  cancelled: "This order was cancelled.",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Not paid",
  paid: "Paid",
  refunded: "Refunded",
};

/** What a customer may see. Owner notes are not in it, same rule as enquiries. */
export type CustomerOrder = Omit<OrderRecord, "ownerNotes">;

function forCustomer(order: OrderRecord): CustomerOrder {
  // Built field by field on purpose: a private field added to OrderRecord
  // later must not reach a customer just because it was added.
  return {
    id: order.id,
    reference: order.reference,
    token: order.token,
    userId: order.userId,
    name: order.name,
    email: order.email,
    phone: order.phone,
    eventDate: order.eventDate,
    guests: order.guests,
    address: order.address,
    notes: order.notes,
    lines: order.lines,
    subtotalMinor: order.subtotalMinor,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function toLine(row: OrderLineRecord): OrderLine {
  return {
    slug: row.slug,
    name: row.name,
    unit: row.unit,
    unitPriceMinor: row.unitPriceMinor,
    quantity: row.quantity,
    lineTotalMinor: row.lineTotalMinor,
  };
}

/**
 * Attach lines to orders in ONE query rather than one query per order.
 *
 * The dashboard lists every order, so a per-order lookup here is the
 * classic N+1: forty orders became forty-one round trips.
 */
async function withLines(rows: OrderRow[]): Promise<OrderRecord[]> {
  if (rows.length === 0) return [];

  const lineRows = await db.orderLines.find(
    { all: { orderId: { in: rows.map((row) => row.id) } } },
    { orderBy: "position" }
  );

  const byOrder = new Map<string, OrderLine[]>();
  for (const line of lineRows) {
    const existing = byOrder.get(line.orderId);
    if (existing) existing.push(toLine(line));
    else byOrder.set(line.orderId, [toLine(line)]);
  }

  return rows.map((row) => ({ ...row, lines: byOrder.get(row.id) ?? [] }));
}

async function oneWithLines(row: OrderRow | null): Promise<OrderRecord | null> {
  if (!row) return null;
  return (await withLines([row]))[0] ?? null;
}

/**
 * Place an order from a priced cart.
 *
 * The CART is the source of prices, not the request: it was built server
 * side from the catalog, so a customer cannot name their own total. The
 * lines are then snapshotted onto the order, so tomorrow's price change
 * never rewrites yesterday's order.
 *
 * The order and its lines are written in one transaction. An order whose
 * lines failed to insert would show the customer a total with nothing in
 * it, which is worse than no order at all.
 */
export async function placeOrder(
  cart: Cart,
  details: {
    userId: string | null;
    name: string;
    email: string;
    phone: string;
    eventDate: string;
    guests: number;
    address: string;
    notes: string;
  }
): Promise<OrderRecord> {
  if (cart.lines.length === 0) throw new Error("An order needs at least one line.");

  const created = await store.placeOrder(
    {
      userId: details.userId,
      name: details.name.trim(),
      email: details.email.trim().toLowerCase(),
      phone: details.phone.trim(),
      eventDate: details.eventDate,
      guests: details.guests,
      address: details.address.trim(),
      notes: details.notes.trim(),
      subtotalMinor: cart.subtotalMinor,
      // Today's currency, stored ON the order, so a later change to
      // lib/business.ts cannot reinterpret what this one was priced in.
      currency: business.currency,
      status: "pending",
      paymentStatus: "unpaid",
      paymentProvider: null,
      paymentReference: null,
      paidAt: null,
      ownerNotes: "",
    },
    cart.lines.map((line) => ({
      slug: line.product.slug,
      name: line.product.name,
      unit: line.product.unit,
      unitPriceMinor: line.product.priceMinor,
      quantity: line.quantity,
      lineTotalMinor: line.lineTotalMinor,
    }))
  );

  const row = recordFromRow<OrderRow>(created as Record<string, unknown>);
  const complete = await oneWithLines(row);
  if (!complete) throw new Error("The order was written but could not be read back.");
  return complete;
}

/**
 * The confirmation lookup. Matched on the unguessable token, never on the
 * id or the reference number, so this page can be public without letting
 * anyone read the order next to theirs.
 */
export async function findOrderByToken(token: string): Promise<CustomerOrder | null> {
  if (!token) return null;
  const order = await oneWithLines(await db.orders.findOne({ all: { token } }));
  return order ? forCustomer(order) : null;
}

export async function findOrderById(id: string): Promise<OrderRecord | null> {
  if (!id) return null;
  return oneWithLines(await db.orders.findOne({ all: { id } }));
}

/** Every order, newest first. Owner only; the route enforces that. */
export async function listAllOrders(): Promise<OrderRecord[]> {
  return withLines(
    await db.orders.find(undefined, { orderBy: "createdAt", direction: "desc" })
  );
}

/**
 * One person's orders, matched by account id OR email, so an order placed
 * as a guest appears once they sign up with the same address.
 */
export async function listOrdersForUser(
  userId: string,
  email: string
): Promise<CustomerOrder[]> {
  const rows = await db.orders.find(
    { any: [{ userId }, { email: email.toLowerCase() }] },
    { orderBy: "createdAt", direction: "desc" }
  );
  return (await withLines(rows)).map(forCustomer);
}

/**
 * Whether this order is that account's, by id. Used wherever an order id
 * arrives in a form field: the id is a request to act on an order, never
 * proof of owning it.
 */
export async function orderBelongsToUser(orderId: string, userId: string): Promise<boolean> {
  if (!orderId || !userId) return false;
  return (await db.orders.count({ all: { id: orderId, userId } })) > 0;
}

/** Returns the updated order so the caller can tell Praxi what changed. */
export async function updateOrder(
  id: string,
  patch: { status?: OrderStatus; ownerNotes?: string }
): Promise<OrderRecord | null> {
  const changes: Partial<OrderRow> = {};
  if (patch.status) changes.status = patch.status;
  if (patch.ownerNotes !== undefined) changes.ownerNotes = patch.ownerNotes.trim();
  if (Object.keys(changes).length === 0) return findOrderById(id);

  const [updated] = await db.orders.update({ all: { id } }, changes);
  return oneWithLines(updated ?? null);
}

/**
 * Record which provider is collecting, and its id for the attempt.
 *
 * The `paymentStatus: "unpaid"` in the WHERE is not decoration. A webhook
 * can land while the customer is still on the provider's page, and this
 * must not overwrite the reference of a payment that has already completed.
 */
export async function setOrderPaymentAttempt(
  id: string,
  provider: string,
  reference: string
): Promise<boolean> {
  const updated = await db.orders.update(
    { all: { id, paymentStatus: "unpaid" } },
    { paymentProvider: provider, paymentReference: reference }
  );
  return updated.length === 1;
}

/**
 * Mark an order paid, once.
 *
 * ONE ATOMIC STATEMENT. The `paymentStatus: "unpaid"` condition lives in the
 * WHERE, so when two webhook deliveries for the same payment arrive at the
 * same moment, exactly one of them updates a row and the other sees zero.
 * A read-then-write here would let both through.
 *
 * Returns whether THIS call was the one that marked it, so the caller can
 * tell "we just got paid" from "we already knew".
 */
export async function markOrderPaid(
  id: string,
  provider: string,
  reference: string
): Promise<{ changed: boolean; order: OrderRecord | null }> {
  const now = new Date().toISOString();
  const updated = await db.orders.update(
    { all: { id, paymentStatus: "unpaid" } },
    {
      paymentStatus: "paid",
      paymentProvider: provider,
      paymentReference: reference,
      paidAt: now,
    }
  );

  if (updated.length === 1) {
    return { changed: true, order: await oneWithLines(updated[0]!) };
  }
  // Already paid, or no such order. Both are "nothing for us to do".
  return { changed: false, order: await findOrderById(id) };
}

/** A refund the provider reported. Only a paid order can be refunded. */
export async function markOrderRefunded(id: string): Promise<boolean> {
  const updated = await db.orders.update(
    { all: { id, paymentStatus: "paid" } },
    { paymentStatus: "refunded" }
  );
  return updated.length === 1;
}

export interface OrderCounts extends Record<OrderStatus | "total", number> {
  revenueMinor: number;
}

/**
 * Real counts for the dashboard, including real zeros.
 *
 * Counted by Postgres through the order_counts view rather than by pulling
 * every order across the wire and counting them here.
 */
export async function orderCounts(): Promise<OrderCounts> {
  const rows = await counts.orders();

  const result = {
    total: 0,
    revenueMinor: 0,
    pending: 0,
    confirmed: 0,
    fulfilled: 0,
    cancelled: 0,
  } satisfies OrderCounts;

  for (const row of rows) {
    if (!(row.status in result)) continue;
    result[row.status as OrderStatus] = row.count;
    result.total += row.count;
    // Cancelled orders are not revenue, and counting them would flatter the
    // number in exactly the way a dashboard must not.
    if (row.status !== "cancelled") result.revenueMinor += row.subtotalMinor ?? 0;
  }
  return result;
}
