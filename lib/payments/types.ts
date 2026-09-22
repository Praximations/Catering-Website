import type { CustomerOrder } from "../orders";

/**
 * WHAT A PAYMENT PROVIDER IS, as far as this site is concerned.
 *
 * Four things, and nothing about any particular company:
 *
 *   1. Start a payment for an order and say where to send the customer.
 *   2. Verify that a webhook really came from you.
 *   3. Say what that webhook MEANS, in this site's vocabulary.
 *   4. Say whether you are configured at all.
 *
 * Adding PayPal or Square is a new file implementing this, plus one line in
 * lib/payments/index.ts. Nothing in app/ names a provider, so no page, no
 * action, and no webhook route changes.
 *
 * The rules a provider must not bend:
 *
 * - THE AMOUNT COMES FROM THE ORDER, never from the request that started the
 *   checkout and never from the webhook. The order was priced server side
 *   from the catalog, and it is the only authority on what is owed.
 * - THE WEBHOOK IS THE AUTHORITY ON PAYMENT, not the success redirect. A
 *   customer can open the success URL without paying, and can close the tab
 *   after paying.
 * - A VERIFIED EVENT STILL HAS TO BE MATCHED TO AN ORDER. A signature proves
 *   the provider sent it, not that it is about an order of ours.
 */

export interface StartedCheckout {
  /** The provider's id for this attempt, stored on the order. */
  reference: string;
  /** Where to send the customer to pay. */
  redirectUrl: string;
}

/** What this site does about an event, in its own words. */
export type PaymentEventKind =
  /** Money arrived. Mark the order paid. */
  | "paid"
  /** Money went back. Mark the order refunded. */
  | "refunded"
  /** A payment was attempted and did not succeed. Nothing to change. */
  | "failed"
  /** Real, understood, and nothing for us to do. */
  | "ignored";

export interface PaymentEvent {
  /**
   * The provider's own event id, namespaced by provider. This is the
   * deduplication key, so it must identify the DELIVERY, not the payment:
   * two events about one payment are two events.
   */
  id: string;
  /** The provider's event name, kept verbatim for the audit trail. */
  type: string;
  kind: PaymentEventKind;
  /** Which of our orders it is about, when the event says. */
  orderId: string | null;
  /**
   * What the provider says was actually collected, in minor units. Checked
   * against the order before anything is marked paid, so a mismatch is
   * refused rather than trusted.
   */
  amountMinor: number | null;
  currency: string | null;
  /**
   * The provider's id for the PAYMENT, as opposed to `id`, which identifies
   * this notification about it. Stored on the order, so it has to be the one
   * somebody can look up in the provider's dashboard.
   */
  paymentReference: string | null;
}

export type WebhookResult =
  | { ok: true; event: PaymentEvent }
  | { ok: false; reason: "bad_signature" | "unparseable" };

export interface PaymentProvider {
  /** Lower case, stable, and stored on the order. */
  readonly id: string;
  readonly label: string;
  /** False when its keys are not set, which makes the whole thing a no-op. */
  readonly configured: boolean;

  /**
   * The origins a customer's browser is sent to in order to pay.
   *
   * Needed by the Content Security Policy. `form-action` governs where a form
   * may submit, and Firefox and Safari apply it ACROSS REDIRECTS: without the
   * provider's checkout host listed, a Pay button that posts to a Server
   * Action which then redirects to the provider is refused, and the customer
   * lands on a blank page with no way to pay. Chrome does not check redirects,
   * so this is invisible in the browser most people test in.
   */
  readonly checkoutOrigins: readonly string[];

  startCheckout(order: CustomerOrder, urls: CheckoutUrls): Promise<StartedCheckout>;

  /**
   * Verify and interpret a webhook delivery.
   *
   * Takes the RAW body, because a signature is over the exact bytes sent and
   * re-serializing parsed JSON does not reproduce them.
   */
  readWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
}

export interface CheckoutUrls {
  success: string;
  cancel: string;
}
