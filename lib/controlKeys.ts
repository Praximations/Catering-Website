import { createHash, randomBytes } from "node:crypto";
import { newId, readData, updateData, type ControlKeyRecord } from "./store";

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
  const record: ControlKeyRecord = {
    id: newId(),
    label: label.trim().slice(0, 80) || "Praxi",
    tokenHash: hash(token),
    tokenPrefix: token.slice(0, PREFIX_CHARS),
    status: "active",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };

  await updateData((data) => {
    data.controlKeys.push(record);
  });
  return { token, key: toSummary(record) };
}

export async function listControlKeys(): Promise<ControlKeySummary[]> {
  const data = await readData();
  return [...data.controlKeys]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSummary);
}

export async function revokeControlKey(id: string): Promise<boolean> {
  return updateData((data) => {
    const key = data.controlKeys.find((k) => k.id === id && k.status === "active");
    if (!key) return false;
    key.status = "revoked";
    key.revokedAt = new Date().toISOString();
    return true;
  });
}

/**
 * A presented token to the key it belongs to, or null.
 *
 * Revocation takes effect immediately because this reads the record every
 * time: there is no cached acceptance to wait out.
 */
export async function verifyControlKey(token: string): Promise<ControlKeySummary | null> {
  if (!/^ck_live_[A-Za-z0-9_-]{20,}$/.test(token)) return null;

  const digest = hash(token);
  const data = await readData();
  const key = data.controlKeys.find((k) => k.tokenHash === digest);
  if (!key || key.status !== "active") return null;

  // Bookkeeping only, and never allowed to fail the request it describes.
  updateData((fresh) => {
    const row = fresh.controlKeys.find((k) => k.id === key.id);
    if (row) row.lastUsedAt = new Date().toISOString();
  }).catch((error) => console.warn("[control] lastUsedAt not recorded:", error.message));

  return toSummary(key);
}
