import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Storage, deliberately the simplest thing that is not a lie.
 *
 * This site has no database and no hosting yet, so data lives in ONE JSON
 * file on disk. That is enough to run the whole thing locally and to see
 * real enquiries come through, and it is honest about what it is: there is
 * no migration story, no concurrent-writer story beyond the queue below,
 * and no story at all on a read-only filesystem.
 *
 * WHEN THIS SITE IS DEPLOYED, THIS FILE IS WHAT GETS REPLACED. Serverless
 * hosts (Vercel included) have a read-only filesystem and no shared disk
 * between instances, so writes here would either fail or vanish. Swapping
 * in Postgres, SQLite, or Supabase means rewriting this module and nothing
 * above it: everything else goes through readData/updateData.
 */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  /** Opaque, salted, hashed. See lib/passwords.ts. Never leaves this layer. */
  passwordHash: string;
  role: "owner" | "customer";
  createdAt: string;
}

export type EnquiryStatus = "new" | "contacted" | "confirmed" | "declined";

export interface EnquiryRecord {
  id: string;
  /** Set when the person was logged in, so it shows on their account page. */
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  /** ISO date (YYYY-MM-DD). The day of the event, not the day they asked. */
  eventDate: string;
  guests: number;
  /** A menu package slug, or "unsure". */
  packageSlug: string;
  /** Dietary needs, venue, anything else. Free text, may be empty. */
  notes: string;
  status: EnquiryStatus;
  /** Private to the owner. Never rendered on a customer-facing page. */
  ownerNotes: string;
  createdAt: string;
  updatedAt: string;
}

/** A line as it was at the moment of ordering. */
export interface OrderLine {
  slug: string;
  /** Snapshotted, so changing the catalog never rewrites an old order. */
  name: string;
  unit: "person" | "item";
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export interface OrderRecord {
  id: string;
  /** Short, human facing, what the customer quotes on the phone. */
  reference: string;
  /**
   * Unguessable, and the ONLY way to reach an order without an account.
   * The confirmation page is addressed by this rather than by id, so a
   * guest can see their own order and cannot walk the list by changing a
   * number in the URL.
   */
  token: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  /** Total people expected, which is not the same as any line quantity. */
  guests: number;
  address: string;
  notes: string;
  lines: OrderLine[];
  subtotalMinor: number;
  status: OrderStatus;
  /** Private to the owner, same rule as enquiries. */
  ownerNotes: string;
  createdAt: string;
  updatedAt: string;
}

/* ======================= what Praxi is allowed to do ====================== */

/**
 * off = Praxi may not do this at all, and is told so.
 * ask = Praxi may request it; it waits for the owner to approve.
 * on  = Praxi may do it on its own, and it is still logged.
 */
export type PermissionMode = "off" | "ask" | "on";

/** A credential Praxi presents to act on this site. Stored hashed. */
export interface ControlKeyRecord {
  id: string;
  label: string;
  tokenHash: string;
  /** First few characters, so a dashboard can name a key it cannot read. */
  tokenPrefix: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

/** Praxi asked to do something whose permission is set to "ask". */
export interface ApprovalRecord {
  id: string;
  capability: string;
  args: Record<string, unknown>;
  /** Praxi's own words about why, shown to the owner before they decide. */
  reason: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  /** Filled in once an approved action has actually run. */
  result: string | null;
  error: string | null;
}

/** Every attempt, allowed or not. The owner's record of what Praxi did. */
export interface AuditRecord {
  id: string;
  at: string;
  capability: string;
  actor: string;
  decision: "allowed" | "denied" | "queued" | "executed" | "failed";
  detail: string;
  idempotencyKey: string | null;
}

/**
 * Praxi's changes to the catalog, kept SEPARATE from lib/shop.ts.
 *
 * The file stays the source of truth for what exists; this is a thin
 * override layer on top. That means a price Praxi set is always visible as
 * a deviation, can be cleared in one move, and can never delete a product
 * or invent one.
 */
export interface ProductOverride {
  priceMinor?: number;
  available?: boolean;
  updatedAt: string;
  updatedBy: string;
}

/** A notice across the top of the site. */
export interface AnnouncementRecord {
  message: string;
  setBy: string;
  setAt: string;
}

interface Data {
  users: UserRecord[];
  enquiries: EnquiryRecord[];
  orders: OrderRecord[];
  controlKeys: ControlKeyRecord[];
  /** Capability id to mode. Absent means "use the declared default". */
  permissions: Record<string, PermissionMode>;
  approvals: ApprovalRecord[];
  auditLog: AuditRecord[];
  productOverrides: Record<string, ProductOverride>;
  announcement: AnnouncementRecord | null;
}

const EMPTY: Data = {
  users: [],
  enquiries: [],
  orders: [],
  controlKeys: [],
  permissions: {},
  approvals: [],
  auditLog: [],
  productOverrides: {},
  announcement: null,
};

/** Overridable so a future deployment can point somewhere writable. */
const FILE = process.env.DATA_FILE
  ? join(process.cwd(), process.env.DATA_FILE)
  : join(process.cwd(), "data", "catering.json");

async function load(): Promise<Data> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Data>;
    // Each collection defaults independently, so a file written before a
    // collection existed still loads instead of blowing up on undefined.
    const record = <T>(value: unknown): Record<string, T> =>
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, T>)
        : {};
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      controlKeys: Array.isArray(parsed.controlKeys) ? parsed.controlKeys : [],
      permissions: record<PermissionMode>(parsed.permissions),
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
      productOverrides: record<ProductOverride>(parsed.productOverrides),
      announcement: (parsed.announcement as AnnouncementRecord | null) ?? null,
    };
  } catch {
    // No file yet (first run), or a file we cannot parse. Either way an
    // empty database is the right answer; the first write creates it.
    return { ...EMPTY };
  }
}

/**
 * Write through a temporary file and rename. A rename is atomic on every
 * filesystem we care about, so a crash mid-write leaves the old file
 * intact rather than a truncated one.
 */
async function save(data: Data): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  const temp = `${FILE}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temp, FILE);
}

/**
 * All writes queue behind each other. Read-modify-write on a shared file
 * is a lost-update race otherwise: two enquiries submitted in the same
 * moment, one silently overwriting the other.
 *
 * This only serializes writers INSIDE ONE PROCESS. Two dev servers on the
 * same file would still race. That is acceptable for a local, single
 * process site and is another reason this module is temporary.
 */
let queue: Promise<unknown> = Promise.resolve();

export function readData(): Promise<Data> {
  return load();
}

export function updateData<T>(mutate: (data: Data) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await load();
    const result = await mutate(data);
    await save(data);
    return result;
  });
  // Keep the chain alive even when a caller's mutation throws, otherwise
  // one failed write would block every write after it.
  queue = run.catch(() => undefined);
  return run;
}

export const newId = randomUUID;
