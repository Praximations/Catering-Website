import { createHmac } from "node:crypto";
import { db } from "./db";

/**
 * Rate limiting that survives more than one server.
 *
 * WHY THIS IS STORED RATHER THAN IN MEMORY. The previous version kept a Map
 * of timestamps in the module scope. On one long-lived process that works.
 * On a serverless host it does not work at all: each instance gets its own
 * Map, so the effective limit is the configured one multiplied by however
 * many instances happen to be warm, and an attacker gets a fresh allowance
 * with every cold start. A counter nobody shares is not a limit.
 *
 * The shape is one row per attempt, counted inside a window. It costs a
 * round trip on the paths that use it, which is the right trade on sign in
 * and checkout and nowhere else.
 *
 * FAIL OPEN, DELIBERATELY. If the database is unreachable the limiter allows
 * the request. The alternative is that a storage blip locks every customer
 * out of signing in, and this protects against guessing at scale, not
 * against a determined single request. It is logged when it happens.
 */

export interface RateLimit {
  /** How many attempts are allowed in the window. */
  readonly max: number;
  readonly windowSeconds: number;
}

/** Password guessing is the thing this is really for. */
export const LOGIN_LIMIT: RateLimit = { max: 10, windowSeconds: 15 * 60 };
/** Account creation, which is also mass-signup spam. */
export const SIGNUP_LIMIT: RateLimit = { max: 5, windowSeconds: 60 * 60 };
/** Public forms. Generous, because a real person may resubmit. */
export const PUBLIC_FORM_LIMIT: RateLimit = { max: 15, windowSeconds: 60 * 60 };
/** Checkout, which writes an order every time it succeeds. */
export const CHECKOUT_LIMIT: RateLimit = { max: 20, windowSeconds: 60 * 60 };
/**
 * Praxi's control endpoint. Generous for an assistant, low enough that a
 * runaway loop cannot rewrite the catalog.
 */
export const PRAXI_CONTROL_LIMIT: RateLimit = { max: 60, windowSeconds: 60 };

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * A bucket name with any identifying part hashed.
 *
 * An email address or an IP in a bucket name is personal data sitting in a
 * table whose only job is counting, and it would be readable by anything
 * that can read the table. The HMAC keeps the bucket stable and unique
 * without storing who it is about.
 */
export function bucketFor(action: string, identifier: string): string {
  const secret = process.env.SESSION_SECRET ?? "development-rate-limit-salt";
  const digest = createHmac("sha256", secret)
    .update(`${action}:${identifier.toLowerCase()}`)
    .digest("base64url")
    .slice(0, 22);
  return `${action}:${digest}`;
}

/**
 * Count recent attempts, record this one, and say whether it may proceed.
 *
 * Counting BEFORE inserting means the nth attempt is allowed and the
 * (n+1)th is not, which is what `max` reads as. Two callers racing at the
 * boundary can both be allowed; that is an acceptable off-by-one for a
 * limiter whose job is to stop thousands of attempts, not exactly one.
 */
export async function checkRateLimit(
  bucket: string,
  limit: RateLimit
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();

  try {
    const recent = await db.rateLimitHits.count({ all: { bucket, at: { gte: since } } });

    if (recent >= limit.max) {
      return { allowed: false, remaining: 0, retryAfterSeconds: limit.windowSeconds };
    }

    await db.rateLimitHits.insert({ bucket, at: new Date().toISOString() });

    // Opportunistic pruning, roughly one request in fifty, so the table does
    // not need a scheduled job to stay small. See also prune_expired() in
    // supabase/schema.sql.
    if (Math.random() < 0.02) await pruneOldHits();

    return {
      allowed: true,
      remaining: Math.max(0, limit.max - recent - 1),
      retryAfterSeconds: 0,
    };
  } catch (error) {
    console.error("[rate-limit] storage unreachable, allowing the request:", error);
    return { allowed: true, remaining: limit.max, retryAfterSeconds: 0 };
  }
}

/** Forget attempts nobody will count again. */
export async function pruneOldHits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    await db.rateLimitHits.remove({ all: { at: { lt: cutoff } } });
  } catch {
    // Housekeeping. Never worth failing the request it happened during.
  }
}

/**
 * Clear a bucket, so a SUCCESSFUL sign in does not leave the failures that
 * preceded it counting against the next one.
 */
export async function clearRateLimit(bucket: string): Promise<void> {
  try {
    await db.rateLimitHits.remove({ all: { bucket } });
  } catch {
    // Same reasoning: this is a courtesy, not a control.
  }
}
