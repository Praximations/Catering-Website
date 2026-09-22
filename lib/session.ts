import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserById } from "./users";
import type { Role } from "./db/types";

/**
 * Sessions: a signed cookie, no session table, no dependencies.
 *
 * The cookie is <payload>.<signature>, where payload is base64url JSON
 * holding a user id, the account's session epoch, and an expiry, and the
 * signature is an HMAC over it. Nothing secret rides in the cookie, and
 * nothing in it can be edited without the key, so a tampered cookie is
 * rejected rather than believed.
 *
 * THE EPOCH IS THE REVOCATION. A signed cookie cannot be recalled once it
 * has been issued: deleting it only removes the copy in that one browser, so
 * a cookie copied off a shared machine stayed valid for the full fourteen
 * days no matter what the account did afterwards. Every request now compares
 * the epoch in the cookie against the account's current one, and bumping the
 * account's epoch invalidates every cookie ever issued for it at once.
 */

const COOKIE = "catering_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/* --------------------------------- the key -------------------------------- */

/** Beside the data file, so the two travel together. See lib/db/json.ts on
 *  why this is resolve and not join. */
const SECRET_FILE = resolve(
  dirname(resolve(process.cwd(), process.env.DATA_FILE ?? "data/catering.json")),
  ".session-secret"
);

/** Short enough to be brute forced is not a key. 32 bytes of base64 is 43. */
const MIN_SECRET_LENGTH = 32;

let secretPromise: Promise<Buffer> | null = null;

/**
 * SESSION_SECRET when it is set, which is what production must use so that
 * sessions survive a deploy and are not readable from the repo.
 *
 * With nothing set, generate one and keep it beside the data file, so a
 * developer can clone this and log in without configuring anything, and
 * still not have their session dropped on every restart. Refuse to do that
 * in production: a secret sitting on an ephemeral disk is a silent logout
 * for everyone, and it belongs in the environment instead.
 */
function getSecret(): Promise<Buffer> {
  secretPromise ??= (async () => {
    const fromEnv = process.env.SESSION_SECRET;
    if (fromEnv && fromEnv.length >= MIN_SECRET_LENGTH) return Buffer.from(fromEnv, "utf8");

    if (fromEnv && fromEnv.length < MIN_SECRET_LENGTH) {
      // Set but too short is a mistake worth naming. Falling back silently
      // would mean a key nobody meant to use.
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
    // 0600: the development key is still a key, and the data directory is
    // not necessarily private on a shared machine.
    await writeFile(SECRET_FILE, `${generated}\n`, { encoding: "utf8", mode: 0o600 });
    return Buffer.from(generated, "utf8");
  })();
  return secretPromise;
}

/* ------------------------------- sign / verify ----------------------------- */

interface Payload {
  uid: string;
  /** The account's session epoch when this cookie was issued. */
  gen: number;
  exp: number;
}

/**
 * Sign and verify are exported so they can be tested without a request.
 * They are pure apart from reading the key, which is the point: the cookie
 * format is the security boundary and deserves tests of its own.
 */
export async function signSession(payload: Payload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const secret = await getSecret();
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export async function verifySession(token: string): Promise<Payload | null> {
  // Exactly two parts. A token with an extra dot would otherwise have its
  // tail ignored, which is a difference between what was signed and what is
  // read back.
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  if (!body || !signature) return null;

  const secret = await getSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  // Constant time, and the length check first because timingSafeEqual throws
  // on a length mismatch rather than returning false.
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.uid !== "string" || !payload.uid) return null;
    if (typeof payload.exp !== "number" || typeof payload.gen !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* --------------------------------- the API -------------------------------- */

/**
 * Start a session. SERVER ACTIONS AND ROUTE HANDLERS ONLY: cookies cannot
 * be set once a Server Component has begun streaming, so calling this
 * during render throws.
 */
export async function createSession(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new Error("Cannot start a session for an account that does not exist.");

  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  const token = await signSession({
    uid: userId,
    gen: user.sessionEpoch,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    // Off over plain http, or the cookie is silently dropped in local dev.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** End a session. Server Actions and Route Handlers only, same reason. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Who is asking, or null. Safe to call from anywhere on the server, and
 * memoized per request so several components asking costs one read.
 *
 * The user is looked up fresh every request rather than trusted from the
 * cookie, so a deleted account, a changed role, or a revoked session takes
 * effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await findUserById(payload.uid);
  if (!user) return null;

  // The cookie was issued against an older epoch, so it has been revoked.
  if (payload.gen !== user.sessionEpoch) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** For pages that exist only for signed-in people. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  // redirect() throws, so nothing after it runs and the return type holds.
  if (!user) redirect("/login");
  return user;
}

/** For the owner dashboard. A customer who lands here goes to their own page. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/account");
  return user;
}
