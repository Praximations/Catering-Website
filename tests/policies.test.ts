import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

/**
 * The policy pages are the one place the site makes promises in writing. Until
 * the business sets a cancellation window, a refund timescale, a delivery fee
 * or a governing law in lib/business.ts, the pages must not invent one.
 */

const TEST_TMP = ".test-tmp";

let directory: string;
let policies: typeof import("@/lib/policies");

before(async () => {
  const root = join(process.cwd(), TEST_TMP);
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(join(root, "policies-"));
  process.env.DATA_FILE = join(directory, "policies.json");
  policies = await import("@/lib/policies");
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

const allText = () =>
  policies
    .searchIndex(policies.buildPolicies())
    .map((entry) => `${entry.heading} ${entry.text}`)
    .join("\n");

describe("policies with nothing set", () => {
  it("promise no cancellation window, refund timescale or head count deadline", () => {
    const text = allText();
    assert.doesNotMatch(text, /for a full refund/);
    assert.doesNotMatch(text, /within \d+ days/);
    assert.doesNotMatch(text, /change guest numbers up to/);
  });

  it("name no delivery fee and no governing law", () => {
    const text = allText();
    assert.match(text, /Any delivery charge is confirmed with you before you pay/);
    // Generic until a jurisdiction is named, never a guessed state or country.
    assert.match(text, /governed by the laws of the place where we trade/);
  });

  it("say they are a starting template", () => {
    assert.equal(policies.policiesAreTemplate, true);
  });
});

describe("policy structure", () => {
  it("has the four pages a customer expects", () => {
    const slugs = policies.buildPolicies().map((policy) => policy.slug);
    for (const slug of ["privacy", "terms", "refunds", "delivery"]) assert.ok(slugs.includes(slug), slug);
  });

  it("gives every section an id that is unique on its page, for the contents links", () => {
    for (const policy of policies.buildPolicies()) {
      const ids = policy.sections.map((section) => section.id);
      assert.equal(new Set(ids).size, ids.length, policy.slug);
    }
  });

  it("finds a page by its slug, and by an alias as not canonical", () => {
    assert.equal(policies.findPolicy("privacy")?.canonical, true);
    const aliased = policies.buildPolicies().find((policy) => policy.aliases?.length);
    if (aliased) {
      const found = policies.findPolicy(aliased.aliases![0]!);
      assert.equal(found?.policy.slug, aliased.slug);
      assert.equal(found?.canonical, false);
    }
    assert.equal(policies.findPolicy("nope"), null);
  });
});
