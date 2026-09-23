"use server";

import { revalidatePath } from "next/cache";
import { addToCart, clearCart, removeFromCart, setCartQuantity } from "@/lib/cart";
import { integer, text } from "@/lib/validation";

/**
 * Cart mutations. Plain form actions, no client JavaScript, so adding to
 * the cart works before React has hydrated and keeps working if it never
 * does.
 *
 * Quantities are clamped and slugs are checked against the catalog inside
 * lib/cart.ts, so nothing here trusts the form.
 */

/** Long enough for any slug in lib/shop.ts, short enough to bound the key. */
const MAX_SLUG = 64;

function quantity(formData: FormData): number {
  // One is the sensible reading of a missing or malformed quantity on an
  // "add to cart" button. lib/cart.ts clamps the upper bound.
  return integer(formData, "quantity") ?? 1;
}

export async function addToCartAction(formData: FormData): Promise<void> {
  await addToCart(text(formData, "slug", MAX_SLUG), quantity(formData));
  // The header badge and the shop page both show cart state.
  revalidatePath("/", "layout");
}

/** What the add button shows afterwards. `at` makes two adds in a row distinct. */
export interface AddToCartState {
  status: "idle" | "added" | "error";
  message?: string;
  at?: number;
}

/**
 * The same add, for a button that confirms it. Still a plain form post, so it
 * works before hydration; with JavaScript the button turns into "Added" for a
 * moment instead of the page simply reloading.
 */
export async function addToCartWithFeedbackAction(
  _previous: AddToCartState,
  formData: FormData
): Promise<AddToCartState> {
  const result = await addToCart(text(formData, "slug", MAX_SLUG), quantity(formData));
  revalidatePath("/", "layout");
  if (result === "added") return { status: "added", at: Date.now() };
  return {
    status: "error",
    message:
      result === "unavailable"
        ? "That is not available right now."
        : "Your order is full. Check out or remove something first.",
    at: Date.now(),
  };
}

export async function setQuantityAction(formData: FormData): Promise<void> {
  await setCartQuantity(text(formData, "slug", MAX_SLUG), quantity(formData));
  revalidatePath("/", "layout");
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  await removeFromCart(text(formData, "slug", MAX_SLUG));
  revalidatePath("/", "layout");
}

export async function clearCartAction(): Promise<void> {
  await clearCart();
  revalidatePath("/", "layout");
}
