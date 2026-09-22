import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { verifyStripeSignature } from "@/lib/payments/stripe";

/**
 * The signature check is the only thing between a forged POST and an order
 * marked paid, so it is tested directly rather than only through the route.
 */

const SECRET = "whsec_test_secret_value";
const PAYLOAD = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });

function sign(payload: string, at: number, secret = SECRET): string {
  const timestamp = Math.floor(at / 1000);
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

describe("verifyStripeSignature", () => {
  const now = Date.UTC(2026, 8, 22, 12, 0, 0);

  it("accepts a correctly signed payload", () => {
    assert.equal(verifyStripeSignature(PAYLOAD, sign(PAYLOAD, now), SECRET, now), true);
  });

  it("rejects a payload that was altered after signing", () => {
    const header = sign(PAYLOAD, now);
    const tampered = PAYLOAD.replace("evt_1", "evt_2");
    assert.equal(verifyStripeSignature(tampered, header, SECRET, now), false);
  });

  it("rejects a signature made with a different secret", () => {
    const header = sign(PAYLOAD, now, "whsec_the_wrong_secret");
    assert.equal(verifyStripeSignature(PAYLOAD, header, SECRET, now), false);
  });

  it("rejects a missing or malformed header", () => {
    for (const header of [null, "", "garbage", "t=123", "v1=abc", "t=,v1=", "t=abc,v1=def"]) {
      assert.equal(
        verifyStripeSignature(PAYLOAD, header, SECRET, now),
        false,
        `should reject ${JSON.stringify(header)}`
      );
    }
  });

  it("rejects a replay from outside the tolerance, in both directions", () => {
    const old = sign(PAYLOAD, now - 10 * 60 * 1000);
    const future = sign(PAYLOAD, now + 10 * 60 * 1000);
    assert.equal(verifyStripeSignature(PAYLOAD, old, SECRET, now), false);
    assert.equal(verifyStripeSignature(PAYLOAD, future, SECRET, now), false);
  });

  it("accepts a signature inside the tolerance", () => {
    const recent = sign(PAYLOAD, now - 4 * 60 * 1000);
    assert.equal(verifyStripeSignature(PAYLOAD, recent, SECRET, now), true);
  });

  it("refuses rather than throwing on a non-hex v1, which used to be a 500", () => {
    // Buffer.from(x, "hex") silently truncates on a bad character, which handed
    // timingSafeEqual two different lengths and made it THROW. A forged header
    // came back as a server error instead of a refusal.
    const valid = sign(PAYLOAD, now);
    const digestLength = valid.split("v1=")[1]!.length;
    for (const bad of ["z".repeat(digestLength), "!".repeat(digestLength), `${"a".repeat(digestLength - 1)}g`]) {
      const header = `t=${Math.floor(now / 1000)},v1=${bad}`;
      assert.doesNotThrow(() => verifyStripeSignature(PAYLOAD, header, SECRET, now));
      assert.equal(verifyStripeSignature(PAYLOAD, header, SECRET, now), false);
    }
  });

  it("accepts when one of several v1 signatures matches, as during a secret roll", () => {
    const good = sign(PAYLOAD, now).split("v1=")[1]!;
    const header = `t=${Math.floor(now / 1000)},v1=${"a".repeat(good.length)},v1=${good}`;
    assert.equal(verifyStripeSignature(PAYLOAD, header, SECRET, now), true);
  });

  it("refuses everything when no webhook secret is configured", () => {
    // The fail-closed case: an unconfigured site must not accept webhooks.
    assert.equal(verifyStripeSignature(PAYLOAD, sign(PAYLOAD, now), undefined, now), false);
    assert.equal(verifyStripeSignature(PAYLOAD, sign(PAYLOAD, now), "", now), false);
  });
});
