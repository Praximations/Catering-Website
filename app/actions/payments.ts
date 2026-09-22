"use server";

import { redirect } from "next/navigation";
import { findOrderByToken, setOrderPaymentAttempt } from "@/lib/orders";
import { activeProvider } from "@/lib/payments";
import { siteUrl } from "@/lib/site";
import { LIMITS, text } from "@/lib/validation";

/**
 * Start an online payment for an order.
 *
 * Addressed by the order's unguessable token, the same way its confirmation
 * page is, so a guest can pay for their own order without an account. The
 * token IS the authorization here: nothing else about the request is trusted,
 * and the amount comes from the stored order rather than from the form.
 */
export async function startPaymentAction(formData: FormData): Promise<void> {
  const provider = activeProvider();
  if (!provider) return;

  const token = text(formData, "token", LIMITS.id);
  // A UUID is 36 characters. Anything shorter is not a token, and refusing
  // early keeps a guessing attempt from costing a database lookup.
  if (token.length < 32) return;

  const order = await findOrderByToken(token);
  if (!order) return;
  // Nothing to collect on a cancelled order, and nothing to collect twice.
  if (order.status === "cancelled") return;
  if (order.paymentStatus !== "unpaid") return;

  const started = await provider.startCheckout(order, {
    success: `${siteUrl()}/orders/${order.token}?payment=success`,
    cancel: `${siteUrl()}/orders/${order.token}?payment=cancelled`,
  });

  await setOrderPaymentAttempt(order.id, provider.id, started.reference);

  // Outside any try/catch: redirect works by throwing.
  redirect(started.redirectUrl);
}
