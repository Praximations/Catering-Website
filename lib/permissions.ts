import { newId, readData, updateData, type AuditRecord, type PermissionMode } from "./store";
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
 * The stored map holds only DEVIATIONS from those defaults, so adding a
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
  const data = await readData();
  return CAPABILITIES.map((capability) => {
    const stored = data.permissions[capability.id];
    return {
      capability,
      mode: stored ?? capability.defaultMode,
      customised: stored !== undefined && stored !== capability.defaultMode,
    };
  });
}

export async function getMode(capabilityId: string): Promise<PermissionMode> {
  const capability = findCapability(capabilityId);
  if (!capability) return "off";
  const data = await readData();
  return data.permissions[capabilityId] ?? capability.defaultMode;
}

export async function setMode(capabilityId: string, mode: PermissionMode): Promise<boolean> {
  if (!findCapability(capabilityId)) return false;
  if (!PERMISSION_MODES.includes(mode)) return false;

  await updateData((data) => {
    data.permissions[capabilityId] = mode;
  });
  return true;
}

/** Put everything back to the shipped defaults in one move. */
export async function resetPermissions(): Promise<void> {
  await updateData((data) => {
    data.permissions = {};
  });
}

/* --------------------------------- audit ---------------------------------- */

/** Bounded, because this file is the database and a log grows forever. */
const AUDIT_LIMIT = 500;

/**
 * Record an attempt. EVERY path through the control endpoint calls this,
 * including refusals: a permission system whose denials are invisible
 * cannot be reviewed, and "what did it try to do" is exactly the question
 * an owner asks first.
 */
export async function recordAttempt(entry: {
  capability: string;
  actor: string;
  decision: AuditRecord["decision"];
  detail: string;
  idempotencyKey?: string | null;
}): Promise<void> {
  await updateData((data) => {
    data.auditLog.unshift({
      id: newId(),
      at: new Date().toISOString(),
      capability: entry.capability,
      actor: entry.actor,
      decision: entry.decision,
      detail: entry.detail.slice(0, 400),
      idempotencyKey: entry.idempotencyKey ?? null,
    });
    if (data.auditLog.length > AUDIT_LIMIT) {
      data.auditLog.length = AUDIT_LIMIT;
    }
  });
}

export async function listAudit(limit = 50): Promise<AuditRecord[]> {
  const data = await readData();
  return data.auditLog.slice(0, limit);
}

/**
 * Has this exact call already been handled? Praxi retries, and a retried
 * "cancel the order" must not cancel it twice.
 */
export async function findByIdempotencyKey(key: string): Promise<AuditRecord | null> {
  if (!key) return null;
  const data = await readData();
  return (
    data.auditLog.find(
      (entry) =>
        entry.idempotencyKey === key &&
        (entry.decision === "executed" || entry.decision === "queued")
    ) ?? null
  );
}
