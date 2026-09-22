import { db } from "../db";
import { findOrderById, markOrderPaid, markOrderRefunded } from "../orders";
import { stripeProvider } from "./stripe";
import type { PaymentEvent, PaymentProvider } from "./types";

/**
 * Which providers exist, and the one shared path a webhook takes.
 *
 * ADDING A PROVIDER: write lib/payments/<name>.ts against PaymentProvider,
 * add it to PROVIDERS, and add a route that calls handleWebhook with it.
 * Everything below is provider-agnostic, so the ordering, the dedup, the
 * amount check and the audit trail are the same for all of them rather than
 * being reimplemented, slightly differently, per integration.
 */

export const PROVIDERS: readonly PaymentProvider[] = [stripeProvider];

/** The provider that takes payments, or null when none is configured. */
export function activeProvider(): PaymentProvider | null {
  return PROVIDERS.find((provider) => provider.configured) ?? null;
}

/** For the UI: whether to offer paying online at all. */
export const isPaymentConfigured = PROVIDERS.some((provider) => provider.configured);

export function findProvider(id: string): PaymentProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Every origin a Pay button may end up submitting to, for the CSP's
 * form-action. Only CONFIGURED providers, so a policy never names a host this
 * deployment cannot reach.
 */
export function checkoutOrigins(): string[] {
  return PROVIDERS.filter((provider) => provider.configured).flatMap(
    (provider) => [...provider.checkoutOrigins]
  );
}

export type WebhookOutcome =
  | { status: 400; body: { error: string } }
  | { status: 200; body: { received: true; outcome: string } };

/**
 * One webhook delivery, from signature to stored consequence.
 *
 * THE ORDER OF THESE STEPS IS THE SECURITY MODEL:
 *
 *   1. Verify the signature. Nothing else looks at the body first.
 *   2. Claim the event id. The INSERT is the lock, so a redelivery, a replay
 *      inside the signature's time tolerance, and two instances handed the
 *      same event all lose the race and stop here.
 *   3. Find the order the event names. A valid signature proves the provider
 *      sent it, not that it concerns an order of ours.
 *   4. Check the amount and currency against the ORDER. An event that says a
 *      different number than the order is owed is refused, not applied.
 *   5. Apply it, in one conditional statement, so applying it twice cannot
 *      happen even if steps 2 and 3 were somehow both passed twice.
 *
 * Every path writes down what happened, including the refusals, because "a
 * payment did not show up" is answered by reading this.
 */
export async function handleWebhook(
  provider: PaymentProvider,
  request: Request
): Promise<WebhookOutcome> {
  // The RAW bytes. A signature is over exactly what was sent, and
  // re-serializing parsed JSON does not reproduce it.
  const rawBody = await request.text();

  const read = await provider.readWebhook(rawBody, request.headers);
  if (!read.ok) {
    // No detail in the response: an unverified caller learns only that it
    // was refused.
    console.warn(`[payments] refused a ${provider.id} webhook: ${read.reason}`);
    return { status: 400, body: { error: read.reason } };
  }

  const event = read.event;

  // Claim it. A null here means somebody already has.
  const claimed = await db.paymentEvents.insertIfAbsent({
    id: event.id,
    provider: provider.id,
    type: event.type,
    orderId: null,
    receivedAt: new Date().toISOString(),
    outcome: "",
  });
  if (!claimed) {
    return { status: 200, body: { received: true, outcome: "duplicate" } };
  }

  let applied: Applied;
  try {
    applied = await apply(provider, event);
  } catch (error) {
    /**
     * RELEASE THE CLAIM. Without this, a transient failure inside apply()
     * leaves the claim row behind, the provider retries, the retry is told
     * "duplicate", the provider stops retrying, and an order the customer has
     * been CHARGED for stays unpaid forever. A storage timeout is exactly the
     * kind of failure a retry is supposed to fix.
     *
     * lib/control.ts releases its idempotency claim on failure for the same
     * reason. This path did not, which is the more expensive place to miss it.
     */
    await db.paymentEvents.remove({ all: { id: event.id } }).catch(() => undefined);
    console.error(`[payments] ${provider.id} event ${event.id} failed, claim released:`, error);
    // 500, so the provider retries. Answering 200 would tell it not to.
    throw error;
  }

  await db.paymentEvents.update(
    { all: { id: event.id } },
    {
      // Only an order we actually found. payment_events.order_id is a foreign
      // key, so writing an id that is not in orders, or a string that is not a
      // uuid, turns a handled event into a 500 and, with the claim row already
      // written, into a payment that is never recorded.
      orderId: applied.orderId,
      outcome: applied.outcome,
    }
  );
  return { status: 200, body: { received: true, outcome: applied.outcome } };
}

interface Applied {
  /** Human readable, written to the event row and returned to the provider. */
  outcome: string;
  /**
   * The order this actually touched, or null.
   *
   * Returned rather than kept in module scope, because two deliveries handled
   * at once in one process would read each other's value.
   */
  orderId: string | null;
}

/** Shorthand, so each branch below reads as one line. */
const nothing = (outcome: string): Applied => ({ outcome, orderId: null });

/** What the event means for the order, once it is known to be genuine and new. */
async function apply(provider: PaymentProvider, event: PaymentEvent): Promise<Applied> {
  if (event.kind === "ignored") return nothing(`ignored ${event.type}`);

  if (!event.orderId) {
    // Genuine, and about something that is not ours, or about an order whose
    // metadata was lost. Either way there is nothing to change.
    return nothing(`no order id on ${event.type}`);
  }

  const order = await findOrderById(event.orderId);
  // Null, not event.orderId: the column is a uuid foreign key, so writing an
  // id that is not in orders fails the write rather than recording the event.
  if (!order) return nothing(`no such order ${event.orderId}`);
  const orderId = order.id;

  if (event.kind === "failed") {
    // Nothing to change: the order was already unpaid, and saying so in the
    // event log is the whole point of recording it.
    return { outcome: `payment failed for ${order.reference}`, orderId };
  }

  if (event.kind === "refunded") {
    const changed = await markOrderRefunded(order.id);
    return {
      outcome: changed
        ? `refunded ${order.reference}`
        : `refund ignored for ${order.reference}, it was not paid`,
      orderId,
    };
  }

  // kind === "paid". The amount is checked against the ORDER, which was
  // priced server side from the catalog and is the only authority on what is
  // owed. A provider reporting a different number is a discrepancy worth
  // refusing loudly rather than a payment worth accepting quietly.
  if (event.amountMinor !== null && event.amountMinor !== order.subtotalMinor) {
    console.error(
      `[payments] ${provider.id} reported ${event.amountMinor} for order ${order.reference}, which is owed ${order.subtotalMinor}. Not marking it paid.`
    );
    return {
      outcome: `amount mismatch on ${order.reference}: reported ${event.amountMinor}, owed ${order.subtotalMinor}`,
      orderId,
    };
  }
  if (event.currency && event.currency.toLowerCase() !== order.currency.toLowerCase()) {
    console.error(
      `[payments] ${provider.id} reported ${event.currency} for order ${order.reference}, priced in ${order.currency}. Not marking it paid.`
    );
    return {
      outcome: `currency mismatch on ${order.reference}: reported ${event.currency}, priced ${order.currency}`,
      orderId,
    };
  }

  // The PROVIDER'S reference for the payment, not this event's id. The column
  // holds the id somebody types into the provider's dashboard to find the
  // payment, which is the checkout session, not the notification about it.
  const reference = event.paymentReference ?? event.id;
  const { changed } = await markOrderPaid(order.id, provider.id, reference);
  return {
    outcome: changed ? `paid ${order.reference}` : `already paid ${order.reference}`,
    orderId,
  };
}

export type { PaymentProvider, PaymentEvent, StartedCheckout, CheckoutUrls } from "./types";
