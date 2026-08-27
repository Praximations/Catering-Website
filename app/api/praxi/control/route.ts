import type { NextRequest } from "next/server";
import { handleControlRequest } from "@/lib/control";
import { verifyControlKey } from "@/lib/controlKeys";

/**
 * THE DOOR PRAXI ACTS THROUGH.
 *
 *   POST /api/praxi/control
 *   Authorization: Bearer ck_live_...
 *   { "capability": "orders.update_status",
 *     "args": { "reference": "1001", "status": "confirmed" },
 *     "reason": "the customer confirmed by email",
 *     "idempotency_key": "..." }
 *
 * One endpoint rather than a REST surface per feature, because the
 * capability registry is already the list of what may be done: a new
 * capability becomes callable by being declared, and this file never
 * changes. It also means there is exactly ONE place where an outside
 * system can reach this site's data, which is the place to look when
 * asking what Praxi is able to touch.
 *
 * Everything about whether the call is allowed lives in lib/control.ts.
 * This handler only authenticates, parses, and translates the outcome
 * into a status code.
 */

/** A key may make this many calls a minute. Generous for an assistant,
 *  and low enough that a runaway loop cannot rewrite the catalog. */
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function withinRateLimit(keyId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(keyId) ?? []).filter((at) => at > now - WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  hits.set(keyId, recent);
  return true;
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = token ? await verifyControlKey(token) : null;

  // Fail closed, and say nothing about whether the key merely lacks
  // permission: an unauthenticated caller learns only that it is not in.
  if (!key) return json({ error: "unauthorized" }, 401);

  if (!withinRateLimit(key.id)) {
    return json({ error: "rate_limited", retry_after_seconds: 60 }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body", detail: "Send JSON." }, 400);
  }

  const payload = (body ?? {}) as {
    capability?: unknown;
    args?: unknown;
    reason?: unknown;
    idempotency_key?: unknown;
  };

  const capability = typeof payload.capability === "string" ? payload.capability : "";
  if (!capability) {
    return json({ error: "invalid_body", detail: "capability is required." }, 400);
  }

  const args =
    payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)
      ? (payload.args as Record<string, unknown>)
      : {};

  const outcome = await handleControlRequest(
    {
      capability,
      args,
      ...(typeof payload.reason === "string" ? { reason: payload.reason } : {}),
      ...(typeof payload.idempotency_key === "string"
        ? { idempotencyKey: payload.idempotency_key }
        : {}),
    },
    `${key.label} (${key.tokenPrefix})`
  );

  switch (outcome.status) {
    case "ok":
      return json(
        { status: "ok", detail: outcome.detail, ...(outcome.data === undefined ? {} : { data: outcome.data }) },
        200
      );
    case "queued":
      // 202: accepted, not done. Praxi must not report to anyone that the
      // thing happened, because it has not.
      return json(
        { status: "pending_approval", detail: outcome.detail, approval_id: outcome.approvalId },
        202
      );
    case "denied":
      return json(
        { status: "denied", reason: outcome.reason, detail: outcome.detail },
        outcome.reason === "invalid_args" ? 400 : 403
      );
    case "failed":
      return json({ status: "failed", detail: outcome.detail }, 422);
  }
}
