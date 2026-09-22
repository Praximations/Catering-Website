import type { FindOptions, Where } from "./query";

/**
 * The storage contract, and the one place that says what a table is.
 *
 * Two adapters implement it: Supabase over PostgREST for anything deployed,
 * and a local JSON file so the site runs with no configuration at all. The
 * interface is deliberately narrow. Anything it cannot express (a grouped
 * count, two inserts in one transaction) belongs in supabase/schema.sql as a
 * view or a function, where Postgres can plan it and both adapters can call
 * it by name, rather than growing an ORM here.
 */

/**
 * What a caller passes to insert: the row, minus the columns the database
 * fills in. Everything else is required, so a forgotten field is a compile
 * error rather than a null discovered in production.
 */
export type Insert<T, Generated extends keyof T = never> = Omit<T, Generated> &
  Partial<Pick<T, Generated>>;

export interface Table<T, Generated extends keyof T = never> {
  find(where?: Where<T>, options?: FindOptions<T>): Promise<T[]>;
  findOne(where: Where<T>): Promise<T | null>;
  count(where?: Where<T>): Promise<number>;

  insert(record: Insert<T, Generated>): Promise<T>;

  /**
   * Insert, or null when a unique constraint already holds that value.
   *
   * THE INSERT IS THE LOCK. This is how "only handle this webhook event
   * once" and "only one account per address" are enforced: not by looking
   * first and then writing, which two concurrent callers both pass, but by
   * letting the database refuse the second write. A null here means
   * somebody else got there first, which is an answer, not an error.
   */
  insertIfAbsent(record: Insert<T, Generated>): Promise<T | null>;

  /**
   * Patch every row matching `where`, and return the rows as they now are.
   *
   * The returned array is the important part: putting a state check in
   * `where` makes a conditional update a single atomic statement, and an
   * empty result means the condition did not hold. That is what makes
   * "mark paid only if still unpaid" safe against two callers.
   */
  update(where: Where<T>, patch: Partial<T>): Promise<T[]>;

  /** Insert, or patch the row that collides on the primary key. */
  upsert(record: Insert<T, Generated>): Promise<T>;

  remove(where: Where<T>): Promise<number>;
}

export interface TableSpec {
  /** The table name in Postgres, snake_case. */
  readonly name: string;
  /** Primary key columns, as camelCase field names. */
  readonly primaryKey: readonly string[];
  /** Other uniqueness constraints, each a set of camelCase field names. */
  readonly unique?: readonly (readonly string[])[];
  /** True when Postgres has a trigger keeping updatedAt current. */
  readonly touchUpdatedAt?: boolean;
  /**
   * Columns Postgres generates, which the local adapter has to imitate.
   * "uuid" is a random id, "serial" an ascending integer, "now" a timestamp.
   */
  readonly generated?: Readonly<Record<string, "uuid" | "serial" | "now">>;
}

/** Row counts grouped by status, from a database view. */
export interface StatusCountRow {
  status: string;
  count: number;
  subtotalMinor?: number;
}

export interface Store {
  readonly kind: "postgrest" | "json";
  from<T, Generated extends keyof T = never>(spec: TableSpec): Table<T, Generated>;

  /** Read a grouped-count view by name. */
  counts(view: "enquiry_counts" | "order_counts"): Promise<StatusCountRow[]>;

  /**
   * The one write that spans two tables, so the one that needs a
   * transaction. See place_order in supabase/schema.sql.
   *
   * Takes and returns APPLICATION shapes, camelCase, like every other method
   * here. Translating to the database's column names is the adapter's job.
   */
  placeOrder(
    order: Record<string, unknown>,
    lines: readonly Record<string, unknown>[]
  ): Promise<Record<string, unknown>>;
}

/* ------------------------------ the table list ----------------------------- */

/**
 * Every table, named once. A spec carries only what an adapter cannot work
 * out for itself: what makes a row unique, and what Postgres fills in.
 */
export const TABLES = {
  users: {
    name: "users",
    primaryKey: ["id"],
    unique: [["email"]],
    touchUpdatedAt: true,
    generated: { id: "uuid", createdAt: "now", updatedAt: "now" },
  },
  enquiries: {
    name: "enquiries",
    primaryKey: ["id"],
    touchUpdatedAt: true,
    generated: { id: "uuid", createdAt: "now", updatedAt: "now" },
  },
  contacts: {
    name: "contacts",
    primaryKey: ["id"],
    touchUpdatedAt: true,
    generated: { id: "uuid", createdAt: "now", updatedAt: "now" },
  },
  orders: {
    name: "orders",
    primaryKey: ["id"],
    unique: [["reference"], ["token"]],
    touchUpdatedAt: true,
    generated: {
      id: "uuid",
      reference: "serial",
      token: "uuid",
      createdAt: "now",
      updatedAt: "now",
    },
  },
  orderLines: {
    name: "order_lines",
    primaryKey: ["id"],
    unique: [["orderId", "position"]],
    generated: { id: "uuid" },
  },
  customerMessages: {
    name: "customer_messages",
    primaryKey: ["id"],
    generated: { id: "uuid", createdAt: "now" },
  },
  savedInfo: {
    name: "saved_info",
    primaryKey: ["userId"],
    touchUpdatedAt: true,
    generated: { updatedAt: "now" },
  },
  controlKeys: {
    name: "control_keys",
    primaryKey: ["id"],
    unique: [["tokenHash"]],
    generated: { id: "uuid", createdAt: "now" },
  },
  capabilityPermissions: {
    name: "capability_permissions",
    primaryKey: ["capabilityId"],
    touchUpdatedAt: true,
    generated: { updatedAt: "now" },
  },
  approvals: {
    name: "approvals",
    primaryKey: ["id"],
    generated: { id: "uuid", requestedAt: "now" },
  },
  auditLog: {
    name: "audit_log",
    primaryKey: ["id"],
    generated: { id: "serial", at: "now" },
  },
  idempotencyKeys: {
    name: "idempotency_keys",
    primaryKey: ["controlKeyId", "key"],
    generated: { createdAt: "now" },
  },
  productOverrides: {
    name: "product_overrides",
    primaryKey: ["slug"],
    touchUpdatedAt: true,
    generated: { updatedAt: "now" },
  },
  settings: {
    name: "settings",
    primaryKey: ["key"],
    touchUpdatedAt: true,
    generated: { updatedAt: "now" },
  },
  paymentEvents: {
    name: "payment_events",
    primaryKey: ["id"],
    generated: { receivedAt: "now" },
  },
  rateLimitHits: {
    name: "rate_limit_hits",
    primaryKey: ["id"],
    generated: { id: "serial", at: "now" },
  },
} as const satisfies Record<string, TableSpec>;
