import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeComparison,
  encodeWhere,
  quoteValue,
} from "@/lib/db/postgrest-filter";

/**
 * These tests are about one thing: a value can never become syntax.
 *
 * PostgREST parses the DECODED query string, so the quoting here has to
 * hold before URL encoding is applied. Each case below is a string that
 * would change the meaning of the query if it were spliced in raw.
 */
describe("quoteValue", () => {
  it("quotes an ordinary value", () => {
    assert.equal(quoteValue("ari@example.com"), '"ari@example.com"');
  });

  it("contains a comma, so it cannot start a second filter", () => {
    assert.equal(quoteValue("a,role.eq.owner"), '"a,role.eq.owner"');
  });

  it("escapes a double quote, so it cannot close the quoting early", () => {
    assert.equal(quoteValue('a",role.eq.owner,x."'), '"a\\",role.eq.owner,x.\\""');
  });

  it("escapes backslashes before quotes, not after", () => {
    // The dangerous input: a trailing backslash would otherwise escape the
    // closing quote and let everything after it become syntax.
    assert.equal(quoteValue("a\\"), '"a\\\\"');
    assert.equal(quoteValue('a\\"'), '"a\\\\\\""');
  });

  it("quotes numbers and booleans too, rather than trusting their shape", () => {
    assert.equal(quoteValue(42), '"42"');
    assert.equal(quoteValue(true), '"true"');
  });

  it("leaves no unescaped quote anywhere inside the literal", () => {
    const nasty = ['", or.(role.eq.owner)', 'x")--', '\\\\", role.eq."owner'];
    for (const input of nasty) {
      const quoted = quoteValue(input);
      const inner = quoted.slice(1, -1);
      // Strip every escaped pair, then nothing hazardous may remain.
      const remaining = inner.replace(/\\\\/g, "").replace(/\\"/g, "");
      assert.ok(!remaining.includes('"'), `bare quote survived in ${quoted}`);
      assert.ok(!remaining.includes("\\"), `bare backslash survived in ${quoted}`);
    }
  });
});

describe("encodeComparison", () => {
  it("spells null as is.null, not eq.null", () => {
    assert.equal(encodeComparison({ eq: null }), "is.null");
    assert.equal(encodeComparison({ neq: null }), "not.is.null");
  });

  it("encodes the ordering comparisons", () => {
    assert.equal(encodeComparison({ gt: 5 }), 'gt."5"');
    assert.equal(encodeComparison({ gte: "2026-01-01" }), 'gte."2026-01-01"');
    assert.equal(encodeComparison({ lt: 5 }), 'lt."5"');
    assert.equal(encodeComparison({ lte: 5 }), 'lte."5"');
  });

  it("encodes IN as a quoted list", () => {
    assert.equal(encodeComparison({ in: ["new", "read"] }), 'in.("new","read")');
  });

  it("turns an empty IN into something that matches nothing", () => {
    // in.() is a parse error and in.("") matches the empty string. Neither
        // is what "none of these" means.
    const encoded = encodeComparison({ in: [] });
    assert.ok(!encoded.includes("()"), encoded);
    assert.ok(!encoded.includes('""'), encoded);
  });

  it("quotes a value inside IN that carries the list separator", () => {
    assert.equal(encodeComparison({ in: ['a","b'] }), 'in.("a\\",\\"b")');
  });
});

describe("encodeWhere", () => {
  it("is empty for no conditions", () => {
    assert.equal(encodeWhere(undefined).toString(), "");
    assert.equal(encodeWhere({}).toString(), "");
  });

  it("converts camelCase keys to the column name", () => {
    const params = encodeWhere<{ userId: string }>({ all: { userId: "u1" } });
    assert.equal(params.get("user_id"), 'eq."u1"');
    assert.equal(params.get("userId"), null);
  });

  it("ANDs one parameter per column", () => {
    const params = encodeWhere<{ id: string; status: string }>({
      all: { id: "o1", status: "pending" },
    });
    assert.equal(params.get("id"), 'eq."o1"');
    assert.equal(params.get("status"), 'eq."pending"');
  });

  it("builds an or=() group", () => {
    const params = encodeWhere<{ userId: string | null; email: string }>({
      any: [{ userId: "u1" }, { email: "a@b.co" }],
    });
    assert.equal(params.get("or"), '(user_id.eq."u1",email.eq."a@b.co")');
  });

  it("wraps a multi-condition OR branch in and(), so it is not flattened", () => {
    const params = encodeWhere<{ a: string; b: string; c: string }>({
      any: [{ a: "1", b: "2" }, { c: "3" }],
    });
    assert.equal(params.get("or"), '(and(a.eq."1",b.eq."2"),c.eq."3")');
  });

  it("quotes inside an OR group as well, which is the easier place to forget", () => {
    const params = encodeWhere<{ email: string }>({
      any: [{ email: 'x",role.eq."owner' }],
    });
    assert.equal(params.get("or"), '(email.eq."x\\",role.eq.\\"owner")');
  });

  it("survives a round trip through URL encoding", () => {
    const params = encodeWhere<{ email: string }>({ all: { email: "a,b.c(d)" } });
    const reparsed = new URLSearchParams(params.toString());
    assert.equal(reparsed.get("email"), 'eq."a,b.c(d)"');
  });
});
