/**
 * The row types, one per table in supabase/schema.sql.
 *
 * These are the shapes as the application sees them: camelCase, dates as
 * ISO strings, money as an integer number of minor units. The adapters
 * translate to and from the database's snake_case, so nothing outside
 * lib/db has to know which convention the storage uses.
 *
 * A row type is NOT what a page receives. lib/enquiries.ts and
 * lib/orders.ts build the customer's view field by field, so a private
 * column added here cannot reach a customer just by being added.
 */

export type Role = "owner" | "customer";
export type AuthProvider = "password" | "google";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  /** Opaque, salted, hashed. See lib/passwords.ts. Never leaves lib/users.ts. */
  passwordHash: string | null;
  authProvider: AuthProvider;
  role: Role;
  /**
   * Bumped to invalidate every session this account has open. A signed
   * cookie cannot be recalled once issued, so the epoch baked into it is
   * compared against this on every request.
   */
  sessionEpoch: number;
  createdAt: string;
  updatedAt: string;
}

export type EnquiryStatus = "new" | "contacted" | "confirmed" | "declined";

export interface EnquiryRecord {
  id: string;
  /** Set when the person was signed in, so it shows on their account page. */
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

export interface CustomerMessageRecord {
  id: string;
  userId: string;
  orderId: string | null;
  sender: "customer" | "owner";
  kind: "message" | "change_request";
  body: string;
  createdAt: string;
}

export interface SavedInfoRecord {
  userId: string;
  venues: string[];
  addresses: string[];
  guestPreferences: string;
  dietaryInformation: string;
  favoriteMenuSlugs: string[];
  updatedAt: string;
}

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

/** A line as it was at the moment of ordering. */
export interface OrderLineRecord {
  id: string;
  orderId: string;
  /** Preserves the order the customer built it in. */
  position: number;
  slug: string;
  /** Snapshotted, so changing the catalog never rewrites an old order. */
  name: string;
  unit: "person" | "item" | "sandwich";
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}

/** An order line without the bookkeeping columns, which is all a page needs. */
export type OrderLine = Omit<OrderLineRecord, "id" | "orderId" | "position">;

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
  /** Stored per order, so changing the business currency cannot reinterpret it. */
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Which provider took the money. Null until a payment is started. */
  paymentProvider: string | null;
  /** That provider's id for the attempt, such as a Stripe session id. */
  paymentReference: string | null;
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

export interface CapabilityPermissionRecord {
  capabilityId: string;
  mode: PermissionMode;
  updatedAt: string;
  updatedBy: string;
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
  /** Assigned by the database, ascending, so it doubles as a page cursor. */
  id: number;
  at: string;
  capability: string;
  actor: string;
  decision: "allowed" | "denied" | "queued" | "executed" | "failed";
  detail: string;
  idempotencyKey: string | null;
}

export interface IdempotencyRecord {
  controlKeyId: string;
  key: string;
  capability: string;
  outcome: string;
  createdAt: string;
}

/**
 * Praxi's changes to the catalog, kept SEPARATE from lib/shop.ts.
 *
 * The file stays the source of truth for what exists; this is a thin
 * override layer on top. That means a price Praxi set is always visible as
 * a deviation, can be cleared in one move, and can never delete a product
 * or invent one.
 */
export interface ProductOverrideRecord {
  slug: string;
  priceMinor: number | null;
  available: boolean | null;
  updatedAt: string;
  updatedBy: string;
}

/** Small single-value site state, such as the notice across the top. */
export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

/** A notice across the top of the site. Stored in `settings`. */
export interface AnnouncementRecord {
  message: string;
  setBy: string;
  setAt: string;
}

/** A provider webhook event already processed. The id is the lock. */
export interface PaymentEventRecord {
  /** Namespaced: "stripe:evt_123", so two providers cannot collide. */
  id: string;
  provider: string;
  type: string;
  orderId: string | null;
  receivedAt: string;
  outcome: string;
}

export interface RateLimitHitRecord {
  id: number;
  bucket: string;
  at: string;
}
