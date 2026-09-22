import { db } from "./db";
import type { Role, UserRecord } from "./db/types";
import { hashPassword, verifyPassword } from "./passwords";

/**
 * Accounts. Two roles and nothing else: the owner, who sees every enquiry,
 * and a customer, who sees only their own.
 *
 * WHO BECOMES THE OWNER: whoever OWNER_EMAIL names, and otherwise the
 * first account created in an empty database. That rule is written down in
 * the README and shown on the sign up page, because a silent privilege
 * grant that nobody can see is how a demo becomes a security problem.
 */

export type PublicUser = Pick<
  UserRecord,
  "id" | "email" | "name" | "role" | "authProvider" | "createdAt"
>;

/** Never let a password hash escape this module. */
function toPublic(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function ownerEmail(): string | null {
  return process.env.OWNER_EMAIL ? normalizeEmail(process.env.OWNER_EMAIL) : null;
}

/**
 * Whether this address should be the owner.
 *
 * With OWNER_EMAIL set, exactly that address and nothing else. Without it,
 * the first account in an empty database, which is what makes a fresh
 * checkout usable without configuration.
 */
async function roleFor(email: string): Promise<Role> {
  const named = ownerEmail();
  if (named) return email === named ? "owner" : "customer";
  return (await db.users.count()) === 0 ? "owner" : "customer";
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  return db.users.findOne({ all: { id } });
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  const user = await db.users.findOne({ all: { email: normalizeEmail(email) } });
  return user ? toPublic(user) : null;
}

export async function countUsers(): Promise<number> {
  return db.users.count();
}

export type CreateUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "email_taken" };

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CreateUserResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const role = await roleFor(email);

  // insertIfAbsent, not "look then write". Two signups with the same address
  // in the same moment both pass a prior check; only one can win the unique
  // index on users.email, and the loser is told the address is taken.
  const created = await db.users.insertIfAbsent({
    id: crypto.randomUUID(),
    email,
    name: input.name.trim(),
    passwordHash,
    authProvider: "password",
    role,
    sessionEpoch: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!created) return { ok: false, reason: "email_taken" };
  return { ok: true, user: toPublic(created) };
}

/**
 * Check an email and password. Returns null for both "no such account" and
 * "wrong password" on purpose: telling them apart tells an attacker which
 * addresses are registered.
 */
export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  const user = await db.users.findOne({ all: { email: normalizeEmail(email) } });

  if (!user?.passwordHash) {
    // Hash anyway, so a missing account does not answer faster than a wrong
    // password. Without this the response time alone tells an attacker which
    // addresses exist, and an account that only uses Google is just as
    // distinguishable as one that does not exist.
    await hashPassword(password);
    return null;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? toPublic(user) : null;
}

/**
 * The account behind a verified Google identity, created if new.
 *
 * The CALLER is responsible for having verified the address with the
 * provider first. See app/auth/callback: an unverified address here would
 * let anyone who can get a token for somebody else's address sign in as
 * them, including as the owner.
 */
export async function findOrCreateGoogleUser(input: {
  email: string;
  name: string;
}): Promise<{ user: PublicUser; created: boolean }> {
  const email = normalizeEmail(input.email);

  const existing = await db.users.findOne({ all: { email } });
  if (existing) return { user: toPublic(existing), created: false };

  const now = new Date().toISOString();
  const created = await db.users.insertIfAbsent({
    id: crypto.randomUUID(),
    email,
    name: input.name.trim() || email.split("@")[0]!,
    passwordHash: null,
    authProvider: "google",
    role: await roleFor(email),
    sessionEpoch: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Lost the race with a concurrent callback for the same address. The other
  // one created it, so read it back rather than reporting a failure.
  if (!created) {
    const now = await db.users.findOne({ all: { email } });
    if (!now) throw new Error("The account could not be created or found.");
    return { user: toPublic(now), created: false };
  }

  return { user: toPublic(created), created: true };
}

/**
 * Invalidate every session this account has open, by moving the epoch the
 * signed cookies were issued against. Used on sign out everywhere, and
 * anywhere a credential changes.
 */
export async function revokeSessions(userId: string): Promise<void> {
  const user = await db.users.findOne({ all: { id: userId } });
  if (!user) return;
  await db.users.update({ all: { id: userId } }, { sessionEpoch: user.sessionEpoch + 1 });
}

/** Whether an owner exists at all, so the UI can say so honestly. */
export async function hasOwner(): Promise<boolean> {
  return (await db.users.count({ all: { role: "owner" } })) > 0;
}

export async function listCustomerAccounts(): Promise<PublicUser[]> {
  const users = await db.users.find({ all: { role: "customer" } }, { orderBy: "createdAt" });
  return users.map(toPublic);
}
