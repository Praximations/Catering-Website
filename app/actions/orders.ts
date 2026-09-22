"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { belowMinimum, clearCart, getCart } from "@/lib/cart";
import { ORDER_STATUSES, placeOrder, updateOrder } from "@/lib/orders";
import { praxiOrderCreated, praxiOrderUpdated } from "@/lib/praxi";
import { getCurrentUser } from "@/lib/session";
import {
  checkEventDate,
  checkGuests,
  choice,
  integer,
  isEmail,
  LIMITS,
  MAX_GUESTS,
  Problems,
  text,
} from "@/lib/validation";

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

  const name = text(formData, "name", LIMITS.name);
  const email = text(formData, "email", LIMITS.email);
  const phone = text(formData, "phone", LIMITS.phone);
  const eventDate = text(formData, "eventDate", 10);
  const address = text(formData, "address", LIMITS.address);
  const notes = text(formData, "notes", LIMITS.notes);
  const guests = integer(formData, "guests");

  const problems = new Problems();
  problems.when(name.length < 2, "name", "Please tell us your name.");
  problems.when(!isEmail(email), "email", "We need an email address to confirm to.");
  problems.when(
    phone.length < 5,
    "phone",
    "A phone number, in case something changes on the day."
  );
  problems.when(address.length < 5, "address", "Where should we bring it?");

  switch (checkEventDate(eventDate)) {
    case "missing":
    case "malformed":
      problems.add("eventDate", "Pick the date you need it.");
      break;
    case "past":
      problems.add("eventDate", "That date has already passed.");
      break;
  }

  switch (checkGuests(guests)) {
    case "missing":
      problems.add("guests", "Roughly how many people are eating?");
      break;
    case "too_many":
      problems.add("guests", `Please call us for an event over ${MAX_GUESTS} people.`);
      break;
  }

  // `guests === null` is already reported above; repeating it here is what
  // narrows the type without a cast the compiler would simply believe.
  if (problems.any || guests === null) return { fieldErrors: problems.fieldErrors };

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

  const id = text(formData, "id", LIMITS.id);
  const status = choice(formData, "status", ORDER_STATUSES);
  if (!id || !status) return;

  const ownerNotes = formData.has("ownerNotes")
    ? text(formData, "ownerNotes", LIMITS.notes)
    : undefined;

  const updated = await updateOrder(id, {
    status,
    ...(ownerNotes === undefined ? {} : { ownerNotes }),
  });
  if (updated) await praxiOrderUpdated(updated);

  revalidatePath("/admin");
  revalidatePath("/account");
}
