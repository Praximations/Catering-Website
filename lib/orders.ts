import {
  newId,
  readData,
  updateData,
  type OrderLine,
  type OrderRecord,
  type OrderStatus,
} from "./store";
import type { Cart } from "./cart";

/**
 * Orders. What a customer actually bought, as opposed to an enquiry,
 * which is a question about whether we can cook it at all.
 *
 * Payment is optional. Orders exist independently, then Stripe can collect
 * the exact snapshotted total when the customer chooses online payment.
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
    status: order.status,
    paymentStatus: order.paymentStatus,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Place an order from a priced cart.
 *
 * The CART is the source of prices, not the request: it was built server
 * side from the catalog, so a customer cannot name their own total. The
 * lines are then snapshotted onto the order, so tomorrow's price change
 * never rewrites yesterday's order.
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
  const now = new Date().toISOString();
  const lines: OrderLine[] = cart.lines.map((line) => ({
    slug: line.product.slug,
    name: line.product.name,
    unit: line.product.unit,
    unitPriceMinor: line.product.priceMinor,
    quantity: line.quantity,
    lineTotalMinor: line.lineTotalMinor,
  }));

  return updateData((data) => {
    // Sequential and readable. Safe because every write is serialized
    // through the queue in store.ts, and orders are never deleted.
    const reference = String(1000 + data.orders.length + 1);
    const order: OrderRecord = {
      id: newId(),
      reference,
      token: newId(),
      userId: details.userId,
      name: details.name.trim(),
      email: details.email.trim().toLowerCase(),
      phone: details.phone.trim(),
      eventDate: details.eventDate,
      guests: details.guests,
      address: details.address.trim(),
      notes: details.notes.trim(),
      lines,
      subtotalMinor: cart.subtotalMinor,
      status: "pending",
      paymentStatus: "unpaid",
      stripeCheckoutSessionId: null,
      paidAt: null,
      ownerNotes: "",
      createdAt: now,
      updatedAt: now,
    };
    data.orders.push(order);
    return order;
  });
}

/**
 * The confirmation lookup. Matched on the unguessable token, never on the
 * id or the reference number, so this page can be public without letting
 * anyone read the order next to theirs.
 */
export async function findOrderByToken(token: string): Promise<CustomerOrder | null> {
  if (!token) return null;
  const data = await readData();
  const order = data.orders.find((o) => o.token === token);
  return order ? forCustomer(order) : null;
}

/** Every order, newest first. Owner only; the route enforces that. */
export async function listAllOrders(): Promise<OrderRecord[]> {
  const data = await readData();
  return [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * One person's orders, matched by account id AND email, so an order
 * placed as a guest appears once they sign up with the same address.
 */
export async function listOrdersForUser(
  userId: string,
  email: string
): Promise<CustomerOrder[]> {
  const data = await readData();
  const address = email.toLowerCase();
  return data.orders
    .filter((order) => order.userId === userId || order.email === address)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(forCustomer);
}

/** Returns the updated order so the caller can tell Praxi what changed. */
export async function updateOrder(
  id: string,
  patch: { status?: OrderStatus; ownerNotes?: string }
): Promise<OrderRecord | null> {
  return updateData((data) => {
    const order = data.orders.find((o) => o.id === id);
    if (!order) return null;
    if (patch.status) order.status = patch.status;
    if (patch.ownerNotes !== undefined) order.ownerNotes = patch.ownerNotes.trim();
    order.updatedAt = new Date().toISOString();
    // A copy, so a later mutation of the stored row cannot surprise the caller.
    return { ...order };
  });
}

export async function setOrderCheckoutSession(
  id: string,
  stripeCheckoutSessionId: string
): Promise<void> {
  await updateData((data) => {
    const order = data.orders.find((candidate) => candidate.id === id);
    if (!order || order.paymentStatus === "paid") return;
    order.stripeCheckoutSessionId = stripeCheckoutSessionId;
    order.updatedAt = new Date().toISOString();
  });
}

export async function markOrderPaid(id: string, stripeCheckoutSessionId: string): Promise<boolean> {
  return updateData((data) => {
    const order = data.orders.find((candidate) => candidate.id === id);
    if (!order) return false;
    if (order.paymentStatus === "paid") return true;
    order.paymentStatus = "paid";
    order.stripeCheckoutSessionId = stripeCheckoutSessionId;
    order.paidAt = new Date().toISOString();
    order.updatedAt = order.paidAt;
    return true;
  });
}

/** Real counts for the dashboard, including real zeros. */
export async function orderCounts(): Promise<Record<OrderStatus | "total" | "revenueMinor", number>> {
  const data = await readData();
  const counts = {
    total: data.orders.length,
    // Cancelled orders are not revenue, and counting them would flatter
    // the number in exactly the way a dashboard must not.
    revenueMinor: data.orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.subtotalMinor, 0),
  } as Record<OrderStatus | "total" | "revenueMinor", number>;

  for (const status of ORDER_STATUSES) {
    counts[status] = data.orders.filter((o) => o.status === status).length;
  }
  return counts;
}
