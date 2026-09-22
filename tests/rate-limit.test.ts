import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { RateLimit } from "@/lib/rate-limit";

const TEST_TMP = ".test-tmp";

let directory: string;
let limiter: typeof import("@/lib/rate-limit");
let db: typeof import("@/lib/db")["db"];

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "ratelimit-"));
  process.env.DATA_FILE = join(directory, "rl.json");
  // bucketFor salts with this; set it so the test does not depend on the
  // development fallback.
  process.env.SESSION_SECRET = "a-test-secret-long-enough-to-be-accepted";

  limiter = await import("@/lib/rate-limit");
  ({ db } = await import("@/lib/db"));
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

const SMALL: RateLimit = { max: 3, windowSeconds: 60 };

describe("checkRateLimit", () => {
  it("allows exactly max attempts, then refuses", async () => {
    const bucket = "test:allows-max";
    const results = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      results.push((await limiter.checkRateLimit(bucket, SMALL)).allowed);
    }
    assert.deepEqual(results, [true, true, true, false, false]);
  });

  it("counts down the remaining attempts", async () => {
    const bucket = "test:remaining";
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).remaining, 2);
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).remaining, 1);
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).remaining, 0);
  });

  it("tells a refused caller how long to wait", async () => {
    const bucket = "test:retry-after";
    for (let attempt = 0; attempt < SMALL.max; attempt += 1) {
      await limiter.checkRateLimit(bucket, SMALL);
    }
    const refused = await limiter.checkRateLimit(bucket, SMALL);
    assert.equal(refused.allowed, false);
    assert.equal(refused.retryAfterSeconds, SMALL.windowSeconds);
  });

  it("keeps buckets separate, so one caller cannot lock out another", async () => {
    const mine = "test:separate-a";
    const theirs = "test:separate-b";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await limiter.checkRateLimit(mine, SMALL);
    }
    assert.equal((await limiter.checkRateLimit(mine, SMALL)).allowed, false);
    assert.equal((await limiter.checkRateLimit(theirs, SMALL)).allowed, true);
  });

  it("ignores attempts from outside the window", async () => {
    const bucket = "test:window";
    // Written directly, dated well outside the window: real time cannot be
    // waited out in a test.
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await db.rateLimitHits.insert({ bucket, at: old });
    }
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).allowed, true);
  });

  it("clearRateLimit forgets the failures before a success", async () => {
    const bucket = "test:clear";
    for (let attempt = 0; attempt < SMALL.max; attempt += 1) {
      await limiter.checkRateLimit(bucket, SMALL);
    }
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).allowed, false);

    await limiter.clearRateLimit(bucket);
    assert.equal((await limiter.checkRateLimit(bucket, SMALL)).allowed, true);
  });

  it("pruneOldHits removes what nobody will count again, and nothing else", async () => {
    const bucket = "test:prune";
    await db.rateLimitHits.insert({
      bucket,
      at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    await db.rateLimitHits.insert({ bucket, at: new Date().toISOString() });

    await limiter.pruneOldHits();
    assert.equal(await db.rateLimitHits.count({ all: { bucket } }), 1);
  });
});

describe("bucketFor", () => {
  it("does not put the identifier in the bucket name", async () => {
    // A bucket name is stored. An email address in it is personal data sitting
    // in a table whose only job is counting.
    const bucket = limiter.bucketFor("login", "ari@example.com");
    assert.equal(bucket.includes("ari"), false);
    assert.equal(bucket.includes("example.com"), false);
    assert.equal(bucket.startsWith("login:"), true);
  });

  it("is stable for the same input, so a limit actually accumulates", () => {
    assert.equal(
      limiter.bucketFor("login", "ari@example.com"),
      limiter.bucketFor("login", "ari@example.com")
    );
  });

  it("ignores case, so Ari@ and ari@ are one account", () => {
    assert.equal(
      limiter.bucketFor("login", "Ari@Example.com"),
      limiter.bucketFor("login", "ari@example.com")
    );
  });

  it("separates actions, so a failed sign in does not spend a signup attempt", () => {
    assert.notEqual(
      limiter.bucketFor("login", "ari@example.com"),
      limiter.bucketFor("signup", "ari@example.com")
    );
  });

  it("separates identifiers", () => {
    assert.notEqual(
      limiter.bucketFor("login", "a@example.com"),
      limiter.bucketFor("login", "b@example.com")
    );
  });
});

describe("the configured limits", () => {
  it("are tighter for sign in than for a public form", () => {
    // Password guessing is the thing that matters most here.
    assert.ok(limiter.LOGIN_LIMIT.max < limiter.PUBLIC_FORM_LIMIT.max);
  });

  it("all have a positive max and window", () => {
    for (const [name, limit] of Object.entries({
      LOGIN_LIMIT: limiter.LOGIN_LIMIT,
      SIGNUP_LIMIT: limiter.SIGNUP_LIMIT,
      PUBLIC_FORM_LIMIT: limiter.PUBLIC_FORM_LIMIT,
      CHECKOUT_LIMIT: limiter.CHECKOUT_LIMIT,
      PRAXI_CONTROL_LIMIT: limiter.PRAXI_CONTROL_LIMIT,
    })) {
      assert.ok(limit.max > 0, `${name}.max must be positive`);
      assert.ok(limit.windowSeconds > 0, `${name}.windowSeconds must be positive`);
    }
  });
});
