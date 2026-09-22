import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import type { Store } from "@/lib/db/store";
import { TABLES } from "@/lib/db/store";

/**
 * What this adapter puts on the wire, checked against a stubbed fetch.
 *
 * There is no PostgREST here to answer, and that is fine: the parts worth
 * pinning are the ones a running server would accept silently and wrongly.
 * A missing `Prefer: return=representation` means every insert reads back as
 * zero rows. A `Prefer` without `resolution=merge-duplicates` turns an
 * upsert into a duplicate-key error. Neither is visible in a type.
 */

interface Call {
  url: URL;
  method: string;
  headers: Headers;
  body: unknown;
}

let calls: Call[] = [];
let store: Store;
let reply: (call: Call) => { status?: number; body?: unknown; headers?: Record<string, string> };

before(async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-tests";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status = 200, body = [], headers = {} } = reply(call);
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
  }) as typeof fetch;

  ({ postgrestStore: store } = await import("@/lib/db/postgrest"));
});

beforeEach(() => {
  calls = [];
  reply = () => ({ body: [] });
});

const last = () => calls.at(-1)!;
const params = () => last().url.searchParams;

describe("postgrest adapter: authentication", () => {
  it("sends the service-role key as both apikey and bearer token", async () => {
    await store.from<{ id: string }>(TABLES.users).find();
    assert.equal(last().headers.get("apikey"), "service-role-key-for-tests");
    assert.equal(
      last().headers.get("authorization"),
      "Bearer service-role-key-for-tests"
    );
  });

  it("pins the schema, so a search_path cannot redirect a query", async () => {
    await store.from<{ id: string }>(TABLES.users).find();
    assert.equal(last().headers.get("accept-profile"), "public");
  });

  it("never caches, because this is live data", async () => {
    await store.from<{ id: string }>(TABLES.users).find();
    // A cached read of the orders table would show a stale payment status.
    assert.ok(last().url.pathname.endsWith("/users"));
  });
});

describe("postgrest adapter: reads", () => {
  it("turns camelCase conditions into columns", async () => {
    await store
      .from<{ id: string; userId: string | null }>(TABLES.orders)
      .find({ all: { userId: "u1" } });
    assert.equal(params().get("user_id"), 'eq."u1"');
  });

  it("asks for one row when finding one", async () => {
    reply = () => ({ body: [{ id: "a", created_at: "2026-01-01" }] });
    const found = await store
      .from<{ id: string; createdAt: string }>(TABLES.orders)
      .findOne({ all: { id: "a" } });

    assert.equal(params().get("limit"), "1");
    // And the row comes back in camelCase.
    assert.deepEqual(found, { id: "a", createdAt: "2026-01-01" });
  });

  it("orders by a column, in the direction asked", async () => {
    await store
      .from<{ id: string; createdAt: string }>(TABLES.orders)
      .find(undefined, { orderBy: "createdAt", direction: "desc" });
    assert.equal(params().get("order"), "created_at.desc");
  });

  it("counts with HEAD and count=exact, so no rows cross the wire", async () => {
    reply = () => ({ status: 200, headers: { "content-range": "*/1234" } });
    const total = await store.from<{ id: string }>(TABLES.orders).count();

    assert.equal(last().method, "HEAD");
    assert.match(last().headers.get("prefer") ?? "", /count=exact/);
    assert.equal(total, 1234);
  });

  it("refuses to invent a count when the header is missing", async () => {
    reply = () => ({ status: 200, headers: {} });
    await assert.rejects(
      () => store.from<{ id: string }>(TABLES.orders).count(),
      /did not report a row count/
    );
  });
});

describe("postgrest adapter: writes", () => {
  it("asks for the inserted row back, or every insert reads as nothing", async () => {
    reply = () => ({ body: [{ id: "new", owner_notes: "" }] });
    const created = await store
      .from<{ id: string; ownerNotes: string }>(TABLES.enquiries)
      .insert({ id: "new", ownerNotes: "" });

    assert.equal(last().method, "POST");
    assert.match(last().headers.get("prefer") ?? "", /return=representation/);
    assert.equal(created.id, "new");
  });

  it("converts the body to snake_case on the way out", async () => {
    reply = () => ({ body: [{ id: "x" }] });
    await store
      .from<{ id: string; ownerNotes: string; eventDate: string }>(TABLES.enquiries)
      .insert({ id: "x", ownerNotes: "private", eventDate: "2027-01-01" });

    assert.deepEqual(last().body, {
      id: "x",
      owner_notes: "private",
      event_date: "2027-01-01",
    });
  });

  it("reports a unique violation as null rather than an exception", async () => {
    reply = () => ({
      status: 409,
      body: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const result = await store
      .from<{ id: string; email: string }>(TABLES.users)
      .insertIfAbsent({ id: "x", email: "taken@example.com" });

    assert.equal(result, null);
  });

  it("lets any OTHER failure through, so a real outage is not read as a duplicate", async () => {
    reply = () => ({ status: 503, body: { code: "57P03", message: "the database is starting up" } });
    await assert.rejects(
      () =>
        store
          .from<{ id: string; email: string }>(TABLES.users)
          .insertIfAbsent({ id: "x", email: "a@b.co" }),
      /starting up/
    );
  });

  it("carries the state check into the WHERE, and returns what changed", async () => {
    reply = () => ({ body: [{ id: "o1", payment_status: "paid" }] });
    const changed = await store
      .from<{ id: string; paymentStatus: string }>(TABLES.orders)
      .update({ all: { id: "o1", paymentStatus: "unpaid" } }, { paymentStatus: "paid" });

    assert.equal(last().method, "PATCH");
    assert.equal(params().get("id"), 'eq."o1"');
    assert.equal(params().get("payment_status"), 'eq."unpaid"');
    assert.deepEqual(last().body, { payment_status: "paid" });
    assert.equal(changed.length, 1);
  });

  it("upserts with merge-duplicates and names the conflict target", async () => {
    reply = () => ({ body: [{ slug: "x", price_minor: 500 }] });
    await store
      .from<{ slug: string; priceMinor: number | null }>(TABLES.productOverrides)
      .upsert({ slug: "x", priceMinor: 500 });

    assert.equal(params().get("on_conflict"), "slug");
    assert.match(last().headers.get("prefer") ?? "", /resolution=merge-duplicates/);
  });

  it("names a composite conflict target in full", async () => {
    reply = () => ({ body: [{ control_key_id: "k", key: "i" }] });
    await store
      .from<{ controlKeyId: string; key: string }>(TABLES.idempotencyKeys)
      .upsert({ controlKeyId: "k", key: "i" });

    assert.equal(params().get("on_conflict"), "control_key_id,key");
  });

  it("reports how many rows a delete removed", async () => {
    reply = () => ({ body: [{ id: 1 }, { id: 2 }] });
    const removed = await store
      .from<{ id: number; at: string }>(TABLES.rateLimitHits)
      .remove({ all: { at: { lt: "2026-01-01" } } });

    assert.equal(last().method, "DELETE");
    assert.equal(params().get("at"), 'lt."2026-01-01"');
    assert.equal(removed, 2);
  });
});

describe("postgrest adapter: views and the order transaction", () => {
  it("reads a count view and turns bigint strings into numbers", async () => {
    reply = () => ({
      body: [
        { status: "pending", count: "3", subtotal_minor: "15000" },
        { status: "cancelled", count: "1", subtotal_minor: "500" },
      ],
    });
    const rows = await store.counts("order_counts");

    assert.ok(last().url.pathname.endsWith("/order_counts"));
    assert.deepEqual(rows, [
      { status: "pending", count: 3, subtotalMinor: 15_000 },
      { status: "cancelled", count: 1, subtotalMinor: 500 },
    ]);
  });

  it("places an order through the SQL function, not two inserts", async () => {
    reply = () => ({ body: { id: "o1", reference: "1001", token: "t", owner_notes: "" } });
    const created = await store.placeOrder({ name: "Ari", subtotalMinor: 100 }, [
      { slug: "x", unitPriceMinor: 100, quantity: 1 },
    ]);

    assert.ok(last().url.pathname.endsWith("/rpc/place_order"));
    assert.equal(last().method, "POST");
    // Callers speak camelCase; the adapter converts. The bug this pins: the
    // caller used to send BOTH spellings, so every stored order carried
    // eventDate AND event_date.
    assert.deepEqual(last().body, {
      p_order: { name: "Ari", subtotal_minor: 100 },
      p_lines: [{ slug: "x", unit_price_minor: 100, quantity: 1 }],
    });
    assert.equal(created.ownerNotes, "");
  });
});
