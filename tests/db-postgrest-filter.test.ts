import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeComparison,
  encodeWhere,
  matchesNothing,
  quoteValue,
} from "@/lib/db/postgrest-filter";

/**
 * These tests are about two things. A value can never become syntax. And a
 * value arrives at Postgres as exactly itself, which is the one a unit test
 * missed for months: every top-level value was quoted, PostgREST kept the
 * quotes, and production matched no email, parsed no uuid and counted no
 * rate limit window.
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
  it("spells null as is.null, not eq.null, in either position", () => {
    for (const position of ["param", "group"] as const) {
      assert.equal(encodeComparison({ eq: null }, position), "is.null");
      assert.equal(encodeComparison({ neq: null }, position), "not.is.null");
    }
  });

  it("writes a top-level value as it is, because PostgREST keeps quotes there", () => {
    assert.equal(encodeComparison({ eq: "00000000-0000-0000-0000-000000000000" }), "eq.00000000-0000-0000-0000-000000000000");
    assert.equal(encodeComparison({ neq: "owner" }), "neq.owner");
    assert.equal(encodeComparison({ gt: 5 }), "gt.5");
    assert.equal(encodeComparison({ gte: "2026-01-01T00:00:00.000Z" }), "gte.2026-01-01T00:00:00.000Z");
    assert.equal(encodeComparison({ lt: 5 }), "lt.5");
    assert.equal(encodeComparison({ lte: 5 }), "lte.5");
  });

  it("quotes every value inside a group, where , . ( ) are syntax", () => {
    assert.equal(encodeComparison({ eq: "a@b.co" }, "group"), 'eq."a@b.co"');
    assert.equal(encodeComparison({ gte: "2026-01-01" }, "group"), 'gte."2026-01-01"');
    assert.equal(encodeComparison({ lt: 5 }, "group"), 'lt."5"');
  });

  it("quotes a list in either position, because a list always reads quotes", () => {
    assert.equal(encodeComparison({ in: ["new", "read"] }), 'in.("new","read")');
    assert.equal(encodeComparison({ in: ["new", "read"] }, "group"), 'in.("new","read")');
  });

  it("refuses an empty IN, which has no spelling that means none of these", () => {
    // in.() is a parse error and in.("") matches the empty string.
    assert.throws(() => encodeComparison({ in: [] }), /empty IN/);
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
    assert.equal(params.get("user_id"), "eq.u1");
    assert.equal(params.get("userId"), null);
  });

  it("ANDs one parameter per column", () => {
    const params = encodeWhere<{ id: string; status: string }>({
      all: { id: "o1", status: "pending" },
    });
    assert.equal(params.get("id"), "eq.o1");
    assert.equal(params.get("status"), "eq.pending");
  });

  it("keeps a top-level value that looks like filter syntax as ONE value", () => {
    // Its own parameter: URLSearchParams escapes & and =, and PostgREST reads
    // everything after eq. literally, so none of this becomes a second filter.
    const hostile = 'a@b.co,role.eq.owner&role=eq.owner"(x)';
    const reparsed = new URLSearchParams(encodeWhere<{ email: string }>({ all: { email: hostile } }).toString());
    assert.deepEqual([...reparsed.keys()], ["email"]);
    assert.equal(reparsed.get("email"), `eq.${hostile}`);
  });

  it("builds an or=() group, quoted", () => {
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

  it("quotes inside an OR group, which is where a bare value would become syntax", () => {
    const params = encodeWhere<{ email: string }>({
      any: [{ email: 'x",role.eq."owner' }],
    });
    assert.equal(params.get("or"), '(email.eq."x\\",role.eq.\\"owner")');
  });

  it("survives a round trip through URL encoding", () => {
    const params = encodeWhere<{ email: string }>({ all: { email: "a,b.c(d)" } });
    const reparsed = new URLSearchParams(params.toString());
    assert.equal(reparsed.get("email"), "eq.a,b.c(d)");
  });
});

describe("a filter that matches nothing", () => {
  it("is an AND with an empty IN, or an OR whose every branch has one", () => {
    assert.equal(matchesNothing<{ id: string }>({ all: { id: { in: [] } } }), true);
    assert.equal(matchesNothing<{ a: string; b: string }>({ any: [{ a: { in: [] } }, { b: { in: [] } }] }), true);
    assert.equal(matchesNothing<{ a: string; b: string }>({ any: [{ a: { in: [] } }, { b: "x" }] }), false);
    assert.equal(matchesNothing<{ id: string }>({ all: { id: { in: ["x"] } } }), false);
    assert.equal(matchesNothing(undefined), false);
  });

  it("is refused by encodeWhere rather than sent without its impossible condition", () => {
    // Dropped from an update or a delete, the condition would widen it.
    assert.throws(() => encodeWhere<{ id: string; status: string }>({ all: { id: { in: [] }, status: "new" } }), /matches nothing/);
  });

  it("leaves an impossible OR branch out, which narrows the OR", () => {
    const params = encodeWhere<{ userId: string; orderId: string }>({
      any: [{ userId: "u1" }, { orderId: { in: [] } }],
    });
    assert.equal(params.get("or"), '(user_id.eq."u1")');
  });
});
