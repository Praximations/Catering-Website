import { findCapability, type CapabilityResult } from "./capabilities";
import {
  findByIdempotencyKey,
  getMode,
  recordAttempt,
} from "./permissions";
import { newId, readData, updateData, type ApprovalRecord } from "./store";

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
  | { status: "denied"; detail: string; reason: "not_permitted" | "unknown_capability" | "invalid_args" }
  | { status: "failed"; detail: string };

export interface ControlRequest {
  capability: string;
  args: Record<string, unknown>;
  /** Praxi's stated reason, shown to the owner when approval is needed. */
  reason?: string;
  idempotencyKey?: string;
}

export async function handleControlRequest(
  request: ControlRequest,
  actor: string
): Promise<ControlOutcome> {
  const capability = findCapability(request.capability);

  if (!capability) {
    await recordAttempt({
      capability: request.capability,
      actor,
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
      actor,
      decision: "denied",
      detail: `Invalid arguments: ${invalid}`,
      idempotencyKey: request.idempotencyKey,
    });
    return { status: "denied", reason: "invalid_args", detail: invalid };
  }

  if (request.idempotencyKey) {
    const already = await findByIdempotencyKey(request.idempotencyKey);
    if (already) {
      return {
        status: "ok",
        detail: `Already handled: ${already.detail}`,
      };
    }
  }

  const mode = await getMode(capability.id);

  if (mode === "off") {
    await recordAttempt({
      capability: capability.id,
      actor,
      decision: "denied",
      detail: "Refused: the owner has this set to never.",
      idempotencyKey: request.idempotencyKey,
    });
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
      requestedBy: actor,
    });
    await recordAttempt({
      capability: capability.id,
      actor,
      decision: "queued",
      detail: "Waiting for the owner to approve.",
      idempotencyKey: request.idempotencyKey,
    });
    return {
      status: "queued",
      approvalId: approval.id,
      detail: `"${capability.label}" needs the owner's approval. It is waiting in their dashboard.`,
    };
  }

  return runCapability(capability.id, request.args, actor, request.idempotencyKey);
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
  const approval: ApprovalRecord = {
    id: newId(),
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
  };
  await updateData((data) => {
    data.approvals.unshift(approval);
  });
  return approval;
}

export async function listApprovals(status?: ApprovalRecord["status"]): Promise<ApprovalRecord[]> {
  const data = await readData();
  const all = [...data.approvals].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  return status ? all.filter((approval) => approval.status === status) : all;
}

export async function countPendingApprovals(): Promise<number> {
  return (await readData()).approvals.filter((a) => a.status === "pending").length;
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
  const claimed = await updateData((data) => {
    const approval = data.approvals.find((a) => a.id === approvalId && a.status === "pending");
    if (!approval) return null;
    // Claimed inside the write queue, so two clicks on Approve cannot
    // both get through and run the action twice.
    approval.status = "approved";
    approval.decidedBy = decidedBy;
    approval.decidedAt = new Date().toISOString();
    return { capability: approval.capability, args: approval.args };
  });

  if (!claimed) return { status: "failed", detail: "That request is no longer pending." };

  const outcome = await runCapability(
    claimed.capability,
    claimed.args,
    `${decidedBy} (approved for Praxi)`
  );

  await updateData((data) => {
    const approval = data.approvals.find((a) => a.id === approvalId);
    if (!approval) return;
    approval.result = outcome.status === "ok" ? outcome.detail : null;
    approval.error = outcome.status === "ok" ? null : outcome.detail;
  });

  return outcome;
}

export async function denyRequest(approvalId: string, decidedBy: string): Promise<boolean> {
  const denied = await updateData((data) => {
    const approval = data.approvals.find((a) => a.id === approvalId && a.status === "pending");
    if (!approval) return false;
    approval.status = "denied";
    approval.decidedBy = decidedBy;
    approval.decidedAt = new Date().toISOString();
    return true;
  });

  if (denied) {
    await recordAttempt({
      capability: "approval.denied",
      actor: decidedBy,
      decision: "denied",
      detail: "The owner denied a request from Praxi.",
    });
  }
  return denied;
}
