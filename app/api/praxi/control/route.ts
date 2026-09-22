import type { NextRequest } from "next/server";
import { handleControlRequest } from "@/lib/control";
import { verifyControlKey } from "@/lib/controlKeys";
import { checkRateLimit, PRAXI_CONTROL_LIMIT } from "@/lib/rate-limit";

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

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extra },
  });

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const key = token ? await verifyControlKey(token) : null;

  // Fail closed, and say nothing about whether the key merely lacks
  // permission: an unauthenticated caller learns only that it is not in.
  if (!key) return json({ error: "unauthorized" }, 401);

  // Stored, not in-process: an in-memory counter gives every serverless
  // instance its own private allowance, which is no limit at all.
  const limit = await checkRateLimit(`praxi:${key.id}`, PRAXI_CONTROL_LIMIT);
  if (!limit.allowed) {
    return json(
      { error: "rate_limited", retry_after_seconds: limit.retryAfterSeconds },
      429,
      { "retry-after": String(limit.retryAfterSeconds) }
    );
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
    { keyId: key.id, label: `${key.label} (${key.tokenPrefix})` }
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
