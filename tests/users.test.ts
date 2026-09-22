import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TEST_TMP = ".test-tmp";

let directory: string;
let users: typeof import("@/lib/users");
let db: typeof import("@/lib/db")["db"];

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "users-"));
  process.env.DATA_FILE = join(directory, "users.json");
  delete process.env.OWNER_EMAIL;

  users = await import("@/lib/users");
  ({ db } = await import("@/lib/db"));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.users.remove({ all: { role: { in: ["owner", "customer"] } } });
});

const signUp = (email: string) =>
  users.createUser({ name: email.split("@")[0]!, email, password: "a-long-enough-password" });

describe("who becomes the owner", () => {
  it("gives the first account the owner role", async () => {
    const result = await signUp("first@example.com");
    assert.equal(result.ok && result.user.role, "owner");
  });

  it("gives everyone after that customer", async () => {
    await signUp("first@example.com");
    const second = await signUp("second@example.com");
    assert.equal(second.ok && second.user.role, "customer");
  });

  it("NEVER makes two owners, even from simultaneous signups", async () => {
    /**
     * The bug this exists for: deciding the role from a count taken BEFORE the
     * insert means several signups on an empty database all see zero users and
     * all claim the role, because the unique index is on the email and not on
     * the role. Every one of them would then see every enquiry and every order.
     *
     * VIA GOOGLE, on purpose. createUser hashes a password first, and scrypt
     * takes long enough, and unevenly enough, to stagger concurrent calls past
     * each other, so the race hides behind it here even though two serverless
     * instances would hit it. findOrCreateGoogleUser has no hashing, so the
     * reads genuinely collide and this test fails against the old shape.
     */
    await Promise.all([
      users.findOrCreateGoogleUser({ email: "a@example.com", name: "A" }),
      users.findOrCreateGoogleUser({ email: "b@example.com", name: "B" }),
      users.findOrCreateGoogleUser({ email: "c@example.com", name: "C" }),
      users.findOrCreateGoogleUser({ email: "d@example.com", name: "D" }),
    ]);

    const owners = await db.users.count({ all: { role: "owner" } });
    assert.equal(owners, 1, "exactly one account may hold the owner role");
    assert.equal(await db.users.count(), 4, "and every signup should still exist");
  });

  it("also never makes two owners through password signup", async () => {
    await Promise.all([
      signUp("p1@example.com"),
      signUp("p2@example.com"),
      signUp("p3@example.com"),
    ]);
    assert.equal(await db.users.count({ all: { role: "owner" } }), 1);
  });

  it("refuses a second account on the same address", async () => {
    await signUp("taken@example.com");
    const again = await signUp("taken@example.com");
    assert.equal(again.ok, false);
    assert.equal(!again.ok && again.reason, "email_taken");
  });

  it("is case insensitive about the address", async () => {
    await signUp("Mixed@Example.com");
    const again = await signUp("mixed@example.com");
    assert.equal(again.ok, false);
  });
});

describe("OWNER_EMAIL", () => {
  after(() => {
    delete process.env.OWNER_EMAIL;
  });

  it("names the owner regardless of signup order", async () => {
    process.env.OWNER_EMAIL = "boss@example.com";

    const first = await signUp("early@example.com");
    const boss = await signUp("boss@example.com");

    assert.equal(first.ok && first.user.role, "customer");
    assert.equal(boss.ok && boss.user.role, "owner");
    assert.equal(await db.users.count({ all: { role: "owner" } }), 1);
  });
});

describe("authenticate", () => {
  it("accepts the right password", async () => {
    await signUp("login@example.com");
    const user = await users.authenticate("login@example.com", "a-long-enough-password");
    assert.equal(user?.email, "login@example.com");
  });

  it("rejects the wrong password, and an address with no account, the same way", async () => {
    await signUp("login@example.com");
    assert.equal(await users.authenticate("login@example.com", "wrong"), null);
    assert.equal(await users.authenticate("nobody@example.com", "whatever"), null);
  });

  it("never returns a password hash", async () => {
    await signUp("hash@example.com");
    const user = await users.authenticate("hash@example.com", "a-long-enough-password");
    assert.equal("passwordHash" in (user ?? {}), false);
  });

  it("refuses a password sign in for a Google-only account", async () => {
    // No password hash on the row, so there is nothing to verify against.
    await users.findOrCreateGoogleUser({ email: "google@example.com", name: "G" });
    assert.equal(await users.authenticate("google@example.com", "anything"), null);
  });
});

describe("revokeSessions", () => {
  it("moves the epoch, which is what invalidates issued cookies", async () => {
    const created = await signUp("epoch@example.com");
    assert.ok(created.ok);

    const before = (await users.findUserById(created.user.id))?.sessionEpoch;
    await users.revokeSessions(created.user.id);
    const after = (await users.findUserById(created.user.id))?.sessionEpoch;

    assert.equal(after, (before ?? 0) + 1);
  });

  it("does nothing for an account that does not exist", async () => {
    await users.revokeSessions("00000000-0000-0000-0000-000000000000");
  });
});
