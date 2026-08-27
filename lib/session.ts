import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readData, type UserRecord } from "./store";

/**
 * Sessions: a signed cookie, no session table, no dependencies.
 *
 * The cookie is <payload>.<signature>, where payload is base64url JSON
 * holding only a user id and an expiry, and the signature is an HMAC over
 * it. Nothing secret rides in the cookie, and nothing in it can be edited
 * without the key, so a tampered cookie is rejected rather than believed.
 *
 * Next's own auth guide reaches for `jose` and a JWT here. An HMAC over a
 * tiny payload is the same idea with one algorithm instead of a library,
 * and this project deliberately has no dependencies.
 */

const COOKIE = "catering_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "customer";
}

/* --------------------------------- the key -------------------------------- */

const SECRET_FILE = process.env.DATA_FILE
  ? join(dirname(join(process.cwd(), process.env.DATA_FILE)), ".session-secret")
  : join(process.cwd(), "data", ".session-secret");

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
    if (fromEnv && fromEnv.length >= 16) return Buffer.from(fromEnv, "utf8");

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be set in production. Generate one with: openssl rand -base64 32"
      );
    }

    try {
      const existing = (await readFile(SECRET_FILE, "utf8")).trim();
      if (existing.length >= 16) return Buffer.from(existing, "utf8");
    } catch {
      // First run in this checkout; fall through and make one.
    }
    const generated = randomBytes(32).toString("base64url");
    await mkdir(dirname(SECRET_FILE), { recursive: true });
    await writeFile(SECRET_FILE, `${generated}\n`, "utf8");
    return Buffer.from(generated, "utf8");
  })();
  return secretPromise;
}

/* ------------------------------- sign / verify ----------------------------- */

interface Payload {
  uid: string;
  exp: number;
}

async function sign(payload: Payload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const secret = await getSecret();
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

async function unsign(token: string): Promise<Payload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const secret = await getSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
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
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  const token = await sign({ uid: userId, exp: Math.floor(expiresAt.getTime() / 1000) });
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
 * cookie, so a deleted account or a changed role takes effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const payload = await unsign(token);
  if (!payload) return null;

  const data = await readData();
  const user = data.users.find((u: UserRecord) => u.id === payload.uid);
  if (!user) return null;

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
