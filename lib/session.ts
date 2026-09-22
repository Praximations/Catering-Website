import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "./db/types";
import { signSession, verifySession, type SessionPayload } from "./session-token";
import { findUserById } from "./users";

/**
 * Sessions: a signed cookie, no session table, no dependencies.
 *
 * The cookie's FORMAT lives in lib/session-token.ts, which imports nothing but
 * the Node standard library so it can be tested on its own. This file is the
 * part that touches a request.
 *
 * THE EPOCH IS THE REVOCATION. A signed cookie cannot be recalled once it has
 * been issued: deleting it only removes the copy in that one browser, so a
 * cookie copied off a shared machine stayed valid for the full fourteen days
 * no matter what the account did afterwards. Every request now compares the
 * epoch in the cookie against the account's current one, and bumping the
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

/** Re-exported so callers have one import for sessions. */
export { signSession, verifySession };
export type { SessionPayload };

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
