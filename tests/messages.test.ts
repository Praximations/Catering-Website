import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { CustomerMessageRecord } from "@/lib/db/types";

/**
 * Which conversation a message lands in decides who can read it and whose
 * inbox shows it as unread, so the rule is pinned here without a database.
 */

const TEST_TMP = ".test-tmp";

let directory: string;
let messages: typeof import("@/lib/messages");

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "messages-"));
  // lib/messages imports lib/db, which reads this on first import.
  process.env.DATA_FILE = join(directory, "messages.json");
  messages = await import("@/lib/messages");
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

let sequence = 0;
function message(fields: Partial<CustomerMessageRecord>): CustomerMessageRecord {
  sequence += 1;
  return {
    id: `m${sequence}`,
    userId: null,
    orderId: null,
    sender: "customer",
    kind: "message",
    body: `Message ${sequence}`,
    channel: "web",
    readAt: null,
    externalId: null,
    createdAt: `2026-09-01T10:${String(sequence).padStart(2, "0")}:00.000Z`,
    ...fields,
  };
}

const order = (id: string, fields: { userId?: string | null; email?: string; reference?: string; phone?: string } = {}) => ({
  id,
  userId: fields.userId ?? null,
  email: fields.email ?? `${id}@example.com`,
  name: `Customer ${id}`,
  phone: fields.phone ?? "",
  reference: fields.reference ?? "1001",
  createdAt: "2026-08-01T00:00:00.000Z",
});

describe("parseThreadKey", () => {
  it("accepts an account key and an order key", () => {
    assert.equal(messages.parseThreadKey("u:abc-123"), "u:abc-123");
    assert.equal(messages.parseThreadKey("o:5f1c"), "o:5f1c");
  });

  it("refuses anything else, because it arrives from a URL", () => {
    for (const value of ["", "x:abc", "u:", "u:../../etc", "u:a b", "o:a,b", `u:${"a".repeat(101)}`]) {
      assert.equal(messages.parseThreadKey(value), null, value);
    }
  });
});

describe("resolveThreadKey", () => {
  const none = new Map<string, string>();

  it("files a message with an account under that account", () => {
    assert.equal(messages.resolveThreadKey({ userId: "u1", orderId: "o1" }, new Map(), none), "u:u1");
  });

  it("files a guest order's message under the account that placed the order", () => {
    const orders = new Map([["o1", order("o1", { userId: "u7" })]]);
    assert.equal(messages.resolveThreadKey({ userId: null, orderId: "o1" }, orders, none), "u:u7");
  });

  it("joins a guest order to an account opened later with the same email, in any case", () => {
    const orders = new Map([["o1", order("o1", { email: "Gina@Example.com" })]]);
    const byEmail = new Map([["gina@example.com", "u9"]]);
    assert.equal(messages.resolveThreadKey({ userId: null, orderId: "o1" }, orders, byEmail), "u:u9");
  });

  it("keeps a guest with no account in a thread of that order", () => {
    const orders = new Map([["o1", order("o1")]]);
    assert.equal(messages.resolveThreadKey({ userId: null, orderId: "o1" }, orders, none), "o:o1");
  });

  it("drops a message that points at nothing", () => {
    assert.equal(messages.resolveThreadKey({ userId: null, orderId: null }, new Map(), none), null);
  });
});

describe("buildConversations", () => {
  it("merges an account's own messages with those on its orders, newest thread first", () => {
    const users = [{ id: "u1", email: "bea@example.com", name: "Bea" }];
    const orders = [order("o1", { userId: "u1", reference: "1001" }), order("o2", { reference: "1002" })];
    const list = messages.buildConversations(
      [
        message({ userId: "u1", body: "General question" }),
        message({ orderId: "o1", body: "About my order" }),
        message({ orderId: "o2", body: "A guest asks" }),
      ],
      orders,
      users
    );

    assert.deepEqual(
      list.map((thread) => thread.key),
      ["o:o2", "u:u1"]
    );
    const bea = list.find((thread) => thread.key === "u:u1")!;
    assert.equal(bea.total, 2);
    assert.equal(bea.name, "Bea");
    assert.equal(bea.lastBody, "About my order");
    assert.deepEqual(bea.orderReferences, ["1001"]);
  });

  it("counts only unread customer messages as unread", () => {
    const list = messages.buildConversations(
      [
        message({ userId: "u1" }),
        message({ userId: "u1", readAt: "2026-09-02T00:00:00.000Z" }),
        message({ userId: "u1", sender: "owner" }),
      ],
      [],
      [{ id: "u1", email: "a@example.com", name: "A" }]
    );
    assert.equal(list[0]!.unread, 1);
    assert.equal(list[0]!.lastSender, "owner");
  });

  it("flags an unread change request, and stops once it is read", () => {
    const users = [{ id: "u1", email: "a@example.com", name: "A" }];
    const open = messages.buildConversations([message({ userId: "u1", kind: "change_request" })], [], users);
    const seen = messages.buildConversations(
      [message({ userId: "u1", kind: "change_request", readAt: "2026-09-02T00:00:00.000Z" })],
      [],
      users
    );
    assert.equal(open[0]!.hasChangeRequest, true);
    assert.equal(seen[0]!.hasChangeRequest, false);
  });

  it("takes the phone number from the customer's most recent order", () => {
    const users = [{ id: "u1", email: "a@example.com", name: "A" }];
    const older = { ...order("o1", { userId: "u1", phone: "555 0100" }), createdAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...order("o2", { userId: "u1", phone: "555 0199" }), createdAt: "2026-06-01T00:00:00.000Z" };
    const list = messages.buildConversations([message({ userId: "u1" })], [older, newer], users);
    assert.equal(list[0]!.phone, "555 0199");
  });
});
