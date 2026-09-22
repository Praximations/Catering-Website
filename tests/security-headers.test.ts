import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contentSecurityPolicy,
  STATIC_SECURITY_HEADERS,
  STRICT_TRANSPORT_SECURITY,
} from "@/lib/security-headers";

/** Parse a policy into directive to sources, the way a browser reads it. */
function parse(policy: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of policy.split(";").map((p) => p.trim()).filter(Boolean)) {
    const [directive, ...sources] = part.split(/\s+/);
    out[directive!] = sources;
  }
  return out;
}

const NONCE = "dGVzdC1ub25jZQ==";

describe("contentSecurityPolicy", () => {
  const production = parse(contentSecurityPolicy({ nonce: NONCE }));
  const development = parse(contentSecurityPolicy({ nonce: NONCE, development: true }));

  it("carries the nonce it was given", () => {
    assert.ok(production["script-src"]!.includes(`'nonce-${NONCE}'`));
  });

  it("uses strict-dynamic, so a host allowlist cannot be the way scripts load", () => {
    assert.ok(production["script-src"]!.includes("'strict-dynamic'"));
  });

  it("locks down the directives that turn an injection into execution", () => {
    assert.deepEqual(production["object-src"], ["'none'"]);
    assert.deepEqual(production["base-uri"], ["'self'"]);
    assert.deepEqual(production["form-action"], ["'self'"]);
    assert.deepEqual(production["frame-ancestors"], ["'none'"]);
    assert.deepEqual(production["frame-src"], ["'none'"]);
    assert.deepEqual(production["worker-src"], ["'self'"]);
    assert.deepEqual(production["default-src"], ["'self'"]);
  });

  it("allows inline STYLE but not inline script, which is the deliberate asymmetry", () => {
    // An injected style restyles the page. An injected script runs as the site.
    assert.ok(production["style-src"]!.includes("'unsafe-inline'"));
    // 'unsafe-inline' is present only as a fallback for browsers with no nonce
    // support, where it is honoured; every browser that understands the nonce
    // beside it ignores it. The nonce must therefore always be present.
    assert.ok(
      production["script-src"]!.some((source) => source.startsWith("'nonce-")),
      "a nonce must always be in script-src, or the unsafe-inline fallback becomes the policy"
    );
  });

  it("keeps unsafe-eval out of production and allows it in development", () => {
    // React uses eval in development to rebuild server stack traces.
    assert.equal(production["script-src"]!.includes("'unsafe-eval'"), false);
    assert.equal(development["script-src"]!.includes("'unsafe-eval'"), true);
  });

  it("upgrades insecure requests in production only", () => {
    assert.ok("upgrade-insecure-requests" in production);
    // Over plain http in development this would break the dev server.
    assert.equal("upgrade-insecure-requests" in development, false);
  });

  it("allows the dev socket only in development", () => {
    assert.equal(development["connect-src"]!.includes("ws:"), true);
    assert.equal(production["connect-src"]!.includes("ws:"), false);
  });

  it("lets a configured provider's checkout host receive a form, and nothing else", () => {
    // Firefox and Safari apply form-action across redirects, so the Pay
    // button, which posts to a Server Action that redirects to hosted
    // checkout, is refused without this. Chrome does not check redirects, so
    // the failure is invisible in the browser most people test in.
    const withProvider = parse(
      contentSecurityPolicy({ nonce: NONCE, checkoutOrigins: ["https://checkout.stripe.com"] })
    );
    assert.deepEqual(withProvider["form-action"], ["'self'", "https://checkout.stripe.com"]);

    // With no provider configured the policy must not name a host this
    // deployment cannot reach.
    assert.deepEqual(production["form-action"], ["'self'"]);
  });

  it("names Supabase in connect-src only when it is configured", () => {
    const without = parse(contentSecurityPolicy({ nonce: NONCE }));
    assert.deepEqual(without["connect-src"], ["'self'"]);

    const with_ = parse(
      contentSecurityPolicy({ nonce: NONCE, supabaseUrl: "https://abc.supabase.co" })
    );
    assert.ok(with_["connect-src"]!.includes("https://abc.supabase.co"));
  });

  it("does NOT allow Stripe in connect-src, because it is only called server side", () => {
    const sources = production["connect-src"]!.join(" ");
    assert.equal(/stripe/i.test(sources), false);
  });

  it("allows no remote image hosts", () => {
    // Every image on this site is in public/. A remote host should be a
    // deliberate edit, not something a policy already permitted.
    assert.deepEqual(production["img-src"], ["'self'", "data:", "blob:"]);
  });

  it("serializes to something a browser can parse", () => {
    const policy = contentSecurityPolicy({ nonce: NONCE });
    assert.equal(policy.includes(";;"), false);
    assert.equal(policy.trim(), policy);
    assert.equal(/\n/.test(policy), false);
  });
});

describe("static security headers", () => {
  const byKey = new Map(STATIC_SECURITY_HEADERS.map((h) => [h.key, h.value]));

  it("denies framing", () => {
    assert.equal(byKey.get("X-Frame-Options"), "DENY");
  });

  it("stops content type sniffing", () => {
    assert.equal(byKey.get("X-Content-Type-Options"), "nosniff");
  });

  it("does not leak an order token through the Referer header", () => {
    // /orders/<token> is reachable without an account, so the path IS a
    // credential. A full-path referrer sent to another origin gives it away.
    const policy = byKey.get("Referrer-Policy");
    assert.ok(
      policy === "strict-origin-when-cross-origin" || policy === "no-referrer",
      `Referrer-Policy ${policy} would send the path cross-origin`
    );
  });

  it("turns off the device permissions nothing here uses", () => {
    const permissions = byKey.get("Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      assert.match(permissions, new RegExp(`${feature}=\\(\\)`));
    }
  });

  it("isolates the browsing context", () => {
    assert.equal(byKey.get("Cross-Origin-Opener-Policy"), "same-origin");
  });
});

describe("HSTS", () => {
  it("lasts two years and covers subdomains", () => {
    assert.match(STRICT_TRANSPORT_SECURITY.value, /max-age=63072000/);
    assert.match(STRICT_TRANSPORT_SECURITY.value, /includeSubDomains/);
  });

  it("does not ask for preload, which is close to irreversible", () => {
    // Submitting to the preload list is the site owner's call, not a default
    // somebody inherits by deploying this.
    assert.equal(/preload/.test(STRICT_TRANSPORT_SECURITY.value), false);
  });

  it("is not in the always-on list, because it must not be sent over http", () => {
    // Sent from localhost it pins localhost to https in that browser for two
    // years, breaking every other project on the machine.
    assert.equal(
      STATIC_SECURITY_HEADERS.some((h) => h.key === "Strict-Transport-Security"),
      false
    );
  });
});
