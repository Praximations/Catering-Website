import type { OrderRecord } from "./db/types";
import type { CustomerEnquiry } from "./enquiries";
import type { PublicUser } from "./users";

/**
 * PRAXI, the intelligence layer above this site.
 *
 * This site keeps doing what it is good at: taking orders and enquiries,
 * holding accounts, cooking food. Praxi does not replace any of that. It
 * receives a normalized copy of what happens here, so agents, automations,
 * CRM, and analytics have something to work with.
 *
 * WHAT THIS SPEAKS: the Praxi Universal Runtime's ingestion contract,
 * POST /ingest/v1/events with canonical envelopes. The @praxi/sdk package
 * (Projects/Praxi/Praxi-SDK) is the same contract with sugar on top; this
 * file is hand written so catering-web keeps its zero dependencies and
 * does not need a cross repo file: link. Swapping in the package later
 * changes this module and nothing that calls it.
 *
 * FAIL SOFT, ALWAYS. Praxi is optional. With no key configured this is a
 * no-op, and if Praxi is down or slow, the customer's order still
 * completes. An analytics pipeline must never be able to break checkout,
 * so every call here swallows its own errors and logs them.
 */

const ENDPOINT = "/ingest/v1/events";
const TIMEOUT_MS = 4000;

interface CustomerRef {
  external_id?: string;
  email?: string;
  name?: string;
  phone?: string;
  stage?: "lead" | "user" | "customer";
}

interface EventEnvelope {
  name: string;
  idempotency_key?: string;
  occurred_at?: string;
  customer?: CustomerRef;
  properties?: Record<string, unknown>;
}

function config(): { url: string; key: string } | null {
  const key = process.env.PRAXI_SECRET_KEY;
  const url = process.env.PRAXI_API_URL;
  if (!key || !url) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/** Whether this deployment is wired to Praxi at all, for honest UI. */
export function praxiConfigured(): boolean {
  return config() !== null;
}

/**
 * Send events, never throw, never block for long.
 *
 * Deliberately awaited by callers rather than fired and forgotten: on a
 * serverless host the function can be frozen the moment a response is
 * returned, and a floating promise is simply lost. Four seconds is the
 * ceiling, and a timeout is a logged warning, not an error the customer
 * ever sees.
 */
async function send(events: EventEnvelope[]): Promise<void> {
  const settings = config();
  if (!settings || events.length === 0) return;

  try {
    const response = await fetch(`${settings.url}${ENDPOINT}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.key}`,
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      console.warn(`[praxi] ${events[0]?.name} rejected: ${response.status} ${detail}`);
    }
  } catch (error) {
    console.warn(`[praxi] ${events[0]?.name} not delivered:`, (error as Error).message);
  }
}

/* ------------------------------ the events ------------------------------- */

/**
 * Someone created an account. Praxi's Customer object is the same person
 * whether they arrived through the website, Shopify, or anywhere else,
 * which is the entire point of the universal runtime.
 */
export async function praxiCustomerCreated(user: PublicUser): Promise<void> {
  await send([
    {
      name: "customer.created",
      idempotency_key: `catering:user:${user.id}`,
      occurred_at: user.createdAt,
      customer: {
        external_id: user.id,
        email: user.email,
        name: user.name,
        stage: "user",
      },
      properties: { role: user.role, source: "catering-web" },
    },
  ]);
}

/**
 * An enquiry is a lead, so it is a form submission in Praxi's vocabulary.
 * The fields ride along, which is what lets an automation answer "who
 * asked about a wedding this month".
 */
export async function praxiEnquirySubmitted(enquiry: CustomerEnquiry): Promise<void> {
  await send([
    {
      name: "form.submitted",
      idempotency_key: `catering:enquiry:${enquiry.id}`,
      occurred_at: enquiry.createdAt,
      customer: {
        ...(enquiry.userId ? { external_id: enquiry.userId } : {}),
        email: enquiry.email,
        name: enquiry.name,
        ...(enquiry.phone ? { phone: enquiry.phone } : {}),
        stage: "lead",
      },
      properties: {
        form_key: "quote_request",
        form_name: "Request a quote",
        fields: {
          event_date: enquiry.eventDate,
          guests: enquiry.guests,
          package: enquiry.packageSlug,
          notes: enquiry.notes,
        },
      },
    },
  ]);
}

/**
 * An order. The canonical Order object is carried in properties.order,
 * where Praxi's runtime picks it up and writes it to the shared orders
 * table, the same shape a Shopify store produces.
 *
 * Money crosses as integer minor units, which is the runtime's convention
 * and happens to be this site's too, so nothing is converted here.
 */
export async function praxiOrderCreated(order: OrderRecord): Promise<void> {
  await send([
    {
      name: "order.created",
      idempotency_key: `catering:order:${order.id}`,
      occurred_at: order.createdAt,
      customer: {
        ...(order.userId ? { external_id: order.userId } : {}),
        email: order.email,
        name: order.name,
        ...(order.phone ? { phone: order.phone } : {}),
        stage: "customer",
      },
      properties: {
        order: {
          external_id: order.id,
          status: "pending",
          currency: order.currency.toUpperCase(),
          total_minor: order.subtotalMinor,
          subtotal_minor: order.subtotalMinor,
          placed_at: order.createdAt,
          line_items: order.lines.map((line) => ({
            external_product_id: line.slug,
            title: line.name,
            quantity: line.quantity,
            unit_price_minor: line.unitPriceMinor,
          })),
          data: {
            reference: order.reference,
            event_date: order.eventDate,
            guests: order.guests,
          },
        },
      },
    },
  ]);
}

/**
 * Our statuses onto Praxi's canonical ones, which are not the same list.
 *
 * Praxi has no "confirmed": its vocabulary is pending, paid, fulfilled,
 * canceled, refunded, partially_refunded. A confirmed catering booking is
 * accepted but not yet delivered or paid, so "pending" is the honest
 * canonical answer, and the exact local word rides in `data` so nothing
 * is actually lost. Inventing a status Praxi does not know would simply
 * be rejected at its door.
 */
const CANONICAL_STATUS: Record<OrderRecord["status"], string> = {
  pending: "pending",
  confirmed: "pending",
  fulfilled: "fulfilled",
  cancelled: "canceled",
};

const STATUS_EVENT: Record<OrderRecord["status"], string> = {
  pending: "order.updated",
  confirmed: "order.updated",
  fulfilled: "order.fulfilled",
  cancelled: "order.canceled",
};

/** The owner moved an order along. Praxi keeps its copy in step. */
export async function praxiOrderUpdated(order: OrderRecord): Promise<void> {
  await send([
    {
      name: STATUS_EVENT[order.status],
      // Keyed on the transition, not the order, so each change is its own
      // event while a repeated save of the same state is deduplicated.
      idempotency_key: `catering:order:${order.id}:${order.status}:${order.updatedAt}`,
      occurred_at: order.updatedAt,
      customer: {
        ...(order.userId ? { external_id: order.userId } : {}),
        email: order.email,
        name: order.name,
        stage: "customer",
      },
      properties: {
        order: {
          external_id: order.id,
          status: CANONICAL_STATUS[order.status],
          currency: order.currency.toUpperCase(),
          total_minor: order.subtotalMinor,
          data: { reference: order.reference, local_status: order.status },
        },
      },
    },
  ]);
}
