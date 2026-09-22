import { randomUUID } from "node:crypto";
import { findCapability, type CapabilityResult } from "./capabilities";
import { db } from "./db";
import type { ApprovalRecord } from "./db/types";
import {
  claimIdempotencyKey,
  getMode,
  recordAttempt,
  recordIdempotentOutcome,
  releaseIdempotencyKey,
} from "./permissions";

/**
 * THE GATE. Every request from Praxi passes through here, and nothing
 * reaches a capability's run() any other way.
 *
 * The order of checks is the security model, so it is worth stating:
 *
 *   1. Does the capability exist at all? An unknown name is refused
 *      before anything else looks at it.
 *   2. Are the arguments valid? A malformed request fails now rather than
 *      sitting in an approval queue until somebody approves nonsense.
 *   3. Have we already done this exact call? Praxi retries, and a retried
 *      "cancel the order" must not cancel it twice.
 *   4. What has the owner allowed? off refuses, ask queues, on proceeds.
 *   5. Whatever happened, write it down.
 *
 * Note that step 4 comes AFTER validation but BEFORE execution, and that
 * the refusal path is logged just as loudly as the success path. A
 * permission system whose denials are invisible cannot be reviewed.
 */

export type ControlOutcome =
  | { status: "ok"; detail: string; data?: unknown }
  | { status: "queued"; detail: string; approvalId: string }
  | {
      status: "denied";
      detail: string;
      reason: "not_permitted" | "unknown_capability" | "invalid_args";
    }
  | { status: "failed"; detail: string };

export interface ControlRequest {
  capability: string;
  args: Record<string, unknown>;
  /** Praxi's stated reason, shown to the owner when approval is needed. */
  reason?: string;
  idempotencyKey?: string;
}

/** Who is asking, as both a display name and the key row behind it. */
export interface Actor {
  /** The control key's id, which is what an idempotency key is scoped to. */
  keyId: string;
  /** Human readable, for the audit log and the approval queue. */
  label: string;
}

export async function handleControlRequest(
  request: ControlRequest,
  actor: Actor
): Promise<ControlOutcome> {
  const capability = findCapability(request.capability);

  if (!capability) {
    await recordAttempt({
      capability: request.capability,
      actor: actor.label,
      decision: "denied",
      detail: "No such capability.",
      idempotencyKey: request.idempotencyKey,
    });
    return {
      status: "denied",
      reason: "unknown_capability",
      detail: `This site has no capability called "${request.capability}".`,
    };
  }

  const invalid = capability.validate(request.args);
  if (invalid) {
    await recordAttempt({
      capability: capability.id,
      actor: actor.label,
      decision: "denied",
      detail: `Invalid arguments: ${invalid}`,
      idempotencyKey: request.idempotencyKey,
    });
    return { status: "denied", reason: "invalid_args", detail: invalid };
  }

  // Claimed before the permission check, so a retry of a QUEUED request does
  // not queue a second approval for the owner to read.
  const key = request.idempotencyKey ?? "";
  if (key) {
    const claim = await claimIdempotencyKey(actor.keyId, key, capability.id);
    if (claim.replayed) {
      return {
        status: "ok",
        detail: claim.outcome
          ? `Already handled: ${claim.outcome}`
          : "Already handled: this request was received before.",
      };
    }
  }

  /** A failure before anything changed must not burn the retry. */
  const releaseOnFailure = async (): Promise<void> => {
    if (key) await releaseIdempotencyKey(actor.keyId, key);
  };

  const mode = await getMode(capability.id);

  if (mode === "off") {
    await recordAttempt({
      capability: capability.id,
      actor: actor.label,
      decision: "denied",
      detail: "Refused: the owner has this set to never.",
      idempotencyKey: key || null,
    });
    // A refusal is a final answer, not a transient one, but the key is
    // released so that turning the permission on and retrying works.
    await releaseOnFailure();
    return {
      status: "denied",
      reason: "not_permitted",
      detail: `"${capability.label}" is switched off for Praxi on this site.`,
    };
  }

  if (mode === "ask") {
    const approval = await queueApproval({
      capability: capability.id,
      args: request.args,
      reason: request.reason ?? "",
      requestedBy: actor.label,
    });
    await recordAttempt({
      capability: capability.id,
      actor: actor.label,
      decision: "queued",
      detail: "Waiting for the owner to approve.",
      idempotencyKey: key || null,
    });
    if (key) {
      await recordIdempotentOutcome(actor.keyId, key, "queued for the owner to approve");
    }
    return {
      status: "queued",
      approvalId: approval.id,
      detail: `"${capability.label}" needs the owner's approval. It is waiting in their dashboard.`,
    };
  }

  const outcome = await runCapability(capability.id, request.args, actor.label, key || undefined);

  if (key) {
    if (outcome.status === "ok") {
      await recordIdempotentOutcome(actor.keyId, key, outcome.detail);
    } else {
      // Nothing was accomplished, so a retry with the same key should be
      // allowed to try again rather than being told it already happened.
      await releaseOnFailure();
    }
  }
  return outcome;
}

/**
 * Execute, with the permission decision already made. Shared by the "on"
 * path above and by the owner approving a queued request, so an approved
 * action runs through exactly the same code as an allowed one.
 */
export async function runCapability(
  capabilityId: string,
  args: Record<string, unknown>,
  actor: string,
  idempotencyKey?: string
): Promise<ControlOutcome> {
  const capability = findCapability(capabilityId);
  if (!capability) return { status: "failed", detail: "That capability no longer exists." };

  let result: CapabilityResult;
  try {
    result = await capability.run(args, { actor });
  } catch (error) {
    const detail = (error as Error).message.slice(0, 300);
    await recordAttempt({
      capability: capabilityId,
      actor,
      decision: "failed",
      detail,
      idempotencyKey,
    });
    return { status: "failed", detail };
  }

  await recordAttempt({
    capability: capabilityId,
    actor,
    decision: result.ok ? "executed" : "failed",
    detail: result.detail,
    idempotencyKey,
  });

  if (!result.ok) return { status: "failed", detail: result.detail };
  return {
    status: "ok",
    detail: result.detail,
    ...(result.data === undefined ? {} : { data: result.data }),
  };
}

/* -------------------------------- approvals ------------------------------- */

async function queueApproval(input: {
  capability: string;
  args: Record<string, unknown>;
  reason: string;
  requestedBy: string;
}): Promise<ApprovalRecord> {
  return db.approvals.insert({
    id: randomUUID(),
    capability: input.capability,
    args: input.args,
    reason: input.reason.slice(0, 400),
    status: "pending",
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString(),
    decidedBy: null,
    decidedAt: null,
    result: null,
    error: null,
  });
}

export async function listApprovals(
  status?: ApprovalRecord["status"],
  limit = 50
): Promise<ApprovalRecord[]> {
  return db.approvals.find(status ? { all: { status } } : undefined, {
    orderBy: "requestedAt",
    direction: "desc",
    limit,
  });
}

export async function countPendingApprovals(): Promise<number> {
  return db.approvals.count({ all: { status: "pending" } });
}

/**
 * The owner says yes. The action runs NOW, under the owner's name, and
 * the outcome is written onto the approval so the dashboard can show what
 * actually happened rather than just that a button was pressed.
 */
export async function approveRequest(
  approvalId: string,
  decidedBy: string
): Promise<ControlOutcome> {
  // Claimed in one statement, with `status: "pending"` in the WHERE, so two
  // clicks on Approve cannot both get through and run the action twice.
  const [claimed] = await db.approvals.update(
    { all: { id: approvalId, status: "pending" } },
    { status: "approved", decidedBy, decidedAt: new Date().toISOString() }
  );

  if (!claimed) return { status: "failed", detail: "That request is no longer pending." };

  const outcome = await runCapability(
    claimed.capability,
    claimed.args,
    `${decidedBy} (approved for Praxi)`
  );

  await db.approvals.update(
    { all: { id: approvalId } },
    {
      result: outcome.status === "ok" ? outcome.detail : null,
      error: outcome.status === "ok" ? null : outcome.detail,
    }
  );

  return outcome;
}

export async function denyRequest(approvalId: string, decidedBy: string): Promise<boolean> {
  const [denied] = await db.approvals.update(
    { all: { id: approvalId, status: "pending" } },
    { status: "denied", decidedBy, decidedAt: new Date().toISOString() }
  );

  if (denied) {
    await recordAttempt({
      capability: "approval.denied",
      actor: decidedBy,
      decision: "denied",
      detail: "The owner denied a request from Praxi.",
    });
  }
  return Boolean(denied);
}
