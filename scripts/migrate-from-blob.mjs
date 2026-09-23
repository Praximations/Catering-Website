/**
 * Move an existing database out of the single-JSON-document layout and into
 * the relational tables in supabase/schema.sql.
 *
 *   node scripts/migrate-from-blob.mjs --from data/catering.json --dry-run
 *   node scripts/migrate-from-blob.mjs --from data/catering.json
 *   node scripts/migrate-from-blob.mjs --from-supabase
 *   node scripts/migrate-from-blob.mjs --from data/catering.json --print-json
 *
 * WHAT IT DOES NOT DO: it never deletes the source. The old document is left
 * exactly where it was, so a migration that goes wrong is undone by pointing
 * the app back at it rather than by restoring a backup.
 *
 * Run supabase/schema.sql FIRST. This script writes rows; it does not create
 * tables, and it will tell you plainly if they are not there.
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const dryRun = has("--dry-run") || has("--print-json");
/** Dump the mapped rows instead of writing them, to inspect or to load by hand. */
const printJson = has("--print-json");
const fromSupabase = has("--from-supabase");
const sourceFile = valueOf("--from", "data/catering.json");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/* ------------------------------ reading the old --------------------------- */

async function readBlob() {
  if (fromSupabase) {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      fail("--from-supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.");
    }
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/app_state?id=eq.primary&select=data&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!response.ok) fail(`Could not read app_state: HTTP ${response.status}.`);
    const rows = await response.json();
    if (!rows[0]) fail("There is no app_state row with id 'primary'. Nothing to migrate.");
    return rows[0].data;
  }

  try {
    const parsed = JSON.parse(await readFile(sourceFile, "utf8"));
    // A file already in the new shape has a `tables` key. Migrating it again
    // would produce nothing useful, so say so instead.
    if (parsed.tables) {
      fail(`${sourceFile} is already in the new layout. Nothing to migrate.`);
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") fail(`No such file: ${sourceFile}`);
    throw error;
  }
}

/* ------------------------------ writing the new --------------------------- */

async function insert(table, rows) {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.");
  }

  // In batches, so one oversized request cannot fail the whole migration, and
  // so the progress printed below means something.
  const BATCH = 200;
  let written = 0;
  for (let at = 0; at < rows.length; at += BATCH) {
    const batch = rows.slice(at, at + BATCH);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        // Re-running the migration must not duplicate rows, and must not stop
        // at the first row that is already there. return=representation, not
        // minimal, because ignore-duplicates drops rows SILENTLY and counting
        // the batch would report an order that was never written as migrated.
        Prefer: "return=representation,resolution=ignore-duplicates",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const detail = await response.text();
      fail(`Writing ${table} failed: HTTP ${response.status}\n  ${detail}`);
    }
    const inserted = await response.json();
    written += Array.isArray(inserted) ? inserted.length : batch.length;
    if (Array.isArray(inserted) && inserted.length !== batch.length) {
      skipped.push(`${table}: ${batch.length - inserted.length} row(s) already present or rejected`);
    }
  }
  return written;
}

/** Rows the database declined to insert, reported at the end rather than lost. */
const skipped = [];

const iso = (value, fallback = new Date().toISOString()) =>
  typeof value === "string" && value ? value : fallback;
const str = (value, fallback = "") => (typeof value === "string" ? value : fallback);
const int = (value, fallback = 0) => (Number.isFinite(value) ? Math.trunc(value) : fallback);

/* ---------------------------------- mapping -------------------------------- */

function mapAll(blob) {
  const users = (blob.users ?? []).map((user) => ({
    id: str(user.id) || randomUUID(),
    email: str(user.email).toLowerCase(),
    name: str(user.name),
    password_hash: user.passwordHash ?? null,
    auth_provider: user.authProvider === "google" ? "google" : "password",
    role: user.role === "owner" ? "owner" : "customer",
    // Everyone starts at epoch 0. Sessions issued under the old cookie format
    // have no epoch in them and are rejected anyway, so every existing login
    // is invalidated by this migration. That is the safe direction.
    session_epoch: 0,
    created_at: iso(user.createdAt),
    updated_at: iso(user.createdAt),
  }));

  const knownUserIds = new Set(users.map((user) => user.id));
  /** A dangling user_id would fail the foreign key, so drop it to null. */
  const userRef = (id) => (typeof id === "string" && knownUserIds.has(id) ? id : null);

  const enquiries = (blob.enquiries ?? []).map((enquiry) => ({
    id: str(enquiry.id) || randomUUID(),
    user_id: userRef(enquiry.userId),
    name: str(enquiry.name, "Unknown"),
    email: str(enquiry.email).toLowerCase(),
    phone: str(enquiry.phone),
    event_date: str(enquiry.eventDate, "1970-01-01"),
    // The guests column is checked to be 1..5000, and old rows were not.
    guests: Math.min(Math.max(int(enquiry.guests, 1), 1), 5000),
    package_slug: str(enquiry.packageSlug, "unsure"),
    notes: str(enquiry.notes),
    status: ["new", "contacted", "confirmed", "declined"].includes(enquiry.status)
      ? enquiry.status
      : "new",
    owner_notes: str(enquiry.ownerNotes),
    created_at: iso(enquiry.createdAt),
    updated_at: iso(enquiry.updatedAt, iso(enquiry.createdAt)),
  }));

  const contacts = (blob.contacts ?? []).map((contact) => ({
    id: str(contact.id) || randomUUID(),
    user_id: userRef(contact.userId),
    name: str(contact.name, "Unknown"),
    email: str(contact.email).toLowerCase(),
    phone: str(contact.phone),
    subject: str(contact.subject, "(no subject)"),
    message: str(contact.message),
    status: ["new", "read", "replied"].includes(contact.status) ? contact.status : "new",
    created_at: iso(contact.createdAt),
    updated_at: iso(contact.updatedAt, iso(contact.createdAt)),
  }));

  const orders = [];
  const orderLines = [];
  const knownOrderIds = new Set();

  const takenReferences = new Set(
    (blob.orders ?? []).map((order) => str(order.reference)).filter(Boolean)
  );
  let nextCandidate = 1000;
  const nextReference = () => {
    do {
      nextCandidate += 1;
    } while (takenReferences.has(String(nextCandidate)));
    takenReferences.add(String(nextCandidate));
    return nextCandidate;
  };

  for (const order of blob.orders ?? []) {
    const id = str(order.id) || randomUUID();
    knownOrderIds.add(id);

    const paid = order.paymentStatus === "paid";
    orders.push({
      id,
      // A fallback reference must not collide with one another order already
      // carries: orders.reference is unique, so a collision means PostgREST
      // silently drops that order and its lines. Take the next number above
      // every reference in the source instead of counting rows.
      reference: str(order.reference) || String(nextReference()),
      // An old row without a token would be unreachable by its own owner.
      token: str(order.token) || randomUUID(),
      user_id: userRef(order.userId),
      name: str(order.name, "Unknown"),
      email: str(order.email).toLowerCase(),
      phone: str(order.phone),
      event_date: str(order.eventDate, "1970-01-01"),
      guests: Math.min(Math.max(int(order.guests, 1), 1), 5000),
      address: str(order.address),
      notes: str(order.notes),
      subtotal_minor: Math.max(int(order.subtotalMinor), 0),
      // Pre-dates the currency column. These were all priced in the currency
      // lib/business.ts named at the time, which was hardcoded to usd.
      currency: "usd",
      status: ["pending", "confirmed", "fulfilled", "cancelled"].includes(order.status)
        ? order.status
        : "pending",
      payment_status: paid ? "paid" : "unpaid",
      payment_provider: order.stripeCheckoutSessionId ? "stripe" : null,
      // The old column held a Stripe session id. It becomes the generic
      // provider reference, with the provider named beside it.
      payment_reference: order.stripeCheckoutSessionId ?? null,
      // The paid/paid_at constraint means a paid row must say when. An old
      // paid row with no timestamp gets its last update, which is the closest
      // honest answer available.
      paid_at: paid ? iso(order.paidAt, iso(order.updatedAt)) : null,
      owner_notes: str(order.ownerNotes),
      created_at: iso(order.createdAt),
      updated_at: iso(order.updatedAt, iso(order.createdAt)),
    });

    (order.lines ?? []).forEach((line, position) => {
      orderLines.push({
        id: randomUUID(),
        order_id: id,
        position,
        slug: str(line.slug, "unknown"),
        name: str(line.name, "Item"),
        unit: ["person", "item", "sandwich"].includes(line.unit) ? line.unit : "item",
        unit_price_minor: Math.max(int(line.unitPriceMinor), 0),
        quantity: Math.max(int(line.quantity, 1), 1),
        line_total_minor: Math.max(int(line.lineTotalMinor), 0),
      });
    });
  }

  const customerMessages = (blob.customerMessages ?? [])
    // A message needs an account OR an order to belong to (the table refuses
    // one with neither), so a message whose account and order are both gone
    // cannot be carried over. Reported below rather than dropped silently.
    .filter(
      (message) => knownUserIds.has(str(message.userId)) || knownOrderIds.has(str(message.orderId))
    )
    .map((message) => ({
      id: str(message.id) || randomUUID(),
      user_id: knownUserIds.has(str(message.userId)) ? str(message.userId) : null,
      order_id: knownOrderIds.has(str(message.orderId)) ? message.orderId : null,
      sender: message.sender === "owner" ? "owner" : "customer",
      kind: message.kind === "change_request" ? "change_request" : "message",
      body: str(message.body),
      created_at: iso(message.createdAt),
    }));

  const savedInfo = (blob.savedInfo ?? [])
    .filter((info) => knownUserIds.has(str(info.userId)))
    .map((info) => ({
      user_id: str(info.userId),
      venues: Array.isArray(info.venues) ? info.venues.map(String) : [],
      addresses: Array.isArray(info.addresses) ? info.addresses.map(String) : [],
      guest_preferences: str(info.guestPreferences),
      dietary_information: str(info.dietaryInformation),
      favorite_menu_slugs: Array.isArray(info.favoriteMenuSlugs)
        ? info.favoriteMenuSlugs.map(String)
        : [],
      updated_at: iso(info.updatedAt),
    }));

  const controlKeys = (blob.controlKeys ?? []).map((key) => ({
    id: str(key.id) || randomUUID(),
    label: str(key.label, "Praxi"),
    token_hash: str(key.tokenHash),
    token_prefix: str(key.tokenPrefix),
    status: key.status === "revoked" ? "revoked" : "active",
    created_at: iso(key.createdAt),
    last_used_at: key.lastUsedAt ?? null,
    revoked_at: key.revokedAt ?? null,
  }));

  const permissions = Object.entries(blob.permissions ?? {})
    .filter(([, mode]) => ["off", "ask", "on"].includes(mode))
    .map(([capabilityId, mode]) => ({
      capability_id: capabilityId,
      mode,
      updated_at: new Date().toISOString(),
      updated_by: "migration",
    }));

  const approvals = (blob.approvals ?? []).map((approval) => ({
    id: str(approval.id) || randomUUID(),
    capability: str(approval.capability),
    args: approval.args ?? {},
    reason: str(approval.reason),
    status: ["pending", "approved", "denied", "expired"].includes(approval.status)
      ? approval.status
      : "pending",
    requested_by: str(approval.requestedBy, "unknown"),
    requested_at: iso(approval.requestedAt),
    decided_by: approval.decidedBy ?? null,
    decided_at: approval.decidedAt ?? null,
    result: approval.result ?? null,
    error: approval.error ?? null,
  }));

  // The id column is an identity, so it is left out and Postgres assigns it.
  const auditLog = (blob.auditLog ?? [])
    .slice()
    .reverse() // Stored newest-first; inserted oldest-first so ids ascend with time.
    .map((entry) => ({
      at: iso(entry.at),
      capability: str(entry.capability),
      actor: str(entry.actor, "unknown"),
      decision: ["allowed", "denied", "queued", "executed", "failed"].includes(entry.decision)
        ? entry.decision
        : "allowed",
      detail: str(entry.detail),
      idempotency_key: entry.idempotencyKey ?? null,
    }));

  const productOverrides = Object.entries(blob.productOverrides ?? {}).map(
    ([slug, override]) => ({
      slug,
      // The column is checked to be positive, and null means "not overridden".
      price_minor:
        Number.isFinite(override?.priceMinor) && override.priceMinor > 0
          ? Math.trunc(override.priceMinor)
          : null,
      available: typeof override?.available === "boolean" ? override.available : null,
      updated_at: iso(override?.updatedAt),
      updated_by: str(override?.updatedBy, "migration"),
    })
  );

  const settings = blob.announcement
    ? [
        {
          key: "announcement",
          value: {
            message: str(blob.announcement.message),
            setBy: str(blob.announcement.setBy),
            setAt: iso(blob.announcement.setAt),
          },
          updated_at: new Date().toISOString(),
        },
      ]
    : [];

  const droppedMessages = (blob.customerMessages ?? []).length - customerMessages.length;
  const droppedSavedInfo = (blob.savedInfo ?? []).length - savedInfo.length;

  return {
    tables: {
      users,
      enquiries,
      contacts,
      orders,
      order_lines: orderLines,
      customer_messages: customerMessages,
      saved_info: savedInfo,
      control_keys: controlKeys,
      capability_permissions: permissions,
      approvals,
      audit_log: auditLog,
      product_overrides: productOverrides,
      settings,
    },
    notes: { droppedMessages, droppedSavedInfo },
  };
}

/* ---------------------------------- running -------------------------------- */

const blob = await readBlob();
const { tables, notes } = mapAll(blob);

// Parents before children: order_lines has a foreign key to orders, and
// customer_messages to both users and orders.
const ORDER = [
  "users",
  "enquiries",
  "contacts",
  "orders",
  "order_lines",
  "customer_messages",
  "saved_info",
  "control_keys",
  "capability_permissions",
  "approvals",
  "audit_log",
  "product_overrides",
  "settings",
];

if (printJson) {
  // Rows exactly as they would be inserted, in dependency order, so they can
  // be reviewed or loaded with psql before trusting them to a live database.
  console.log(JSON.stringify(Object.fromEntries(ORDER.map((t) => [t, tables[t] ?? []])), null, 2));
  process.exit(0);
}

console.log(`\n${dryRun ? "DRY RUN, nothing will be written" : "Writing to Supabase"}\n`);

let total = 0;
for (const table of ORDER) {
  const rows = tables[table] ?? [];
  const written = await insert(table, rows);
  total += written;
  console.log(`  ${String(written).padStart(6)}  ${table}`);
}

console.log(`\n  ${total} rows ${dryRun ? "would be" : ""} written.`);

if (skipped.length > 0) {
  console.log("\n  Not written:");
  for (const line of skipped) console.log(`    ${line}`);
}

if (notes.droppedMessages > 0) {
  console.log(
    `\n  ${notes.droppedMessages} customer message(s) skipped: the account they belong to is not in the source data, and the column cannot be null.`
  );
}
if (notes.droppedSavedInfo > 0) {
  console.log(
    `  ${notes.droppedSavedInfo} saved-preferences row(s) skipped, same reason.`
  );
}

console.log(`
  Next:
    1. Sign in and check /admin against the old data.
    2. Bump the order reference sequence past the highest migrated one:
         select setval('public.order_reference_seq',
           (select max(reference::bigint) from public.orders));
    3. Everyone has to sign in again. The session cookie format changed, so
       old cookies are rejected rather than trusted.

  The source was NOT deleted.
`);
