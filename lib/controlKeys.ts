import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import type { ControlKeyRecord } from "./db/types";

/**
 * CONTROL KEYS: the credential Praxi presents to ACT on this site.
 *
 * Deliberately a different credential from PRAXI_SECRET_KEY, which points
 * the other way (this site talking to Praxi). Two directions, two keys, so
 * revoking Praxi's ability to change anything here does not also stop this
 * site reporting to it, and neither key can be used for the other job.
 *
 * Stored as a sha256 hash. The token is shown once, at mint, and never
 * again; a lost key is revoked and replaced, never recovered. Verification
 * is a lookup by hash, so there is no string comparison to time.
 */

const PREFIX_CHARS = 14;

export interface ControlKeySummary {
  id: string;
  label: string;
  tokenPrefix: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
}

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toSummary(key: ControlKeyRecord): ControlKeySummary {
  return {
    id: key.id,
    label: key.label,
    tokenPrefix: key.tokenPrefix,
    status: key.status,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
  };
}

export async function mintControlKey(
  label: string
): Promise<{ token: string; key: ControlKeySummary }> {
  const token = `ck_live_${randomBytes(32).toString("base64url")}`;
  const record = await db.controlKeys.insert({
    id: randomUUID(),
    label: label.trim().slice(0, 80) || "Praxi",
    tokenHash: hash(token),
    tokenPrefix: token.slice(0, PREFIX_CHARS),
    status: "active",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  });
  return { token, key: toSummary(record) };
}

export async function listControlKeys(): Promise<ControlKeySummary[]> {
  const keys = await db.controlKeys.find(undefined, {
    orderBy: "createdAt",
    direction: "desc",
  });
  return keys.map(toSummary);
}

export async function revokeControlKey(id: string): Promise<boolean> {
  // The status check is in the WHERE, so revoking twice reports honestly
  // that the second attempt changed nothing.
  const updated = await db.controlKeys.update(
    { all: { id, status: "active" } },
    { status: "revoked", revokedAt: new Date().toISOString() }
  );
  return updated.length === 1;
}

/**
 * A presented token to the key it belongs to, or null.
 *
 * Looked up by hash, so there is no secret to compare in non-constant time,
 * and read fresh every call, so a revocation takes effect immediately
 * rather than after some cached acceptance expires.
 */
export async function verifyControlKey(token: string): Promise<ControlKeySummary | null> {
  if (!/^ck_live_[A-Za-z0-9_-]{20,}$/.test(token)) return null;

  const key = await db.controlKeys.findOne({ all: { tokenHash: hash(token) } });
  if (!key || key.status !== "active") return null;

  /**
   * AWAITED. This used to be a floating promise on the grounds that
   * bookkeeping must not fail the request, but it is a network call now, and a
   * serverless host can freeze the function the moment the response is sent,
   * so the write was simply lost. "When was this key last used" is the one
   * signal telling an owner whether a key is live before they revoke it.
   *
   * Still swallows its own failure, which was the actual intent.
   */
  await db.controlKeys
    .update({ all: { id: key.id } }, { lastUsedAt: new Date().toISOString() })
    .catch((error: unknown) => {
      console.warn("[control] lastUsedAt not recorded:", (error as Error).message);
    });

  return toSummary(key);
}
