import { createHmac, timingSafeEqual } from "node:crypto";
import { business } from "../business";
import type { CustomerOrder } from "../orders";
import type {
  CheckoutUrls,
  PaymentEvent,
  PaymentEventKind,
  PaymentProvider,
  StartedCheckout,
  WebhookResult,
} from "./types";

/**
 * Stripe, over its REST API, with fetch and node:crypto.
 *
 * The official SDK would do this too. It is not used because this project
 * ships no runtime dependencies, and because the whole surface Stripe needs
 * here is one POST and one HMAC.
 */

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * PINNED, on purpose.
 *
 * Without this header Stripe answers with whatever version the account is
 * set to, which an unrelated person can change in a dashboard, and a
 * response shape can change under a deployment nobody touched. Raising this
 * is a code change with a changelog to read first.
 */
const STRIPE_API_VERSION = "2025-08-27.basil";

/** A payment provider must not be able to hold a request open. */
const TIMEOUT_MS = 15_000;

/**
 * How long a signed payload stays acceptable. Stripe's own tolerance, and it
 * is what stops a captured request being replayed tomorrow.
 */
const SIGNATURE_TOLERANCE_SECONDS = 300;

interface StripeCheckoutSession {
  id: string;
  url: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
}

interface StripeEventEnvelope {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}

/**
 * Verify Stripe's signature header.
 *
 * Exported for its own tests: this is the only thing standing between a
 * forged POST and an order marked paid, so it is worth testing directly
 * rather than only through the route.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret = webhookSecret,
  now = Date.now()
): boolean {
  if (!secret || !header) return false;

  const parts = header.split(",").map((piece) => piece.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const candidates = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value)
    .filter((value): value is string => Boolean(value));

  if (!timestamp || candidates.length === 0) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  if (Math.abs(now / 1000 - seconds) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");

  return candidates.some((candidate) => {
    // Compared as hex TEXT of the right length first. Buffer.from with a
    // non-hex character silently truncates, which would otherwise hand
    // timingSafeEqual two different lengths and make it throw: a forged
    // header would come back as a 500 instead of a refusal.
    if (candidate.length !== expected.length) return false;
    if (!/^[0-9a-f]+$/i.test(candidate)) return false;
    return timingSafeEqual(Buffer.from(candidate, "hex"), expectedBytes);
  });
}

/**
 * Which of our order ids an event is about, whatever object it carries.
 *
 * startCheckout puts order_id in three places for this reason: the session's
 * metadata, its client_reference_id, and the PaymentIntent's metadata. A
 * charge.refunded event carries the Charge, whose metadata Stripe copies from
 * the PaymentIntent, which is why the PaymentIntent copy is set at all.
 */
function orderIdFrom(object: Record<string, unknown>): string | null {
  const metadata = object.metadata as Record<string, string> | null | undefined;
  const fromMetadata = metadata?.order_id;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;

  const clientReference = object.client_reference_id;
  if (typeof clientReference === "string" && clientReference) return clientReference;

  return null;
}

/**
 * The id to store on the order: the thing somebody looks up in the Stripe
 * dashboard. The session for a checkout, the PaymentIntent for a charge, and
 * never the event id, which identifies the notification rather than the money.
 */
function paymentReferenceFrom(object: Record<string, unknown>): string | null {
  // A Checkout Session's own id is what startCheckout stored and what the
  // dashboard searches, so prefer it over the PaymentIntent it points at.
  const id = object.id;
  if (typeof id === "string" && id.startsWith("cs_")) return id;

  const paymentIntent = object.payment_intent;
  if (typeof paymentIntent === "string" && paymentIntent) return paymentIntent;

  return typeof id === "string" && id ? id : null;
}

/**
 * Stripe's event names to what this site does about them.
 *
 * Only what is listed here is acted on. An unmapped event is "ignored":
 * understood, recorded, and no change. That is deliberately different from
 * an unverifiable one, which is refused.
 */
const EVENT_KINDS: Record<string, PaymentEventKind> = {
  // A card, paid there and then.
  "checkout.session.completed": "paid",
  // A delayed method that has now cleared, for example a bank debit. Without
  // this an order paid by one of those would never be marked paid at all.
  "checkout.session.async_payment_succeeded": "paid",
  "checkout.session.async_payment_failed": "failed",
  "checkout.session.expired": "failed",
  "payment_intent.payment_failed": "failed",
  "charge.refunded": "refunded",
  /**
   * NOT charge.dispute.created. A Dispute object carries its own (empty)
   * metadata and no client_reference_id, so nothing on it names one of our
   * orders: mapping it to "refunded" produced an entry that could only ever
   * record "no order id" while reading as though disputes were handled.
   * Resolving one means following its payment_intent back to the charge,
   * which is a second API call and a deliberate feature, not a line here.
   */
};

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Stripe",
  configured: Boolean(secretKey && webhookSecret),
  // Hosted Checkout, which is where startCheckout redirects. See the note on
  // checkoutOrigins in types.ts for why the CSP needs it.
  checkoutOrigins: ["https://checkout.stripe.com"],

  async startCheckout(order: CustomerOrder, urls: CheckoutUrls): Promise<StartedCheckout> {
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

    const body = new URLSearchParams({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.email,
      success_url: urls.success,
      cancel_url: urls.cancel,
      "metadata[order_id]": order.id,
      "metadata[order_token]": order.token,
      "payment_intent_data[metadata][order_id]": order.id,
    });

    order.lines.forEach((line, index) => {
      // The currency is the ORDER's, not today's setting: an order placed
      // before a currency change must be charged in what it was priced in.
      body.set(`line_items[${index}][price_data][currency]`, order.currency);
      body.set(`line_items[${index}][price_data][unit_amount]`, String(line.unitPriceMinor));
      body.set(`line_items[${index}][price_data][product_data][name]`, line.name);
      body.set(`line_items[${index}][quantity]`, String(line.quantity));
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
        // Keyed to the ORDER, so a double-clicked Pay button, or a retry
        // after a timeout where the first request actually succeeded, returns
        // the SAME session instead of opening a second one for the same money.
        "Idempotency-Key": `checkout:${order.id}`,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const payload = (await response.json()) as StripeCheckoutSession & {
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? `Stripe checkout failed with status ${response.status}.`
      );
    }
    if (!payload.url) throw new Error("Stripe did not return a checkout URL.");

    return { reference: payload.id, redirectUrl: payload.url };
  },

  async readWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    if (!verifyStripeSignature(rawBody, headers.get("stripe-signature"))) {
      return { ok: false, reason: "bad_signature" };
    }

    let envelope: StripeEventEnvelope;
    try {
      envelope = JSON.parse(rawBody) as StripeEventEnvelope;
    } catch {
      return { ok: false, reason: "unparseable" };
    }

    const object = envelope.data?.object ?? {};
    if (!envelope.id || !envelope.type) return { ok: false, reason: "unparseable" };

    let kind = EVENT_KINDS[envelope.type] ?? "ignored";

    // A completed session whose payment is still pending is NOT paid. The
    // async_payment_succeeded event is what says it cleared.
    if (kind === "paid") {
      const status = object.payment_status;
      if (typeof status === "string" && status !== "paid" && status !== "no_payment_required") {
        kind = "ignored";
      }
    }

    const amount = object.amount_total ?? object.amount ?? null;
    const currency = object.currency;

    const event: PaymentEvent = {
      // Namespaced, so two providers cannot collide on an event id.
      id: `stripe:${envelope.id}`,
      type: envelope.type,
      kind,
      orderId: orderIdFrom(object),
      amountMinor: typeof amount === "number" ? amount : null,
      currency: typeof currency === "string" ? currency : null,
      paymentReference: paymentReferenceFrom(object),
    };
    return { ok: true, event };
  },
};

/** What lib/business.ts says, so a provider cannot disagree with the site. */
export const configuredCurrency = business.currency;
