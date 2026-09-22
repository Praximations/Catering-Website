import { handleWebhook } from "@/lib/payments";
import { stripeProvider } from "@/lib/payments/stripe";

/**
 * Stripe's webhook.
 *
 * Thin on purpose. Everything that decides whether to believe a delivery,
 * and what to do about it, is in lib/payments so that every provider takes
 * the same path. A second provider is a sibling of this file, not a second
 * implementation of the rules.
 */

/**
 * Never prerendered, and never cached. A cached webhook response would mean
 * the second delivery of an event was answered without being processed.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { status, body } = await handleWebhook(stripeProvider, request);
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
