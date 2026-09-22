import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("password hashing", () => {
  it("verifies the password it hashed", async () => {
    const stored = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("correct horse battery staple", stored), true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    assert.equal(await verifyPassword("Correct horse battery staple", stored), false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same input");
    const b = await hashPassword("same input");
    assert.notEqual(a, b);
  });

  it("stores the cost in the hash so it can be raised later", async () => {
    const [scheme, cost] = (await hashPassword("x")).split("$");
    assert.equal(scheme, "scrypt");
    assert.equal(Number(cost), 16384);
  });

  it("refuses a malformed stored hash instead of throwing", async () => {
    for (const bad of ["", "nonsense", "scrypt$", "bcrypt$16384$aa$bb", "scrypt$1$aa$bb"]) {
      assert.equal(await verifyPassword("x", bad), false, `should reject ${JSON.stringify(bad)}`);
    }
  });
});
