import { db } from "./db";
import type { AuditRecord, PermissionMode } from "./db/types";
import { CAPABILITIES, findCapability, type Capability } from "./capabilities";

/**
 * THE PERMISSION LAYER: what Praxi is allowed to do to this site.
 *
 * Three settings per capability, and the middle one is the important one:
 *
 *   off  Praxi may not, and is told plainly that it may not.
 *   ask  Praxi may request it. Nothing happens until the owner approves.
 *   on   Praxi may do it on its own. It is still written to the audit log.
 *
 * Two principles shape the defaults in capabilities.ts:
 *
 *   Reading is not acting. Praxi already receives orders and enquiries as
 *   events, so letting it read them back changes nothing about its reach.
 *   Those default to "on".
 *
 *   Anything that changes what a customer sees or pays defaults to "off",
 *   and anything in between defaults to "ask". Nobody should discover
 *   after the fact that an assistant repriced their menu.
 *
 * The stored table holds only DEVIATIONS from those defaults, so adding a
 * capability later starts everyone at its declared default rather than
 * silently granting whatever an old row happened to say.
 */

export const PERMISSION_MODES: PermissionMode[] = ["off", "ask", "on"];

export const MODE_LABELS: Record<PermissionMode, string> = {
  off: "Never",
  ask: "Ask me first",
  on: "Allowed",
};

export const MODE_HELP: Record<PermissionMode, string> = {
  off: "Praxi cannot do this and is told so.",
  ask: "Praxi has to ask. Nothing happens until you approve it.",
  on: "Praxi can do this on its own. Every time is still logged.",
};

export interface CapabilityWithMode {
  capability: Capability;
  mode: PermissionMode;
  /** True when the owner has moved this away from its shipped default. */
  customised: boolean;
}

/** Every capability with its effective setting, in declaration order. */
export async function listPermissions(): Promise<CapabilityWithMode[]> {
  const rows = await db.capabilityPermissions.find();
  const stored = new Map(rows.map((row) => [row.capabilityId, row.mode]));

  return CAPABILITIES.map((capability) => {
    const mode = stored.get(capability.id);
    return {
      capability,
      mode: mode ?? capability.defaultMode,
      customised: mode !== undefined && mode !== capability.defaultMode,
    };
  });
}

export async function getMode(capabilityId: string): Promise<PermissionMode> {
  const capability = findCapability(capabilityId);
  // An unknown capability is refused rather than defaulted. Nothing outside
  // the registry is reachable, and that includes by permission lookup.
  if (!capability) return "off";

  const stored = await db.capabilityPermissions.findOne({ all: { capabilityId } });
  return stored?.mode ?? capability.defaultMode;
}

export async function setMode(
  capabilityId: string,
  mode: PermissionMode,
  by = ""
): Promise<boolean> {
  if (!findCapability(capabilityId)) return false;
  if (!PERMISSION_MODES.includes(mode)) return false;

  await db.capabilityPermissions.upsert({
    capabilityId,
    mode,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  });
  return true;
}

/** Put everything back to the shipped defaults in one move. */
export async function resetPermissions(): Promise<void> {
  // Deleting the deviations IS the reset, because a missing row means "use
  // the capability's own default".
  await db.capabilityPermissions.remove({ all: { mode: { in: PERMISSION_MODES } } });
}

/* --------------------------------- audit ---------------------------------- */

/**
 * Record an attempt. EVERY path through the control endpoint calls this,
 * including refusals: a permission system whose denials are invisible
 * cannot be reviewed, and "what did it try to do" is exactly the question
 * an owner asks first.
 *
 * NOT TRIMMED. The previous version kept the last 500 entries because the
 * log lived inside the single JSON document, which meant the security log
 * rolled over in under ten minutes at the endpoint's own rate limit. It has
 * its own table now, and pruning it is an explicit decision rather than a
 * side effect of writing to it.
 */
export async function recordAttempt(entry: {
  capability: string;
  actor: string;
  decision: AuditRecord["decision"];
  detail: string;
  idempotencyKey?: string | null;
}): Promise<void> {
  await db.auditLog.insert({
    at: new Date().toISOString(),
    capability: entry.capability,
    actor: entry.actor,
    decision: entry.decision,
    detail: entry.detail.slice(0, 400),
    idempotencyKey: entry.idempotencyKey ?? null,
  });
}

export async function listAudit(limit = 50, offset = 0): Promise<AuditRecord[]> {
  return db.auditLog.find(undefined, {
    orderBy: "at",
    direction: "desc",
    limit,
    offset,
  });
}

export async function countAudit(): Promise<number> {
  return db.auditLog.count();
}

/* ----------------------------- replay protection --------------------------- */

export interface ReplayCheck {
  /** True when this exact call has already been handled. */
  replayed: boolean;
  /** What happened the first time, when it was. */
  outcome?: string;
}

/**
 * Claim an idempotency key, or report that it is already taken.
 *
 * THE INSERT IS THE CHECK. Praxi retries, and a retried "cancel the order"
 * must not cancel it twice, so the claim has to be atomic: looking first and
 * then writing lets two concurrent retries both pass the look.
 *
 * SCOPED PER KEY. Keys are minted per integration, and one integration must
 * not be able to suppress another's write by guessing its idempotency key.
 *
 * The previous version searched the audit log for the key, which stopped
 * working the moment that log was trimmed to 500 rows: a retry arriving
 * after the original had scrolled off ran the action a second time.
 */
export async function claimIdempotencyKey(
  controlKeyId: string,
  key: string,
  capability: string
): Promise<ReplayCheck> {
  if (!key) return { replayed: false };

  const claimed = await db.idempotencyKeys.insertIfAbsent({
    controlKeyId,
    key,
    capability,
    outcome: "",
    createdAt: new Date().toISOString(),
  });
  if (claimed) return { replayed: false };

  const existing = await db.idempotencyKeys.findOne({ all: { controlKeyId, key } });
  return { replayed: true, outcome: existing?.outcome ?? "" };
}

/** Write down what the claimed call ended up doing. */
export async function recordIdempotentOutcome(
  controlKeyId: string,
  key: string,
  outcome: string
): Promise<void> {
  if (!key) return;
  await db.idempotencyKeys.update(
    { all: { controlKeyId, key } },
    { outcome: outcome.slice(0, 400) }
  );
}

/**
 * Release a claimed key so a genuine retry can try again.
 *
 * Used when the action failed BEFORE changing anything. Holding the key
 * after a failure would turn a transient error into a permanent refusal.
 */
export async function releaseIdempotencyKey(controlKeyId: string, key: string): Promise<void> {
  if (!key) return;
  await db.idempotencyKeys.remove({ all: { controlKeyId, key } });
}


