import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * The session cookie's FORMAT, and nothing about requests.
 *
 * Split out from lib/session.ts deliberately. That module reaches for
 * next/headers, which only resolves inside Next's runtime, so the signing and
 * verifying that actually stands between a forged cookie and a signed-in
 * session could not be tested on its own. This file imports nothing but the
 * Node standard library.
 *
 * The cookie is <payload>.<signature>, where payload is base64url JSON holding
 * a user id, the account's session epoch, and an expiry, and the signature is
 * an HMAC over it. Nothing secret rides in the cookie, and nothing in it can
 * be edited without the key, so a tampered cookie is rejected rather than
 * believed.
 *
 * Next's own auth guide reaches for `jose` and a JWT here. An HMAC over a tiny
 * payload is the same idea with one algorithm instead of a library, and this
 * project deliberately has no runtime dependencies.
 */

export interface SessionPayload {
  uid: string;
  /** The account's session epoch when this cookie was issued. */
  gen: number;
  /** Unix seconds. */
  exp: number;
}

/** Beside the data file, so the two travel together. */
const SECRET_FILE = resolve(
  dirname(resolve(process.cwd(), process.env.DATA_FILE || "data/catering.json")),
  ".session-secret"
);

/** Shorter than this is not a key. 32 bytes of base64 is 43 characters. */
export const MIN_SECRET_LENGTH = 32;

let secretPromise: Promise<Buffer> | null = null;

/**
 * SESSION_SECRET when it is set, which is what production must use so that
 * sessions survive a deploy and are not readable from the repo.
 *
 * With nothing set, generate one and keep it beside the data file, so a
 * developer can clone this and log in without configuring anything, and still
 * not have their session dropped on every restart. Refuse to do that in
 * production: a secret sitting on an ephemeral disk is a silent logout for
 * everyone, and it belongs in the environment instead.
 */
export function getSessionSecret(): Promise<Buffer> {
  secretPromise ??= (async () => {
    const fromEnv = process.env.SESSION_SECRET;
    if (fromEnv && fromEnv.length >= MIN_SECRET_LENGTH) return Buffer.from(fromEnv, "utf8");

    if (fromEnv) {
      // Set but too short is a mistake worth naming. Falling back silently
      // would mean running on a key nobody meant to use.
      throw new Error(
        `SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 32`
      );
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be set in production. Generate one with: openssl rand -base64 32"
      );
    }

    try {
      const existing = (await readFile(SECRET_FILE, "utf8")).trim();
      if (existing.length >= MIN_SECRET_LENGTH) return Buffer.from(existing, "utf8");
    } catch {
      // First run in this checkout; fall through and make one.
    }
    const generated = randomBytes(32).toString("base64url");
    await mkdir(dirname(SECRET_FILE), { recursive: true });
    // 0600: the development key is still a key, and the data directory is not
    // necessarily private on a shared machine.
    await writeFile(SECRET_FILE, `${generated}\n`, { encoding: "utf8", mode: 0o600 });
    return Buffer.from(generated, "utf8");
  })();
  return secretPromise;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const secret = await getSessionSecret();
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  // Exactly two parts. A token with an extra dot would otherwise have its tail
  // ignored, which is a difference between what was signed and what is read.
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  if (!body || !signature) return null;

  const secret = await getSessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  // Constant time, and the length check first because timingSafeEqual throws
  // on a length mismatch rather than returning false.
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "string" || !payload.uid) return null;
    if (typeof payload.exp !== "number" || typeof payload.gen !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
