import { db } from "./db";
import type { CustomerMessageRecord } from "./db/types";

export async function listMessagesForUser(userId: string): Promise<CustomerMessageRecord[]> {
  return db.customerMessages.find({ all: { userId } }, { orderBy: "createdAt" });
}

export type AdminCustomerMessage = CustomerMessageRecord & {
  customerName: string;
  customerEmail: string;
  orderReference: string | null;
};

/**
 * Every thread, newest first, with the customer and order each belongs to.
 *
 * Three queries rather than two per message: the messages, then the users
 * and orders they mention, looked up in one go each.
 */
export async function listAllCustomerMessages(): Promise<AdminCustomerMessage[]> {
  const messages = await db.customerMessages.find(undefined, {
    orderBy: "createdAt",
    direction: "desc",
  });
  if (messages.length === 0) return [];

  const userIds = [...new Set(messages.map((message) => message.userId))];
  const orderIds = [
    ...new Set(messages.map((message) => message.orderId).filter((id): id is string => !!id)),
  ];

  const [users, orders] = await Promise.all([
    db.users.find({ all: { id: { in: userIds } } }),
    orderIds.length > 0 ? db.orders.find({ all: { id: { in: orderIds } } }) : Promise.resolve([]),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const referenceById = new Map(orders.map((order) => [order.id, order.reference]));

  return messages.map((message) => ({
    ...message,
    customerName: userById.get(message.userId)?.name ?? "Customer",
    customerEmail: userById.get(message.userId)?.email ?? "",
    orderReference: message.orderId ? referenceById.get(message.orderId) ?? null : null,
  }));
}

export async function createCustomerMessage(input: {
  userId: string;
  orderId: string | null;
  sender: "customer" | "owner";
  kind: "message" | "change_request";
  body: string;
}): Promise<CustomerMessageRecord> {
  return db.customerMessages.insert({
    id: crypto.randomUUID(),
    userId: input.userId,
    orderId: input.orderId,
    sender: input.sender,
    kind: input.kind,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  });
}
