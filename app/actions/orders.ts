"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { belowMinimum, clearCart, getCart } from "@/lib/cart";
import { ORDER_STATUSES, placeOrder, updateOrder } from "@/lib/orders";
import { praxiOrderCreated, praxiOrderUpdated } from "@/lib/praxi";
import { getCurrentUser } from "@/lib/session";
import type { OrderStatus } from "@/lib/store";

/**
 * Checkout, and the owner moving an order along.
 *
 * Prices never come from the form. getCart() rebuilds the cart from the
 * catalog on the server, and that priced cart is what becomes the order.
 */

/** Only ever describes a FAILURE: success leaves by redirecting. */
export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES = 2000;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function checkoutAction(
  _prevState: CheckoutState | undefined,
  formData: FormData
): Promise<CheckoutState> {
  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { error: "Your cart is empty." };
  }

  const short = belowMinimum(cart);
  if (short.length > 0) {
    const first = short[0]!;
    return {
      error: `${first.product.name} has a minimum of ${first.product.minQuantity}. Adjust it in the cart and try again.`,
    };
  }

  const name = text(formData, "name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const eventDate = text(formData, "eventDate");
  const address = text(formData, "address");
  const notes = text(formData, "notes").slice(0, MAX_NOTES);
  const guests = Number.parseInt(text(formData, "guests"), 10);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "We need an email address to confirm to.";
  if (phone.length < 5) fieldErrors.phone = "A phone number, in case something changes on the day.";
  if (address.length < 5) fieldErrors.address = "Where should we bring it?";

  if (!DATE_RE.test(eventDate)) {
    fieldErrors.eventDate = "Pick the date you need it.";
  } else {
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) fieldErrors.eventDate = "That is not a real date.";
    else if (parsed < startOfToday()) fieldErrors.eventDate = "That date has already passed.";
  }

  if (!Number.isInteger(guests) || guests < 1) {
    fieldErrors.guests = "Roughly how many people are eating?";
  } else if (guests > 5000) {
    fieldErrors.guests = "Please call us for an event that size.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const user = await getCurrentUser();
  const order = await placeOrder(cart, {
    userId: user?.id ?? null,
    name,
    email,
    phone,
    eventDate,
    guests,
    address,
    notes,
  });

  await clearCart();

  // Praxi hears about it, and cannot break checkout if it is down: the
  // order is already saved and this call swallows its own failures.
  await praxiOrderCreated(order);

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/admin");

  // Post, redirect, get. Returning an inline success state here does not
  // work: clearing the cart re-renders /cart into its empty state, which
  // replaces the very form that would have shown the confirmation, and
  // the customer is left looking at an empty cart wondering whether the
  // order went through. The confirmation is its own page, addressed by
  // the order's unguessable token so a guest can reach their own and
  // nobody else's. Outside any try/catch, because redirect throws.
  redirect(`/orders/${order.token}`);
}

export async function updateOrderAction(formData: FormData): Promise<void> {
  // Checked here as well as on the page: a Server Action is a public
  // endpoint and can be called without the dashboard ever being loaded.
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return;

  const id = text(formData, "id");
  const status = text(formData, "status") as OrderStatus;
  if (!id || !ORDER_STATUSES.includes(status)) return;

  const ownerNotes = formData.has("ownerNotes")
    ? text(formData, "ownerNotes").slice(0, MAX_NOTES)
    : undefined;

  const updated = await updateOrder(id, {
    status,
    ...(ownerNotes === undefined ? {} : { ownerNotes }),
  });
  if (updated) await praxiOrderUpdated(updated);

  revalidatePath("/admin");
  revalidatePath("/account");
}
