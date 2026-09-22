import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createSupabaseState,
  isSupabaseConfigured,
  isSupabasePartiallyConfigured,
  readSupabaseState,
  replaceSupabaseState,
} from "./supabase";

/**
 * One storage contract with two adapters.
 *
 * Local development uses a JSON file with no setup. Vercel uses a private
 * Supabase row when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
 * Optimistic version checks prevent two serverless writers from silently
 * replacing one another.
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

export type ContactStatus = "new" | "read" | "replied";

export interface ContactRecord {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

/** A line as it was at the moment of ordering. */
export interface OrderLine {
  slug: string;
  /** Snapshotted, so changing the catalog never rewrites an old order. */
  name: string;
  unit: "person" | "item" | "sandwich";
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
  paymentStatus: "unpaid" | "paid";
  stripeCheckoutSessionId: string | null;
  paidAt: string | null;
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

export interface Data {
  users: UserRecord[];
  enquiries: EnquiryRecord[];
  contacts: ContactRecord[];
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
  contacts: [],
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

function requireProductionStorage(): void {
  if (isSupabasePartiallyConfigured) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither.");
  }
  if (process.env.VERCEL && !isSupabaseConfigured) {
    throw new Error("Supabase must be configured for persistent storage on Vercel.");
  }
}

function normalize(parsed: Partial<Data>): Data {
  const record = <T>(value: unknown): Record<string, T> =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, T>)
      : {};
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
    contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
    orders: Array.isArray(parsed.orders)
      ? parsed.orders.map((order) => ({
          ...order,
          paymentStatus: order.paymentStatus ?? "unpaid",
          stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? null,
          paidAt: order.paidAt ?? null,
        }))
      : [],
    controlKeys: Array.isArray(parsed.controlKeys) ? parsed.controlKeys : [],
    permissions: record<PermissionMode>(parsed.permissions),
    approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    productOverrides: record<ProductOverride>(parsed.productOverrides),
    announcement: (parsed.announcement as AnnouncementRecord | null) ?? null,
  };
}

async function loadFile(): Promise<Data> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Data>;
    return normalize(parsed);
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
async function saveFile(data: Data): Promise<void> {
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
  requireProductionStorage();
  if (!isSupabaseConfigured) return loadFile();
  return readSupabaseState<Data>().then(async (row) => {
    if (row) return normalize(row.data);
    await createSupabaseState(EMPTY);
    return normalize((await readSupabaseState<Data>())?.data ?? EMPTY);
  });
}

export function updateData<T>(mutate: (data: Data) => T | Promise<T>): Promise<T> {
  requireProductionStorage();
  if (isSupabaseConfigured) {
    return (async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        let row = await readSupabaseState<Data>();
        if (!row) {
          await createSupabaseState(EMPTY);
          row = await readSupabaseState<Data>();
        }
        if (!row) throw new Error("Supabase app state could not be initialized.");
        const data = normalize(structuredClone(row.data));
        const result = await mutate(data);
        if (await replaceSupabaseState(data, row.version)) return result;
      }
      throw new Error("Supabase update was busy. Please try again.");
    })();
  }

  const run = queue.then(async () => {
    const data = await loadFile();
    const result = await mutate(data);
    await saveFile(data);
    return result;
  });
  // Keep the chain alive even when a caller's mutation throws, otherwise
  // one failed write would block every write after it.
  queue = run.catch(() => undefined);
  return run;
}

export const newId = randomUUID;
