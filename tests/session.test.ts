import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

/**
 * The signed cookie format.
 *
 * signSession and verifySession are exported precisely so they can be tested
 * without a request: this pair is what stands between a forged cookie and a
 * signed-in session, and testing it through a browser would only exercise the
 * happy path.
 */

const TEST_TMP = ".test-tmp";

let directory: string;
let signSession: typeof import("@/lib/session-token")["signSession"];
let verifySession: typeof import("@/lib/session-token")["verifySession"];

const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 10;

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "session-"));
  process.env.DATA_FILE = join(directory, "session.json");
  process.env.SESSION_SECRET = "a-test-secret-that-is-long-enough-to-pass";

  // session-token.ts, not session.ts: the latter imports next/headers, which
  // only resolves inside Next's runtime. That split is why this is testable.
  ({ signSession, verifySession } = await import("@/lib/session-token"));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("session cookies", () => {
  it("round trips a payload", async () => {
    const token = await signSession({ uid: "user-1", gen: 0, exp: future() });
    const payload = await verifySession(token);

    assert.equal(payload?.uid, "user-1");
    assert.equal(payload?.gen, 0);
  });

  it("puts nothing secret in the cookie", async () => {
    const token = await signSession({ uid: "user-1", gen: 3, exp: future() });
    const body = Buffer.from(token.split(".")[0]!, "base64url").toString("utf8");

    // Readable on purpose. The signature is what makes it trustworthy, not
    // obscurity, so the payload is checked to hold ONLY these three fields.
    assert.deepEqual(Object.keys(JSON.parse(body)).sort(), ["exp", "gen", "uid"]);
  });

  it("rejects a payload edited without the key", async () => {
    const token = await signSession({ uid: "user-1", gen: 0, exp: future() });
    const [, signature] = token.split(".");

    // The attack: keep the signature, swap the user id for somebody else's.
    const forged = Buffer.from(
      JSON.stringify({ uid: "the-owner", gen: 0, exp: future() }),
      "utf8"
    ).toString("base64url");

    assert.equal(await verifySession(`${forged}.${signature}`), null);
  });

  it("rejects a tampered signature", async () => {
    const token = await signSession({ uid: "user-1", gen: 0, exp: future() });
    const [body, signature] = token.split(".");
    const flipped = signature!.slice(0, -1) + (signature!.endsWith("A") ? "B" : "A");

    assert.equal(await verifySession(`${body}.${flipped}`), null);
  });

  it("rejects a malformed token rather than throwing", async () => {
    for (const bad of [
      "",
      "nodot",
      ".",
      "a.",
      ".b",
      "a.b.c", // Exactly two parts, or the tail would be signed but ignored.
      "!!!.!!!",
      Buffer.from("not json", "utf8").toString("base64url") + ".sig",
    ]) {
      assert.equal(await verifySession(bad), null, `should reject ${JSON.stringify(bad)}`);
    }
  });

  it("rejects an expired cookie", async () => {
    const token = await signSession({ uid: "user-1", gen: 0, exp: past() });
    assert.equal(await verifySession(token), null);
  });

  it("rejects a payload missing any required field", async () => {
    for (const payload of [
      { gen: 0, exp: future() },
      { uid: "u", exp: future() },
      { uid: "u", gen: 0 },
      { uid: "", gen: 0, exp: future() },
      { uid: "u", gen: "0", exp: future() },
      { uid: 1, gen: 0, exp: future() },
    ]) {
      // Signed with the real key, so only the shape check can refuse it.
      const token = await signSession(payload as never);
      assert.equal(
        await verifySession(token),
        null,
        `should reject ${JSON.stringify(payload)}`
      );
    }
  });

  it("carries the epoch, which is what makes a session revocable", async () => {
    // The cookie cannot be recalled once issued. getCurrentUser compares this
    // number against the account's current epoch, so bumping the account's
    // epoch invalidates every cookie ever issued for it.
    const token = await signSession({ uid: "user-1", gen: 7, exp: future() });
    assert.equal((await verifySession(token))?.gen, 7);
  });

  it("produces a different signature for a different payload", async () => {
    const a = await signSession({ uid: "user-1", gen: 0, exp: future() });
    const b = await signSession({ uid: "user-2", gen: 0, exp: future() });
    assert.notEqual(a.split(".")[1], b.split(".")[1]);
  });
});
