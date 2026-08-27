"use server";

import { revalidatePath } from "next/cache";
import { addToCart, clearCart, removeFromCart, setCartQuantity } from "@/lib/cart";

/**
 * Cart mutations. Plain form actions, no client JavaScript, so adding to
 * the cart works before React has hydrated and keeps working if it never
 * does.
 *
 * Quantities are clamped and slugs are checked against the catalog inside
 * lib/cart.ts, so nothing here trusts the form.
 */

function quantityFrom(formData: FormData, key: string, fallback: number): number {
  const raw = formData.get(key);
  const parsed = Number.parseInt(typeof raw === "string" ? raw : "", 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function slugFrom(formData: FormData): string {
  const slug = formData.get("slug");
  return typeof slug === "string" ? slug : "";
}

export async function addToCartAction(formData: FormData): Promise<void> {
  await addToCart(slugFrom(formData), quantityFrom(formData, "quantity", 1));
  // The header badge and the shop page both show cart state.
  revalidatePath("/", "layout");
}

export async function setQuantityAction(formData: FormData): Promise<void> {
  await setCartQuantity(slugFrom(formData), quantityFrom(formData, "quantity", 1));
  revalidatePath("/", "layout");
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  await removeFromCart(slugFrom(formData));
  revalidatePath("/", "layout");
}

export async function clearCartAction(): Promise<void> {
  await clearCart();
  revalidatePath("/", "layout");
}
