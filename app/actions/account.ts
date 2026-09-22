"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addToCart, clearCart } from "@/lib/cart";
import { createCustomerMessage } from "@/lib/customer-messages";
import { listOrdersForUser } from "@/lib/orders";
import { saveInfo } from "@/lib/saved-info";
import { getCurrentUser, requireUser } from "@/lib/session";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function saveCustomerInfoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await saveInfo(user.id, {
    venues: lines(text(formData, "venues")),
    addresses: lines(text(formData, "addresses")),
    guestPreferences: text(formData, "guestPreferences").slice(0, 1000),
    dietaryInformation: text(formData, "dietaryInformation").slice(0, 1000),
    favoriteMenuSlugs: formData
      .getAll("favoriteMenuSlugs")
      .filter((value): value is string => typeof value === "string")
      .slice(0, 12),
  });
  revalidatePath("/account");
}

export async function sendCustomerMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const body = text(formData, "body");
  if (body.length < 2) return;

  const requestedOrderId = text(formData, "orderId");
  const orders = await listOrdersForUser(user.id, user.email);
  const orderId = orders.some((order) => order.id === requestedOrderId)
    ? requestedOrderId
    : null;
  const kind = text(formData, "kind") === "change_request" ? "change_request" : "message";

  await createCustomerMessage({ userId: user.id, orderId, sender: "customer", kind, body });
  revalidatePath("/account");
  revalidatePath("/admin");
}

export async function replyCustomerMessageAction(formData: FormData): Promise<void> {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== "owner") return;
  const userId = text(formData, "userId");
  const body = text(formData, "body");
  if (!userId || body.length < 2) return;

  await createCustomerMessage({
    userId,
    orderId: text(formData, "orderId") || null,
    sender: "owner",
    kind: "message",
    body,
  });
  revalidatePath("/account");
  revalidatePath("/admin");
}

export async function reorderAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const orderId = text(formData, "orderId");
  const order = (await listOrdersForUser(user.id, user.email)).find(
    (candidate) => candidate.id === orderId
  );
  if (!order) return;

  await clearCart();
  for (const line of order.lines) await addToCart(line.slug, line.quantity);
  revalidatePath("/", "layout");
  redirect("/cart");
}
