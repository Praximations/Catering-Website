"use server";

import { revalidatePath } from "next/cache";
import { clientAddress } from "@/lib/client-address";
import {
  createMessage,
  markOrderReadByCustomer,
  markReadByCustomer,
  markThreadReadByOwner,
  MESSAGE_KINDS,
  orderIdsForAccount,
  parseThreadKey,
} from "@/lib/messages";
import { findOrderById, findOrderByToken, listOrdersForUser, orderBelongsToUser } from "@/lib/orders";
import { bucketFor, checkRateLimit, MESSAGE_LIMIT } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { sendText } from "@/lib/sms";
import { db } from "@/lib/db";
import { choice, flag, LIMITS, text } from "@/lib/validation";

/**
 * Messages between customers and the business, from all three places they
 * are written: an order page (no account needed, the token is the key), the
 * customer's account, and the Owner Portal.
 *
 * Every action re-checks who is asking, and every id that arrives in a form is
 * checked to belong to the caller. An id in a form field is a request, not
 * proof of ownership.
 */

export interface MessageFormState {
  ok?: boolean;
  error?: string;
  /** A soft problem: the message was saved, but something extra did not work. */
  warning?: string;
  /** Distinct per send, so a form can clear itself after each success. */
  at?: number;
}

const MIN_BODY = 2;

function refresh() {
  revalidatePath("/account", "layout");
  revalidatePath("/admin", "layout");
}

/* ---------------------------- from an order page --------------------------- */

export async function sendOrderMessageAction(
  _previous: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  const token = text(formData, "token", LIMITS.id);
  const body = text(formData, "body", LIMITS.message);
  if (body.length < MIN_BODY) return { error: "Write a message first." };

  // The token is the credential: whoever holds the link is whoever placed it.
  const order = await findOrderByToken(token);
  if (!order) return { error: "That order could not be found." };

  const limit = await checkRateLimit(bucketFor("order-message", await clientAddress()), MESSAGE_LIMIT);
  if (!limit.allowed) return { error: "That is a lot of messages. Please call us instead." };

  await createMessage({
    userId: order.userId,
    orderId: order.id,
    sender: "customer",
    kind: choice(formData, "kind", MESSAGE_KINDS) ?? "message",
    body,
  });
  revalidatePath(`/orders/${order.token}`);
  refresh();
  return { ok: true, at: Date.now() };
}

export async function markOrderReadAction(token: string): Promise<void> {
  const order = await findOrderByToken(String(token).slice(0, LIMITS.id));
  if (order) await markOrderReadByCustomer(order.id);
}

/* ---------------------------- from an account ----------------------------- */

export async function sendAccountMessageAction(
  _previous: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const body = text(formData, "body", LIMITS.message);
  if (body.length < MIN_BODY) return { error: "Write a message first." };

  // Only honoured when it is one of THEIR orders, so a customer cannot attach
  // a message to a stranger's order.
  const requestedOrderId = text(formData, "orderId", LIMITS.id);
  const orders = await listOrdersForUser(user.id, user.email);
  const orderId = orders.some((order) => order.id === requestedOrderId) ? requestedOrderId : null;

  await createMessage({
    userId: user.id,
    orderId,
    sender: "customer",
    kind: choice(formData, "kind", MESSAGE_KINDS) ?? "message",
    body,
  });
  refresh();
  return { ok: true, at: Date.now() };
}

export async function markAccountReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markReadByCustomer(user.id, await orderIdsForAccount(user.id));
  revalidatePath("/", "layout");
}

/* ------------------------------ from the owner ----------------------------- */

export async function ownerReplyAction(
  _previous: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== "owner") return { error: "Only the owner can reply here." };

  const key = parseThreadKey(text(formData, "thread", LIMITS.id + 2));
  const body = text(formData, "body", LIMITS.message);
  if (!key) return { error: "That conversation could not be found." };
  if (body.length < MIN_BODY) return { error: "Write a reply first." };

  let userId: string | null = null;
  let orderId: string | null = null;
  let phone = "";

  if (key.startsWith("u:")) {
    userId = key.slice(2);
    const account = await db.users.findOne({ all: { id: userId } });
    if (!account) return { error: "That customer's account no longer exists." };
    // The order a reply is filed under has to be THAT customer's, or the
    // thread would show up on the wrong person's page.
    const requested = text(formData, "orderId", LIMITS.id);
    orderId = requested && (await orderBelongsToUser(requested, userId)) ? requested : null;
    const recent = await listOrdersForUser(userId, account.email);
    phone = recent[0]?.phone ?? "";
  } else {
    orderId = key.slice(2);
    const order = await findOrderById(orderId);
    if (!order) return { error: "That order no longer exists." };
    phone = order.phone;
  }

  const wantsText = flag(formData, "sms");
  let warning: string | undefined;
  let channel: "web" | "sms" = "web";
  let externalId: string | null = null;

  if (wantsText) {
    const sent = await sendText(phone, body);
    if (sent.ok) {
      channel = "sms";
      externalId = sent.id;
    } else {
      warning = `Saved, but the text was not sent: ${sent.error}`;
    }
  }

  await createMessage({ userId, orderId, sender: "owner", body, channel, externalId });
  await markThreadReadByOwner(key);
  refresh();
  return { ok: true, warning, at: Date.now() };
}

export async function markThreadReadAction(thread: string): Promise<void> {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== "owner") return;
  const key = parseThreadKey(String(thread).slice(0, LIMITS.id + 2));
  if (!key) return;
  if ((await markThreadReadByOwner(key)) > 0) revalidatePath("/admin", "layout");
}
