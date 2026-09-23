"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addToCart, clearCart } from "@/lib/cart";
import { listOrdersForUser } from "@/lib/orders";
import { saveInfo } from "@/lib/saved-info";
import { requireUser } from "@/lib/session";
import { LIMITS, lines, text } from "@/lib/validation";

/**
 * The customer's account: saved details and reordering. Messages live in
 * app/actions/messages.ts.
 *
 * Every action here re-checks who is asking, and every one that names a
 * record checks that the record belongs to them. An id in a form field is
 * a request, not a fact.
 */

/** A saved list stays short enough to stay readable on the page. */
const MAX_SAVED_LINES = 12;

export interface SaveDetailsState {
  ok?: boolean;
  at?: number;
}

export async function saveCustomerInfoAction(
  _previous: SaveDetailsState,
  formData: FormData
): Promise<SaveDetailsState> {
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
  revalidatePath("/account", "layout");
  return { ok: true, at: Date.now() };
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
