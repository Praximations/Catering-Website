import { createHmac, timingSafeEqual } from "node:crypto";
import type { CustomerOrder } from "./orders";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const isStripeConfigured = Boolean(secretKey && webhookSecret);

interface CheckoutSessionResponse {
  id: string;
  url: string | null;
}

export async function createStripeCheckout(
  order: CustomerOrder,
  siteUrl: string
): Promise<CheckoutSessionResponse> {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const body = new URLSearchParams({
    mode: "payment",
    client_reference_id: order.id,
    customer_email: order.email,
    success_url: `${siteUrl}/orders/${order.token}?payment=success`,
    cancel_url: `${siteUrl}/orders/${order.token}?payment=cancelled`,
    "metadata[order_id]": order.id,
    "metadata[order_token]": order.token,
    "payment_intent_data[metadata][order_id]": order.id,
  });

  order.lines.forEach((line, index) => {
    body.set(`line_items[${index}][price_data][currency]`, "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(line.unitPriceMinor));
    body.set(`line_items[${index}][price_data][product_data][name]`, line.name);
    body.set(`line_items[${index}][quantity]`, String(line.quantity));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as CheckoutSessionResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe checkout failed with status ${response.status}.`);
  }
  return payload;
}

export function verifyStripeSignature(payload: string, signature: string | null): boolean {
  if (!webhookSecret || !signature) return false;
  const pieces = signature.split(",").map((piece) => piece.split("=", 2));
  const timestamp = pieces.find(([key]) => key === "t")?.[1];
  const candidates = pieces.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || candidates.length === 0) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return candidates.some((candidate) => {
    if (!candidate || candidate.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(expected, "hex"));
  });
}
