import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with nothing but the Node standard library.
 *
 * bcrypt or argon2 would be the usual answer, but both are native
 * dependencies and this project has none. scrypt is built into Node, is a
 * memory-hard KDF designed for exactly this, and is a genuinely
 * appropriate choice rather than a shortcut.
 *
 * Stored form: scrypt$<N>$<salt hex>$<hash hex>. The cost lives in the
 * string, so raising it later leaves old hashes verifiable.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const COST = 16384; // 2^14, the standard interactive-login setting.
const KEY_LENGTH = 64;
const PARAMS = { r: 8, p: 1 };
/** Node's default maxmem (32MB) is too small for N=16384, r=8. */
const MAX_MEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  return `scrypt$${COST}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, costText, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !costText || !saltHex || !hashHex) return false;

  const cost = Number.parseInt(costText, 10);
  if (!Number.isInteger(cost) || cost < 1024) return false;

  let expected: Buffer;
  let salt: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
    salt = Buffer.from(saltHex, "hex");
  } catch {
    return false;
  }

  const actual = await scryptAsync(password, salt, expected.length, {
    N: cost,
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  // Constant time: a plain === leaks how many bytes matched through timing.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
