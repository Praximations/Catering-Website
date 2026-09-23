import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { twilioSignature, verifyTwilioSignature } from "@/lib/sms/twilio";

/**
 * The inbound webhook is public. This signature is the only thing standing
 * between it and anybody posting a "customer" text into an order thread.
 */

// Twilio's own worked example from its webhook security documentation.
const URL_ = "https://mycompany.com/myapp.php?foo=1&bar=2";
const TOKEN = "12345";
const PARAMS = new URLSearchParams({
  CallSid: "CA1234567890ABCDE",
  Caller: "+12349013030",
  Digits: "1234",
  From: "+12349013030",
  To: "+18005551212",
});
const EXPECTED = "0/KCTR6DLpKmkAf8muzZqo1nDgQ=";

describe("twilioSignature", () => {
  it("matches Twilio's published example", () => {
    assert.equal(twilioSignature(TOKEN, URL_, PARAMS), EXPECTED);
  });

  it("sorts the parameters by name, whatever order they arrived in", () => {
    const shuffled = new URLSearchParams([...PARAMS.entries()].reverse());
    assert.equal(twilioSignature(TOKEN, URL_, shuffled), EXPECTED);
  });
});

describe("verifyTwilioSignature", () => {
  it("accepts the right signature", () => {
    assert.equal(verifyTwilioSignature(TOKEN, URL_, PARAMS, EXPECTED), true);
  });

  it("refuses a tampered body", () => {
    const tampered = new URLSearchParams(PARAMS);
    tampered.set("Digits", "9999");
    assert.equal(verifyTwilioSignature(TOKEN, URL_, tampered, EXPECTED), false);
  });

  it("refuses the signature for a different URL", () => {
    assert.equal(verifyTwilioSignature(TOKEN, "https://mycompany.com/other.php", PARAMS, EXPECTED), false);
  });

  it("refuses a signature of the wrong length rather than throwing", () => {
    assert.equal(verifyTwilioSignature(TOKEN, URL_, PARAMS, "short"), false);
    assert.equal(verifyTwilioSignature(TOKEN, URL_, PARAMS, `${EXPECTED}extra`), false);
  });

  it("refuses when there is no signature, or no token to check it with", () => {
    assert.equal(verifyTwilioSignature(TOKEN, URL_, PARAMS, null), false);
    assert.equal(verifyTwilioSignature("", URL_, PARAMS, EXPECTED), false);
  });
});
