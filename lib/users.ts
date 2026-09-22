import { hashPassword, verifyPassword } from "./passwords";
import { newId, readData, updateData, type UserRecord } from "./store";

/**
 * Accounts. Two roles and nothing else: the owner, who sees every enquiry,
 * and a customer, who sees only their own.
 *
 * WHO BECOMES THE OWNER: whoever OWNER_EMAIL names, and otherwise the
 * first account created in an empty database. That rule is written down in
 * the README and shown on the sign up page, because a silent privilege
 * grant that nobody can see is how a demo becomes a security problem.
 */

export type PublicUser = Pick<UserRecord, "id" | "email" | "name" | "role" | "createdAt">;

/** Never let a password hash escape this module. */
function toPublic(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  const data = await readData();
  const user = data.users.find((u) => u.email === normalizeEmail(email));
  return user ? toPublic(user) : null;
}

export async function countUsers(): Promise<number> {
  return (await readData()).users.length;
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
  // Hashing is the slow part; do it before taking the write queue rather
  // than holding every other writer up for it.
  const passwordHash = await hashPassword(input.password);
  const ownerEmail = process.env.OWNER_EMAIL ? normalizeEmail(process.env.OWNER_EMAIL) : null;

  return updateData<CreateUserResult>((data) => {
    // Re-check inside the queue: two signups with the same address can
    // both pass a check made before this point.
    if (data.users.some((u) => u.email === email)) {
      return { ok: false, reason: "email_taken" };
    }

    const isOwner = ownerEmail ? email === ownerEmail : data.users.length === 0;
    const user: UserRecord = {
      id: newId(),
      email,
      name: input.name.trim(),
      passwordHash,
      authProvider: "password",
      role: isOwner ? "owner" : "customer",
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    return { ok: true, user: toPublic(user) };
  });
}

/**
 * Check an email and password. Returns null for both "no such account" and
 * "wrong password" on purpose: telling them apart tells an attacker which
 * addresses are registered.
 */
export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  const data = await readData();
  const user = data.users.find((u) => u.email === normalizeEmail(email));
  if (!user) {
    // Hash anyway so a missing account does not answer faster than a wrong
    // password, which would leak which addresses exist.
    await hashPassword(password);
    return null;
  }
  if (!user.passwordHash) {
    await hashPassword(password);
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? toPublic(user) : null;
}

export async function findOrCreateGoogleUser(input: {
  email: string;
  name: string;
}): Promise<{ user: PublicUser; created: boolean }> {
  const email = normalizeEmail(input.email);
  const ownerEmail = process.env.OWNER_EMAIL ? normalizeEmail(process.env.OWNER_EMAIL) : null;

  return updateData((data) => {
    const existing = data.users.find((user) => user.email === email);
    if (existing) return { user: toPublic(existing), created: false };

    const user: UserRecord = {
      id: newId(),
      email,
      name: input.name.trim() || email.split("@")[0],
      passwordHash: null,
      authProvider: "google",
      role: ownerEmail
        ? email === ownerEmail
          ? "owner"
          : "customer"
        : data.users.length === 0
          ? "owner"
          : "customer",
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    return { user: toPublic(user), created: true };
  });
}

/** Whether an owner exists at all, so the UI can say so honestly. */
export async function hasOwner(): Promise<boolean> {
  return (await readData()).users.some((u) => u.role === "owner");
}
