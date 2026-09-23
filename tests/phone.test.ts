import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { samePhone, toE164 } from "@/lib/phone";

/**
 * A wrong answer here sends an order's text message to a stranger, or files a
 * stranger's reply under a customer's order.
 */

describe("toE164", () => {
  it("keeps a number that already carries its country code", () => {
    assert.equal(toE164("+44 20 7946 0000", ""), "+442079460000");
  });

  it("reads a bare ten digit number as North American only for a US or Canadian business", () => {
    assert.equal(toE164("(555) 010-2233", "us"), "+15550102233");
    assert.equal(toE164("555.010.2233", "gb,ca"), "+15550102233");
    assert.equal(toE164("1 555 010 2233", "us"), "+15550102233");
  });

  it("refuses to guess a country anywhere else", () => {
    assert.equal(toE164("020 7946 0000", "gb"), null);
    assert.equal(toE164("5550102233", ""), null);
  });

  it("refuses what cannot be a phone number", () => {
    assert.equal(toE164("+12", ""), null);
    assert.equal(toE164("+1234567890123456", ""), null);
    assert.equal(toE164("call me", "us"), null);
  });
});

describe("samePhone", () => {
  it("matches however the number is written, with or without a country code", () => {
    assert.equal(samePhone("(555) 010-2233", "+1 555 010 2233"), true);
    assert.equal(samePhone("555.010.2233", "5550102233"), true);
  });

  it("does not match a different line", () => {
    assert.equal(samePhone("555 010 2233", "555 010 2234"), false);
  });

  it("never matches a number too short to be sure of", () => {
    assert.equal(samePhone("12345", "12345"), false);
    assert.equal(samePhone("", ""), false);
  });
});
