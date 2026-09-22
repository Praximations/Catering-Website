import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PaymentEvent, PaymentProvider, WebhookResult } from "@/lib/payments/types";

/**
 * The shared webhook pipeline, against the local store.
 *
 * A stub provider stands in for Stripe, because none of what is tested here
 * is Stripe-specific: the ordering, the deduplication, and the amount check
 * are the same for every provider by design, and that is the point of having
 * one pipeline rather than one per integration.
 */

const TEST_TMP = ".test-tmp";

let directory: string;
let handleWebhook: typeof import("@/lib/payments")["handleWebhook"];
let db: typeof import("@/lib/db")["db"];
let placeOrder: typeof import("@/lib/orders")["placeOrder"];
let findOrderById: typeof import("@/lib/orders")["findOrderById"];

/** What the provider will report for the next delivery. */
let nextResult: WebhookResult;

const stub: PaymentProvider = {
  id: "stub",
  label: "Stub",
  configured: true,
  checkoutOrigins: ["https://checkout.stub.test"],
  startCheckout: async () => ({ reference: "ref_1", redirectUrl: "https://example.test/pay" }),
  readWebhook: async () => nextResult,
};

const event = (over: Partial<PaymentEvent> = {}): PaymentEvent => ({
  id: "stub:evt_default",
  type: "payment.succeeded",
  kind: "paid",
  orderId: null,
  amountMinor: null,
  currency: "usd",
  paymentReference: "cs_test_reference",
  ...over,
});

const deliver = () =>
  handleWebhook(stub, new Request("https://site.test/hook", { method: "POST", body: "{}" }));

/** The outcome label, or a clear failure if the delivery was refused. */
async function deliveredOutcome(): Promise<string> {
  const result = await deliver();
  if (result.status !== 200) throw new Error(`delivery refused: ${result.body.error}`);
  return result.body.outcome;
}

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "webhook-"));
  process.env.DATA_FILE = join(directory, "webhook.json");

  ({ handleWebhook } = await import("@/lib/payments"));
  ({ db } = await import("@/lib/db"));
  ({ placeOrder, findOrderById } = await import("@/lib/orders"));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

beforeEach(() => {
  nextResult = { ok: true, event: event() };
});

/** An order priced at 5000 minor units, straight through the real code path. */
async function anOrder() {
  return placeOrder(
    {
      lines: [
        {
          product: {
            slug: "platter",
            name: "Platter",
            description: "",
            priceMinor: 2500,
            unit: "item",
            minQuantity: 1,
            category: "platter",
            available: true,
            priceOverridden: false,
            basePriceMinor: 2500,
          },
          quantity: 2,
          lineTotalMinor: 5000,
        },
      ],
      subtotalMinor: 5000,
      count: 1,
    },
    {
      userId: null,
      name: "Buyer",
      email: "buyer@example.com",
      phone: "555",
      eventDate: "2027-06-01",
      guests: 20,
      address: "1 Road",
      notes: "",
    }
  );
}

describe("handleWebhook", () => {
  it("refuses an unverifiable delivery with a 400 and changes nothing", async () => {
    nextResult = { ok: false, reason: "bad_signature" };
    const outcome = await deliver();

    assert.equal(outcome.status, 400);
    // Nothing was recorded: an unverified body is not evidence of anything.
    assert.equal(await db.paymentEvents.count({ all: { id: "stub:evt_default" } }), 0);
  });

  it("marks the order paid on a verified event", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_paid", orderId: order.id, amountMinor: 5000 }),
    };

    const outcome = await deliver();
    assert.equal(outcome.status, 200);
    assert.ok("outcome" in outcome.body && outcome.body.outcome.startsWith("paid"));

    const after = await findOrderById(order.id);
    assert.equal(after?.paymentStatus, "paid");
    assert.equal(after?.paymentProvider, "stub");
    assert.ok(after?.paidAt, "paidAt should be set");
  });

  it("treats a redelivery of the same event id as a duplicate", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_dup", orderId: order.id, amountMinor: 5000 }),
    };

    const first = await deliveredOutcome();
    const second = await deliveredOutcome();

    assert.equal(first.startsWith("paid"), true, first);
    assert.equal(second, "duplicate");
    // Still exactly one event row: the insert is what claims the event.
    assert.equal(await db.paymentEvents.count({ all: { id: "stub:evt_dup" } }), 1);
  });

  it("survives two deliveries of one event arriving at once", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_race", orderId: order.id, amountMinor: 5000 }),
    };

    const labels = await Promise.all([deliveredOutcome(), deliveredOutcome(), deliveredOutcome()]);

    assert.equal(labels.filter((l) => l.startsWith("paid")).length, 1, labels.join(", "));
    assert.equal(labels.filter((l) => l === "duplicate").length, 2, labels.join(", "));
  });

  it("REFUSES to mark paid when the amount does not match the order", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      // One cent. The order is owed 5000.
      event: event({ id: "stub:evt_short", orderId: order.id, amountMinor: 1 }),
    };

    assert.match(await deliveredOutcome(), /amount mismatch/);

    const after = await findOrderById(order.id);
    assert.equal(after?.paymentStatus, "unpaid", "an underpaid order must stay unpaid");
  });

  it("refuses to mark paid when the currency does not match", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({
        id: "stub:evt_currency",
        orderId: order.id,
        amountMinor: 5000,
        currency: "jpy",
      }),
    };

    assert.match(await deliveredOutcome(), /currency mismatch/);
    assert.equal((await findOrderById(order.id))?.paymentStatus, "unpaid");
  });

  it("records an event that names no order, without failing", async () => {
    nextResult = { ok: true, event: event({ id: "stub:evt_orphan", orderId: null }) };
    assert.match(await deliveredOutcome(), /no order id/);
  });

  it("records an event for an order that does not exist", async () => {
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_missing", orderId: "00000000-0000-0000-0000-000000000000" }),
    };
    assert.match(await deliveredOutcome(), /no such order/);
  });

  it("leaves an unpaid order alone on a failed payment", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_failed", kind: "failed", orderId: order.id }),
    };

    await deliver();
    assert.equal((await findOrderById(order.id))?.paymentStatus, "unpaid");
  });

  it("refunds a paid order, and only a paid one", async () => {
    const order = await anOrder();

    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_p2", orderId: order.id, amountMinor: 5000 }),
    };
    await deliver();

    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_r1", kind: "refunded", orderId: order.id }),
    };
    assert.match(await deliveredOutcome(), /^refunded /);
    assert.equal((await findOrderById(order.id))?.paymentStatus, "refunded");

    // A second refund has nothing to refund.
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_r2", kind: "refunded", orderId: order.id }),
    };
    assert.match(await deliveredOutcome(), /was not paid/);
  });

  it("records an event it understands but has nothing to do about", async () => {
    nextResult = { ok: true, event: event({ id: "stub:evt_ignored", kind: "ignored" }) };
    assert.match(await deliveredOutcome(), /^ignored /);
  });

  it("releases the claim when applying the event throws, so a retry can work", async () => {
    // The expensive failure this exists for: without the release, a storage
    // timeout leaves the claim behind, the provider's retry is answered
    // "duplicate", the provider gives up, and an order the customer HAS BEEN
    // CHARGED FOR stays unpaid forever.
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_boom", orderId: order.id, amountMinor: 5000 }),
    };

    const realFind = db.orders.findOne.bind(db.orders);
    db.orders.findOne = async () => {
      throw new Error("storage timed out");
    };

    await assert.rejects(() => deliver(), /storage timed out/);
    db.orders.findOne = realFind;

    // The claim is gone, so the retry is a fresh attempt rather than a
    // "duplicate" the provider takes as success.
    assert.equal(await db.paymentEvents.count({ all: { id: "stub:evt_boom" } }), 0);

    assert.equal(await deliveredOutcome(), `paid ${order.reference}`);
    assert.equal((await findOrderById(order.id))?.paymentStatus, "paid");
  });

  it("does not write an unknown order id into the foreign key column", async () => {
    // payment_events.order_id references orders(id). Writing an id that is not
    // there, or a string that is not a uuid, turns a handled event into a 500,
    // and with the claim already written every retry is told "duplicate".
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_foreign", orderId: "not-a-uuid-at-all" }),
    };

    assert.match(await deliveredOutcome(), /no such order/);
    const row = await db.paymentEvents.findOne({ all: { id: "stub:evt_foreign" } });
    assert.equal(row?.orderId, null);
  });

  it("stores the provider's payment reference, not the event id", async () => {
    // The column holds what somebody types into the provider's dashboard to
    // find the payment. An event id identifies the notification about it.
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({
        id: "stub:evt_ref",
        orderId: order.id,
        amountMinor: 5000,
        paymentReference: "cs_live_the_session",
      }),
    };

    await deliver();
    assert.equal((await findOrderById(order.id))?.paymentReference, "cs_live_the_session");
  });

  it("writes the order id onto the event row, for reading back in a dispute", async () => {
    const order = await anOrder();
    nextResult = {
      ok: true,
      event: event({ id: "stub:evt_trace", orderId: order.id, amountMinor: 5000 }),
    };
    await deliver();

    const row = await db.paymentEvents.findOne({ all: { id: "stub:evt_trace" } });
    assert.equal(row?.orderId, order.id);
    assert.equal(row?.provider, "stub");
    assert.match(row?.outcome ?? "", /^paid /);
  });
});
