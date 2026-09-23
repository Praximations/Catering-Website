import { db } from "./db";
import type { Where } from "./db/query";
import type {
  CustomerMessageRecord,
  MessageChannel,
  MessageSender,
  OrderRecord,
  UserRecord,
} from "./db/types";

/**
 * Conversations between customers and the business.
 *
 * A THREAD is keyed one of two ways:
 *
 *   u:<userId>   an account's conversation, which includes messages on any of
 *                that person's orders, even ones placed as a guest before they
 *                signed up (matched by email, the same rule as their orders).
 *   o:<orderId>  a guest's conversation about one order, reached through the
 *                order's unguessable link. It folds into the account thread
 *                the moment somebody signs up with that address.
 *
 * UNREAD is a timestamp, not a flag: `readAt` is null until the OTHER side has
 * opened the thread. Marking read is an UPDATE whose WHERE carries the unread
 * condition, so two tabs opening the same thread both succeed and neither
 * clobbers a time the other already set.
 */

export type ThreadKey = `u:${string}` | `o:${string}`;

export const MESSAGE_KINDS = ["message", "change_request"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export function userThread(userId: string): ThreadKey {
  return `u:${userId}`;
}

export function orderThread(orderId: string): ThreadKey {
  return `o:${orderId}`;
}

/** A thread key read back out of a URL or a form. Null when it is not one. */
export function parseThreadKey(value: string): ThreadKey | null {
  const match = /^(u|o):([0-9a-zA-Z-]{1,100})$/.exec(value);
  return match ? (value as ThreadKey) : null;
}

/* --------------------------------- writing --------------------------------- */

export interface NewMessage {
  userId: string | null;
  orderId: string | null;
  sender: MessageSender;
  kind?: MessageKind;
  body: string;
  channel?: MessageChannel;
  externalId?: string | null;
}

function toRow(input: NewMessage) {
  if (!input.userId && !input.orderId) {
    // The table refuses this too; saying so here gives a readable error.
    throw new Error("A message needs an account or an order to belong to.");
  }
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    orderId: input.orderId,
    sender: input.sender,
    kind: input.kind ?? "message",
    body: input.body.trim(),
    channel: input.channel ?? "web",
    readAt: null,
    externalId: input.externalId ?? null,
    createdAt: new Date().toISOString(),
  };
}

export async function createMessage(input: NewMessage): Promise<CustomerMessageRecord> {
  return db.customerMessages.insert(toRow(input));
}

/**
 * Insert a message that carries a provider id, once. Null means that id was
 * already stored: a redelivered webhook, which is an answer, not an error.
 * THE INSERT IS THE LOCK, as everywhere else in this codebase.
 */
export async function createMessageOnce(
  input: NewMessage & { externalId: string }
): Promise<CustomerMessageRecord | null> {
  return db.customerMessages.insertIfAbsent(toRow(input));
}

/* --------------------------------- reading --------------------------------- */

/** Everything in one account's conversation, oldest first. */
export async function listThreadForUser(
  userId: string,
  orderIds: readonly string[]
): Promise<CustomerMessageRecord[]> {
  return db.customerMessages.find(accountWhere(userId, orderIds), { orderBy: "createdAt" });
}

/** The messages about one order, whoever sent them, oldest first. */
export async function listThreadForOrder(orderId: string): Promise<CustomerMessageRecord[]> {
  return db.customerMessages.find({ all: { orderId } }, { orderBy: "createdAt" });
}

function accountWhere(
  userId: string,
  orderIds: readonly string[],
  extra: Partial<Record<keyof CustomerMessageRecord, string | null>> = {}
): Where<CustomerMessageRecord> {
  return orderIds.length > 0
    ? { all: extra, any: [{ userId }, { orderId: { in: orderIds } }] }
    : { all: { ...extra, userId } };
}

/** Owner messages a customer has not opened yet. Drives their badge. */
export async function countUnreadForCustomer(userId: string, orderIds: readonly string[]): Promise<number> {
  return db.customerMessages.count(accountWhere(userId, orderIds, { sender: "owner", readAt: null }));
}

/** Customer messages the owner has not opened yet, across every thread. */
export async function countUnreadForOwner(): Promise<number> {
  return db.customerMessages.count({ all: { sender: "customer", readAt: null } });
}

/* ------------------------------ marking read ------------------------------- */

export async function markReadByCustomer(userId: string, orderIds: readonly string[]): Promise<number> {
  const changed = await db.customerMessages.update(
    accountWhere(userId, orderIds, { sender: "owner", readAt: null }),
    { readAt: new Date().toISOString() }
  );
  return changed.length;
}

export async function markOrderReadByCustomer(orderId: string): Promise<number> {
  const changed = await db.customerMessages.update(
    { all: { orderId, sender: "owner", readAt: null } },
    { readAt: new Date().toISOString() }
  );
  return changed.length;
}

export async function markThreadReadByOwner(key: ThreadKey): Promise<number> {
  const now = new Date().toISOString();
  if (key.startsWith("o:")) {
    const changed = await db.customerMessages.update(
      { all: { orderId: key.slice(2), userId: null, sender: "customer", readAt: null } },
      { readAt: now }
    );
    return changed.length;
  }
  const userId = key.slice(2);
  const orderIds = await orderIdsForAccount(userId);
  const changed = await db.customerMessages.update(
    accountWhere(userId, orderIds, { sender: "customer", readAt: null }),
    { readAt: now }
  );
  return changed.length;
}

/* ------------------------------ conversations ------------------------------ */

/** The order ids that belong to an account: placed signed in, or under its email. */
export async function orderIdsForAccount(userId: string): Promise<string[]> {
  const user = await db.users.findOne({ all: { id: userId } });
  if (!user) return [];
  const orders = await db.orders.find({ any: [{ userId }, { email: user.email.toLowerCase() }] });
  return orders.map((order) => order.id);
}

export interface Conversation {
  key: ThreadKey;
  /** Set for an account thread. */
  userId: string | null;
  /** Set for a guest's order thread. */
  orderId: string | null;
  name: string;
  email: string;
  /** From their most recent order, for calling or texting back. May be empty. */
  phone: string;
  lastBody: string;
  lastSender: MessageSender;
  lastChannel: MessageChannel;
  lastAt: string;
  unread: number;
  total: number;
  hasChangeRequest: boolean;
  orderReferences: string[];
}

type OrderLite = Pick<OrderRecord, "id" | "userId" | "email" | "name" | "phone" | "reference" | "createdAt">;
type UserLite = Pick<UserRecord, "id" | "email" | "name">;

/**
 * Which thread a message belongs to, given the orders and accounts it might
 * point at. Exported so the rule can be tested without a database.
 */
export function resolveThreadKey(
  message: Pick<CustomerMessageRecord, "userId" | "orderId">,
  ordersById: ReadonlyMap<string, OrderLite>,
  userIdByEmail: ReadonlyMap<string, string>
): ThreadKey | null {
  if (message.userId) return userThread(message.userId);
  if (!message.orderId) return null;
  const order = ordersById.get(message.orderId);
  if (order?.userId) return userThread(order.userId);
  const byEmail = order ? userIdByEmail.get(order.email.toLowerCase()) : undefined;
  return byEmail ? userThread(byEmail) : orderThread(message.orderId);
}

/**
 * Every conversation, most recent first, with its unread count. Pure over its
 * inputs so it can be tested; listConversations feeds it from the database.
 */
export function buildConversations(
  messages: readonly CustomerMessageRecord[],
  orders: readonly OrderLite[],
  users: readonly UserLite[]
): Conversation[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const userIdByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user.id]));

  const latestOrderFor = (userId: string | null, email: string): OrderLite | undefined =>
    orders
      .filter((order) => (userId && order.userId === userId) || order.email.toLowerCase() === email.toLowerCase())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const threads = new Map<ThreadKey, Conversation>();

  for (const message of [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = resolveThreadKey(message, ordersById, userIdByEmail);
    if (!key) continue;

    let thread = threads.get(key);
    if (!thread) {
      const isAccount = key.startsWith("u:");
      const userId = isAccount ? key.slice(2) : null;
      const user = userId ? usersById.get(userId) : undefined;
      const order = isAccount ? undefined : ordersById.get(key.slice(2));
      const email = user?.email ?? order?.email ?? "";
      thread = {
        key,
        userId,
        orderId: isAccount ? null : key.slice(2),
        name: user?.name || order?.name || "Customer",
        email,
        phone: (latestOrderFor(userId, email) ?? order)?.phone ?? "",
        lastBody: "",
        lastSender: message.sender,
        lastChannel: message.channel,
        lastAt: message.createdAt,
        unread: 0,
        total: 0,
        hasChangeRequest: false,
        orderReferences: [],
      };
      threads.set(key, thread);
    }

    thread.lastBody = message.body;
    thread.lastSender = message.sender;
    thread.lastChannel = message.channel;
    thread.lastAt = message.createdAt;
    thread.total += 1;
    if (message.sender === "customer" && !message.readAt) thread.unread += 1;
    if (message.kind === "change_request" && message.sender === "customer" && !message.readAt) {
      thread.hasChangeRequest = true;
    }
    const reference = message.orderId ? ordersById.get(message.orderId)?.reference : undefined;
    if (reference && !thread.orderReferences.includes(reference)) thread.orderReferences.push(reference);
  }

  return [...threads.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function listConversations(): Promise<Conversation[]> {
  const messages = await db.customerMessages.find(undefined, { orderBy: "createdAt" });
  if (messages.length === 0) return [];

  // Only the orders and accounts the messages can point at, plus the orders of
  // those accounts for phone numbers: three reads, not one per message.
  const userIds = [...new Set(messages.map((m) => m.userId).filter((id): id is string => Boolean(id)))];
  const orderIds = [...new Set(messages.map((m) => m.orderId).filter((id): id is string => Boolean(id)))];

  const [users, directOrders] = await Promise.all([
    db.users.find({ all: { role: "customer" } }),
    orderIds.length > 0 ? db.orders.find({ all: { id: { in: orderIds } } }) : Promise.resolve([]),
  ]);
  const accountOrders =
    userIds.length > 0 ? await db.orders.find({ any: [{ userId: { in: userIds } }] }) : [];

  const orders = new Map<string, OrderLite>();
  for (const order of [...directOrders, ...accountOrders]) orders.set(order.id, order);

  return buildConversations(messages, [...orders.values()], users);
}

/** One conversation's messages, oldest first, for the owner. */
export async function listThread(key: ThreadKey): Promise<CustomerMessageRecord[]> {
  if (key.startsWith("o:")) return listThreadForOrder(key.slice(2));
  const userId = key.slice(2);
  return listThreadForUser(userId, await orderIdsForAccount(userId));
}
