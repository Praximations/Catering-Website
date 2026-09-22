"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addToCart, clearCart } from "@/lib/cart";
import { createCustomerMessage } from "@/lib/customer-messages";
import { listOrdersForUser, orderBelongsToUser } from "@/lib/orders";
import { saveInfo } from "@/lib/saved-info";
import { getCurrentUser, requireUser } from "@/lib/session";
import { choice, LIMITS, lines, text } from "@/lib/validation";

/**
 * The customer portal's writes, and the owner's replies.
 *
 * Every action here re-checks who is asking, and every one that names a
 * record checks that the record belongs to them. An id in a form field is
 * a request, not a fact.
 */

/** A saved list stays short enough to stay readable on the page. */
const MAX_SAVED_LINES = 12;
const MESSAGE_KINDS = ["message", "change_request"] as const;

export async function saveCustomerInfoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await saveInfo(user.id, {
    venues: lines(text(formData, "venues", LIMITS.notes), MAX_SAVED_LINES),
    addresses: lines(text(formData, "addresses", LIMITS.notes), MAX_SAVED_LINES),
    guestPreferences: text(formData, "guestPreferences", 1000),
    dietaryInformation: text(formData, "dietaryInformation", 1000),
    favoriteMenuSlugs: formData
      .getAll("favoriteMenuSlugs")
      .filter((value): value is string => typeof value === "string")
      .map((slug) => slug.slice(0, 64))
      .slice(0, MAX_SAVED_LINES),
  });
  revalidatePath("/account");
}

export async function sendCustomerMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const body = text(formData, "body", LIMITS.message);
  if (body.length < 2) return;

  // An order id from the form is only honoured when it is one of THEIRS.
  // Otherwise a customer could attach their message to a stranger's order.
  const requestedOrderId = text(formData, "orderId", LIMITS.id);
  const orders = await listOrdersForUser(user.id, user.email);
  const orderId = orders.some((order) => order.id === requestedOrderId)
    ? requestedOrderId
    : null;

  const kind = choice(formData, "kind", MESSAGE_KINDS) ?? "message";

  await createCustomerMessage({ userId: user.id, orderId, sender: "customer", kind, body });
  revalidatePath("/account");
  revalidatePath("/admin");
}

export async function replyCustomerMessageAction(formData: FormData): Promise<void> {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== "owner") return;

  const userId = text(formData, "userId", LIMITS.id);
  const body = text(formData, "body", LIMITS.message);
  if (!userId || body.length < 2) return;

  // Same rule as above, from the other side: the owner may reply about any
  // customer, but the order the reply is filed under still has to be that
  // customer's, or the thread shows up on the wrong person's page.
  const requestedOrderId = text(formData, "orderId", LIMITS.id);
  const orderId =
    requestedOrderId && (await orderBelongsToUser(requestedOrderId, userId))
      ? requestedOrderId
      : null;

  await createCustomerMessage({
    userId,
    orderId,
    sender: "owner",
    kind: "message",
    body,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
}

export async function reorderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const orderId = text(formData, "orderId", LIMITS.id);
  const order = (await listOrdersForUser(user.id, user.email)).find(
    (candidate) => candidate.id === orderId
  );
  if (!order) return;

  await clearCart();
  for (const line of order.lines) await addToCart(line.slug, line.quantity);
  revalidatePath("/", "layout");
  redirect("/cart");
}
