import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkEventDate,
  checkGuests,
  choice,
  flag,
  integer,
  isEmail,
  LIMITS,
  lines,
  password,
  Problems,
  safeNextPath,
  text,
} from "@/lib/validation";

/** FormData is available globally in Node 18 and later. */
function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const one of Array.isArray(value) ? value : [value]) data.append(key, one);
  }
  return data;
}

describe("text()", () => {
  it("trims", () => {
    assert.equal(text(form({ a: "  hi  " }), "a", 100), "hi");
  });

  it("truncates to the cap, which is the whole point of requiring one", () => {
    assert.equal(text(form({ a: "x".repeat(5000) }), "a", 10).length, 10);
  });

  it("reads a missing field as empty rather than undefined", () => {
    assert.equal(text(form({}), "nope", 100), "");
  });

  it("refuses a File instead of storing '[object File]'", () => {
    const data = new FormData();
    data.append("a", new File(["hello"], "a.txt"));
    assert.equal(text(data, "a", 100), "");
  });
});

describe("password()", () => {
  it("keeps whitespace, because a space is a character they typed", () => {
    assert.equal(password(form({ p: " lead and trail " }), "p"), " lead and trail ");
  });

  it("caps length so scrypt cost stays bounded", () => {
    assert.equal(password(form({ p: "x".repeat(10_000) }), "p").length, LIMITS.password);
  });
});

describe("integer()", () => {
  it("parses a plain integer", () => {
    assert.equal(integer(form({ n: "42" }), "n"), 42);
  });

  it("rejects anything that is not all digits", () => {
    for (const bad of ["", "12.5", "12abc", "abc", "1e3", " ", "0x10", "Infinity", "NaN"]) {
      assert.equal(integer(form({ n: bad }), "n"), null, `should reject ${JSON.stringify(bad)}`);
    }
  });

  it("rejects a number too large to be exact", () => {
    assert.equal(integer(form({ n: "9".repeat(30) }), "n"), null);
  });

  it("accepts a negative, leaving the range check to the caller", () => {
    assert.equal(integer(form({ n: "-5" }), "n"), -5);
  });
});

describe("choice()", () => {
  const allowed = ["new", "contacted"] as const;

  it("returns a value that is in the set", () => {
    assert.equal(choice(form({ s: "contacted" }), "s", allowed), "contacted");
  });

  it("returns null for a value that is not, rather than trusting a cast", () => {
    assert.equal(choice(form({ s: "owner" }), "s", allowed), null);
    assert.equal(choice(form({}), "s", allowed), null);
  });
});

describe("flag()", () => {
  it("reads the usual falsey spellings as off", () => {
    for (const off of ["", "false", "0", "off", "OFF"]) {
      assert.equal(flag(form({ f: off }), "f"), false, `${JSON.stringify(off)} should be off`);
    }
  });

  it("reads anything else as on", () => {
    for (const on of ["on", "true", "1", "yes"]) {
      assert.equal(flag(form({ f: on }), "f"), true);
    }
  });
});

describe("lines()", () => {
  it("splits, trims and drops blanks", () => {
    assert.deepEqual(lines("a\n\n  b  \r\nc", 10), ["a", "b", "c"]);
  });

  it("bounds both the number of lines and each line", () => {
    assert.equal(lines("a\n".repeat(500), 12).length, 12);
    assert.equal(lines("x".repeat(9999), 12)[0]!.length, LIMITS.line);
  });
});

describe("isEmail()", () => {
  it("accepts ordinary addresses", () => {
    for (const good of ["a@b.co", "first.last+tag@sub.example.com"]) {
      assert.equal(isEmail(good), true, `${good} should pass`);
    }
  });

  it("rejects obvious nonsense", () => {
    for (const bad of ["", "a", "a@b", "a b@c.d", "@b.co", "a@.co", "a@b."]) {
      assert.equal(isEmail(bad), false, `${JSON.stringify(bad)} should fail`);
    }
  });

  it("rejects an address longer than SMTP carries", () => {
    assert.equal(isEmail(`${"a".repeat(250)}@b.co`), false);
  });
});

describe("checkEventDate()", () => {
  const isoDaysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  it("accepts today and the future", () => {
    assert.equal(checkEventDate(isoDaysFromNow(0)), null);
    assert.equal(checkEventDate(isoDaysFromNow(30)), null);
  });

  it("reports a date that has passed", () => {
    assert.equal(checkEventDate(isoDaysFromNow(-1)), "past");
  });

  it("reports a missing date", () => {
    assert.equal(checkEventDate(""), "missing");
  });

  it("reports a wrong shape", () => {
    for (const bad of ["not a date", "2026-1-1", "01-01-2026", "20260101"]) {
      assert.equal(checkEventDate(bad), "malformed", `${JSON.stringify(bad)} should be malformed`);
    }
  });

  it("catches a day that rolls into the next month, which the regex allows", () => {
    // The bug this exists for: 2027-02-31 matches the regex and Date
    // silently turns it into 2027-03-03.
    assert.equal(checkEventDate("2027-02-31"), "malformed");
    assert.equal(checkEventDate("2027-13-01"), "malformed");
    assert.equal(checkEventDate("2027-04-31"), "malformed");
  });

  it("accepts a real leap day and rejects a fake one", () => {
    assert.equal(checkEventDate("2028-02-29"), null); // 2028 is a leap year.
    assert.equal(checkEventDate("2027-02-29"), "malformed");
  });
});

describe("checkGuests()", () => {
  it("accepts a sensible head count", () => {
    assert.equal(checkGuests(20), null);
  });

  it("reports missing for null, zero and negatives", () => {
    for (const bad of [null, 0, -1]) assert.equal(checkGuests(bad), "missing");
  });

  it("reports too many past the ceiling", () => {
    assert.equal(checkGuests(5001), "too_many");
  });
});

describe("Problems", () => {
  it("keeps the first message for a field", () => {
    const problems = new Problems();
    problems.add("email", "first").add("email", "second");
    assert.deepEqual(problems.fieldErrors, { email: "first" });
  });

  it("only adds when the condition holds", () => {
    const problems = new Problems();
    problems.when(false, "a", "no").when(true, "b", "yes");
    assert.deepEqual(problems.fieldErrors, { b: "yes" });
    assert.equal(problems.any, true);
  });

  it("is empty until something fails", () => {
    assert.equal(new Problems().any, false);
  });

  it("hands out a copy, so a caller cannot mutate it afterwards", () => {
    const problems = new Problems();
    problems.add("a", "x");
    problems.fieldErrors.a = "tampered";
    assert.equal(problems.fieldErrors.a, "x");
  });
});

describe("safeNextPath", () => {
  it("keeps a path on this site, with its query and fragment", () => {
    assert.equal(safeNextPath("/cart"), "/cart");
    assert.equal(safeNextPath("/account/orders?tab=past#top"), "/account/orders?tab=past#top");
  });

  it("refuses anything that would leave the site, which is an open redirect", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\evil.example",
      "javascript:alert(1)",
      "cart",
      "/ /evil",
      "/\u0000",
      "/café",
    ]) {
      assert.equal(safeNextPath(value), null, value);
    }
  });

  it("refuses nothing and anything too long", () => {
    assert.equal(safeNextPath(null), null);
    assert.equal(safeNextPath(""), null);
    assert.equal(safeNextPath(`/${"a".repeat(200)}`), null);
  });
});
