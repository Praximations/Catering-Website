import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { Store } from "@/lib/db/store";
import { TABLES } from "@/lib/db/store";

/**
 * The local adapter has to behave like the Postgres one, because the site is
 * developed against it and deployed against the other. These tests pin the
 * behaviours that are easy to get subtly different: what a unique constraint
 * does, whether updatedAt moves, whether a returned row is a copy.
 */

interface Row {
  id?: string;
  name: string;
  email: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
}

/** Gitignored, so a leaked directory can never be committed. */
const TEST_TMP = ".test-tmp";

const SPEC = {
  name: "test_rows",
  primaryKey: ["id"],
  unique: [["email"]],
  touchUpdatedAt: true,
  generated: { id: "uuid", createdAt: "now", updatedAt: "now" },
} as const;

let directory: string;
let store: Store;

before(async () => {
  // Under the project, not os.tmpdir(). A sandboxed or containerised runner
  // may redirect /tmp somewhere unexpected, and a test that leaks files into
  // the working tree is a test that gets committed by accident. TEST_TMP is
  // in .gitignore, so it cannot be.
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "db-"));
  // Read when lib/db/json.ts is first imported, so it has to be set first.
  process.env.DATA_FILE = join(directory, "test.json");
  ({ jsonStore: store } = await import("@/lib/db/json"));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("json adapter", () => {
  it("fills in the columns Postgres would generate", async () => {
    const rows = store.from<Row>(SPEC);
    const created = await rows.insert({ name: "Ari", email: "ari@example.com" });

    assert.match(created.id!, /^[0-9a-f-]{36}$/);
    assert.ok(created.createdAt, "createdAt should be set");
    assert.ok(created.updatedAt, "updatedAt should be set");
  });

  it("finds by a bare value and by a comparison", async () => {
    const rows = store.from<Row>(SPEC);
    await rows.insert({ name: "Bee", email: "bee@example.com", status: "new" });

    assert.equal((await rows.findOne({ all: { email: "bee@example.com" } }))?.name, "Bee");
    assert.equal(
      (await rows.find({ all: { status: { in: ["new", "read"] } } })).length >= 1,
      true
    );
    assert.equal((await rows.findOne({ all: { email: "nobody@example.com" } })), null);
  });

  it("ORs one clause and ANDs it with the rest", async () => {
    const rows = store.from<Row>(SPEC);
    await rows.insert({ name: "Cee", email: "cee@example.com", status: "shipped" });

    const found = await rows.find({
      any: [{ email: "cee@example.com" }, { email: "nobody@example.com" }],
    });
    assert.equal(found.length, 1);
    assert.equal(found[0]!.name, "Cee");

    // all + any together: the AND must still apply.
    assert.equal(
      (
        await rows.find({
          all: { status: "nope" },
          any: [{ email: "cee@example.com" }],
        })
      ).length,
      0
    );
  });

  it("refuses a second row that collides on a unique column", async () => {
    const rows = store.from<Row>(SPEC);
    await rows.insert({ name: "First", email: "dup@example.com" });

    await assert.rejects(
      () => rows.insert({ name: "Second", email: "dup@example.com" }),
      /already has a row/
    );
  });

  it("returns null from insertIfAbsent instead of throwing, because that is an answer", async () => {
    const rows = store.from<Row>(SPEC);
    await rows.insert({ name: "Holder", email: "taken@example.com" });

    assert.equal(await rows.insertIfAbsent({ name: "Other", email: "taken@example.com" }), null);
    assert.ok(await rows.insertIfAbsent({ name: "Fresh", email: "free@example.com" }));
  });

  it("update returns the rows it changed, which is what makes a conditional update safe", async () => {
    const rows = store.from<Row>(SPEC);
    const created = await rows.insert({
      name: "Pay",
      email: "pay@example.com",
      status: "unpaid",
    });

    // The pattern the payment code relies on: the state check lives in the
    // WHERE, so only the first caller gets a row back.
    const first = await rows.update(
      { all: { id: created.id!, status: "unpaid" } },
      { status: "paid" }
    );
    const second = await rows.update(
      { all: { id: created.id!, status: "unpaid" } },
      { status: "paid" }
    );

    assert.equal(first.length, 1);
    assert.equal(first[0]!.status, "paid");
    assert.equal(second.length, 0, "the second attempt must change nothing");
  });

  it("moves updatedAt on write, the way the Postgres trigger does", async () => {
    const rows = store.from<Row>(SPEC);
    const created = await rows.insert({ name: "Touch", email: "touch@example.com" });

    // The clock has millisecond resolution, so wait past it rather than
    // asserting on two timestamps taken in the same tick.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const [updated] = await rows.update({ all: { id: created.id! } }, { name: "Touched" });

    assert.ok(updated!.updatedAt! > created.updatedAt!, "updatedAt should have moved");
    assert.equal(updated!.createdAt, created.createdAt, "createdAt should not move");
  });

  it("hands out copies, so a caller cannot reach into stored state", async () => {
    const rows = store.from<Row>(SPEC);
    const created = await rows.insert({ name: "Copy", email: "copy@example.com" });

    created.name = "Mutated";
    assert.equal((await rows.findOne({ all: { id: created.id! } }))?.name, "Copy");
  });

  it("counts, sorts and paginates", async () => {
    const rows = store.from<Row>({ ...SPEC, name: "paging_rows" });
    for (const n of [3, 1, 2]) {
      await rows.insert({ name: `row-${n}`, email: `p${n}@example.com` });
    }

    assert.equal(await rows.count(), 3);
    assert.equal(await rows.count({ all: { email: "p1@example.com" } }), 1);

    const ascending = await rows.find(undefined, { orderBy: "name", direction: "asc" });
    assert.deepEqual(
      ascending.map((row) => row.name),
      ["row-1", "row-2", "row-3"]
    );

    const descending = await rows.find(undefined, { orderBy: "name", direction: "desc" });
    assert.equal(descending[0]!.name, "row-3");

    const page = await rows.find(undefined, { orderBy: "name", limit: 1, offset: 1 });
    assert.deepEqual(
      page.map((row) => row.name),
      ["row-2"]
    );
  });

  it("upsert inserts, then merges on the primary key", async () => {
    const rows = store.from<Row>({ ...SPEC, name: "upsert_rows", unique: [] });
    const created = await rows.insert({ name: "One", email: "u@example.com" });

    const merged = await rows.upsert({ id: created.id, name: "Two", email: "u@example.com" });
    assert.equal(merged.name, "Two");
    assert.equal(await rows.count(), 1, "upsert must not add a second row");
  });

  it("removes and reports how many", async () => {
    const rows = store.from<Row>({ ...SPEC, name: "remove_rows" });
    await rows.insert({ name: "A", email: "r1@example.com", status: "old" });
    await rows.insert({ name: "B", email: "r2@example.com", status: "old" });
    await rows.insert({ name: "C", email: "r3@example.com", status: "new" });

    assert.equal(await rows.remove({ all: { status: "old" } }), 2);
    assert.equal(await rows.count(), 1);
  });

  it("serializes concurrent writes rather than losing them", async () => {
    const rows = store.from<Row>({ ...SPEC, name: "race_rows" });
    await Promise.all(
      Array.from({ length: 25 }, (_, n) =>
        rows.insert({ name: `n${n}`, email: `race${n}@example.com` })
      )
    );
    // The bug this guards: read-modify-write without a queue keeps only the
    // last writer's copy of the file.
    assert.equal(await rows.count(), 25);
  });
});

describe("placeOrder in the json adapter", () => {
  it("writes the order and its lines together, numbering the lines in cart order", async () => {
    const created = await store.placeOrder(
      {
        name: "Ari",
        email: "ari@example.com",
        eventDate: "2027-03-01",
        guests: 40,
        subtotalMinor: 50_000,
        currency: "usd",
        status: "pending",
        paymentStatus: "unpaid",
      },
      [
        { slug: "platter", name: "Platter", unit: "item", unitPriceMinor: 25_000, quantity: 2, lineTotalMinor: 50_000 },
        { slug: "extra", name: "Extra", unit: "item", unitPriceMinor: 0, quantity: 1, lineTotalMinor: 0 },
      ]
    );

    assert.match(String(created.id), /^[0-9a-f-]{36}$/);
    assert.match(String(created.token), /^[0-9a-f-]{36}$/);
    // References come from a sequence starting at 1001, matching the schema.
    assert.equal(created.reference, "1001");

    const lines = await store
      .from<{ orderId: string; position: number; slug: string }>(TABLES.orderLines)
      .find({ all: { orderId: String(created.id) } }, { orderBy: "position" });

    assert.deepEqual(
      lines.map((line) => [line.position, line.slug]),
      [
        [0, "platter"],
        [1, "extra"],
      ]
    );
  });

  it("gives the next order the next reference, never a reused one", async () => {
    const second = await store.placeOrder(
      {
        name: "Bee",
        email: "bee@example.com",
        eventDate: "2027-03-02",
        guests: 10,
        subtotalMinor: 100,
        currency: "usd",
        status: "pending",
        paymentStatus: "unpaid",
      },
      [{ slug: "x", name: "X", unit: "item", unitPriceMinor: 100, quantity: 1, lineTotalMinor: 100 }]
    );
    assert.equal(second.reference, "1002");
  });

  it("refuses an order with no lines", async () => {
    await assert.rejects(
      () =>
        store.placeOrder(
          { name: "n", email: "n@example.com", eventDate: "2027-01-01", guests: 1, subtotalMinor: 1, currency: "usd" },
          []
        ),
      /no lines/
    );
  });
});
