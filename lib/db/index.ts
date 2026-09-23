import {
  configuredKeyProblem,
  isSupabaseConfigured,
  isSupabasePartiallyConfigured,
  postgrestStore,
} from "./postgrest";
import { jsonStore } from "./json";
import { TABLES, type Store } from "./store";
import type {
  ApprovalRecord,
  AuditRecord,
  CapabilityPermissionRecord,
  ContactRecord,
  ControlKeyRecord,
  CustomerMessageRecord,
  EnquiryRecord,
  IdempotencyRecord,
  OrderLineRecord,
  OrderRecord,
  PaymentEventRecord,
  ProductOverrideRecord,
  RateLimitHitRecord,
  SavedInfoRecord,
  SettingRecord,
  UserRecord,
} from "./types";

/**
 * Which storage this process is using, and the typed handle on each table.
 *
 * Everything above lib/db talks to the tables below and never to an adapter,
 * so switching storage is this file and nothing else.
 */

export { isSupabaseConfigured, isSupabasePartiallyConfigured };
export { StorageError } from "./postgrest";

/**
 * Supabase whenever it is configured, the local file otherwise.
 *
 * The failure modes worth refusing outright:
 *
 *   HALF CONFIGURED is always a mistake. A URL with no key, or a key with no
 *   URL, means somebody intended to use Supabase, so falling back to a file
 *   would quietly write real orders somewhere nobody is looking.
 *
 *   THE FILE ON A SERVERLESS HOST is worse than no storage. Each instance
 *   gets its own copy on a disk that is discarded, so orders would appear to
 *   save and then vanish. Better to fail the deploy.
 *
 *   THE PUBLIC KEY IN THE SERVER'S SLOT would pass both checks and then fail
 *   every query at runtime. See serverKeyProblem.
 */
function requireUsableStorage(): void {
  if (isSupabasePartiallyConfigured) {
    throw new Error(
      "Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or neither. One without the other means the site would silently store nothing."
    );
  }
  if (configuredKeyProblem) throw new Error(configuredKeyProblem);
  if (process.env.VERCEL && !isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured on Vercel. The local JSON file is per-instance and discarded, so orders would appear to save and then disappear."
    );
  }
}

requireUsableStorage();

export const store: Store = isSupabaseConfigured ? postgrestStore : jsonStore;

/** An order row without the lines, which live in their own table. */
export type OrderRow = Omit<OrderRecord, "lines">;

export const db = {
  users: store.from<UserRecord>(TABLES.users),
  enquiries: store.from<EnquiryRecord>(TABLES.enquiries),
  contacts: store.from<ContactRecord>(TABLES.contacts),
  orders: store.from<OrderRow, "reference" | "token">(TABLES.orders),
  orderLines: store.from<OrderLineRecord, "id">(TABLES.orderLines),
  customerMessages: store.from<CustomerMessageRecord>(TABLES.customerMessages),
  savedInfo: store.from<SavedInfoRecord>(TABLES.savedInfo),
  controlKeys: store.from<ControlKeyRecord>(TABLES.controlKeys),
  capabilityPermissions: store.from<CapabilityPermissionRecord>(TABLES.capabilityPermissions),
  approvals: store.from<ApprovalRecord>(TABLES.approvals),
  auditLog: store.from<AuditRecord, "id">(TABLES.auditLog),
  idempotencyKeys: store.from<IdempotencyRecord>(TABLES.idempotencyKeys),
  productOverrides: store.from<ProductOverrideRecord>(TABLES.productOverrides),
  settings: store.from<SettingRecord>(TABLES.settings),
  paymentEvents: store.from<PaymentEventRecord>(TABLES.paymentEvents),
  rateLimitHits: store.from<RateLimitHitRecord, "id">(TABLES.rateLimitHits),
} as const;

/** Grouped counts, computed by the database rather than in JavaScript. */
export const counts = {
  enquiries: () => store.counts("enquiry_counts"),
  orders: () => store.counts("order_counts"),
};

export { TABLES };
export type { Store, Table, TableSpec, Insert, StatusCountRow } from "./store";
export type { Where, FindOptions, Conditions, Filter, Comparison } from "./query";
export * from "./types";
