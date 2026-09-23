import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { matchesWhere, type FindOptions } from "./query";
import { TABLES } from "./store";
import type { Insert, StatusCountRow, Store, Table, TableSpec } from "./store";

/**
 * The same contract over a local JSON file, so `npm run dev` needs no
 * database, no Docker, and no keys.
 *
 * It exists to make the site runnable, not to be a database. It imitates
 * what the Postgres adapter gets from Postgres: generated ids, an updated_at
 * that moves on write, and unique constraints that refuse a second row. It
 * does NOT imitate concurrency, because it does not have to: one process,
 * every write queued behind the last. `requireProductionStorage` refuses to
 * let it run anywhere it would.
 */

/**
 * Where the file lives. Relative to the project root, or an absolute path.
 *
 * resolve, not join: join("/project", "/var/data/app.json") produces
 * "/project/var/data/app.json", so an absolute DATA_FILE was silently written
 * to a nonsense path nested under the project instead. resolve honours an
 * absolute path and still treats a relative one as relative to the root.
 */
const FILE = resolve(process.cwd(), process.env.DATA_FILE || "data/catering.json");

type Row = Record<string, unknown>;

/** table name to rows, plus the counters that stand in for a sequence. */
interface FileShape {
  tables: Record<string, Row[]>;
  sequences: Record<string, number>;
}

const EMPTY: FileShape = { tables: {}, sequences: {} };

/** Matches the order_reference_seq in supabase/schema.sql. */
const FIRST_ORDER_REFERENCE = 1001;

async function load(): Promise<FileShape> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<FileShape>;
    return {
      tables: parsed.tables ?? {},
      sequences: parsed.sequences ?? {},
    };
  } catch {
    // No file yet, or one we cannot parse. An empty database is the right
    // answer either way; the first write creates it.
    return structuredClone(EMPTY);
  }
}

/**
 * Write through a temporary file and rename. A rename is atomic on every
 * filesystem we care about, so a crash mid-write leaves the previous file
 * intact rather than a truncated one.
 */
async function save(data: FileShape): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  const temp = `${FILE}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temp, FILE);
}

/**
 * Every write queues behind the one before it. Read-modify-write on a
 * shared file is a lost-update race otherwise: two orders placed in the
 * same moment, one silently overwriting the other.
 */
let queue: Promise<unknown> = Promise.resolve();

function serialize<R>(work: (data: FileShape) => Promise<R> | R): Promise<R> {
  const run = queue.then(async () => {
    const data = await load();
    const result = await work(data);
    await save(data);
    return result;
  });
  // Keep the chain alive when a caller's work throws, or one failed write
  // would block every write after it.
  queue = run.catch(() => undefined);
  return run;
}

function nextInSequence(data: FileShape, key: string, start: number): number {
  const next = (data.sequences[key] ?? start - 1) + 1;
  data.sequences[key] = next;
  return next;
}

/** What Postgres would have filled in, filled in here instead. */
function applyGenerated(data: FileShape, spec: TableSpec, record: Row): Row {
  const now = new Date().toISOString();
  const row = { ...record };
  for (const [field, kind] of Object.entries(spec.generated ?? {})) {
    if (row[field] !== undefined && row[field] !== null) continue;
    if (kind === "uuid") row[field] = randomUUID();
    else if (kind === "now") row[field] = now;
    else if (kind === "serial") {
      const start = spec.name === "orders" && field === "reference" ? FIRST_ORDER_REFERENCE : 1;
      const value = nextInSequence(data, `${spec.name}.${field}`, start);
      // orders.reference is a text column holding a number, everywhere else
      // a serial is an integer id.
      row[field] = field === "reference" ? String(value) : value;
    }
  }
  return row;
}

function sameKey(a: Row, b: Row, fields: readonly string[]): boolean {
  return fields.every((field) => a[field] === b[field]);
}

/**
 * The constraint a row would violate, or null.
 *
 * A null never collides, which is Postgres's rule: NULLs are distinct in a
 * unique constraint, so a column that is unique WHEN SET (a provider's message
 * id, say) can hold any number of rows that have none. Treating null as equal
 * to null here would refuse the second row Postgres happily accepts.
 */
function violates(rows: Row[], spec: TableSpec, candidate: Row): readonly string[] | null {
  for (const fields of [spec.primaryKey, ...(spec.unique ?? [])]) {
    if (fields.some((field) => candidate[field] === null || candidate[field] === undefined)) continue;
    if (rows.some((row) => sameKey(row, candidate, fields))) return fields;
  }
  return null;
}

class UniqueViolation extends Error {
  constructor(table: string, fields: readonly string[]) {
    super(`${table} already has a row with the same ${fields.join(" and ")}.`);
    this.name = "UniqueViolation";
  }
}

function sort<T>(rows: Row[], options?: FindOptions<T>): Row[] {
  if (!options?.orderBy) return rows;
  const column = options.orderBy;
  const sign = options.direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = left[column];
    const b = right[column];
    if (a === b) return 0;
    // Nulls last, whichever direction, the same as NULLS LAST in Postgres.
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    return (a < b ? -1 : 1) * sign;
  });
}

function paginate<T>(rows: Row[], options?: FindOptions<T>): Row[] {
  const from = options?.offset ?? 0;
  const to = options?.limit === undefined ? undefined : from + options.limit;
  return rows.slice(from, to);
}

function table<T, Generated extends keyof T = never>(spec: TableSpec): Table<T, Generated> {
  const rowsIn = (data: FileShape): Row[] =>
    (data.tables[spec.name] ??= []);

  /** A copy, so a caller mutating what they got cannot reach the file. */
  const copy = (row: Row): T => structuredClone(row) as T;

  const read = async <R>(work: (rows: Row[]) => R): Promise<R> => {
    const data = await load();
    return work(rowsIn(data));
  };

  const insert = async (
    record: Insert<T, Generated>,
    onConflict: "throw" | "null" | "merge"
  ): Promise<T | null> =>
    serialize((data) => {
      const rows = rowsIn(data);
      const candidate = applyGenerated(data, spec, record as Row);
      const conflict = violates(rows, spec, candidate);

      if (conflict) {
        if (onConflict === "null") return null;
        if (onConflict === "throw") throw new UniqueViolation(spec.name, conflict);
        const existing = rows.find((row) => sameKey(row, candidate, spec.primaryKey));
        if (!existing) throw new UniqueViolation(spec.name, conflict);
        Object.assign(existing, candidate);
        return copy(existing);
      }

      rows.push(candidate);
      return copy(candidate);
    });

  return {
    async find(where, options) {
      return read((rows) =>
        paginate(
          sort(
            rows.filter((row) => matchesWhere(row as T, where)),
            options
          ),
          options
        ).map(copy)
      );
    },

    async findOne(where) {
      return read((rows) => {
        const found = rows.find((row) => matchesWhere(row as T, where));
        return found ? copy(found) : null;
      });
    },

    async count(where) {
      return read((rows) => rows.filter((row) => matchesWhere(row as T, where)).length);
    },

    async insert(record) {
      // Non-null: "throw" is the only branch that can fail, and it throws.
      return (await insert(record, "throw")) as T;
    },

    async insertIfAbsent(record) {
      return insert(record, "null");
    },

    async upsert(record) {
      return (await insert(record, "merge")) as T;
    },

    async update(where, patch) {
      return serialize((data) => {
        const now = new Date().toISOString();
        const updated: T[] = [];
        for (const row of rowsIn(data)) {
          if (!matchesWhere(row as T, where)) continue;
          Object.assign(row, patch);
          // What the updated_at trigger does in Postgres.
          if (spec.touchUpdatedAt) row.updatedAt = now;
          updated.push(copy(row));
        }
        return updated;
      });
    },

    async remove(where) {
      return serialize((data) => {
        const rows = rowsIn(data);
        const keep = rows.filter((row) => !matchesWhere(row as T, where));
        const removed = rows.length - keep.length;
        data.tables[spec.name] = keep;
        return removed;
      });
    },
  };
}

export const jsonStore: Store = {
  kind: "json",

  from<T, Generated extends keyof T = never>(spec: TableSpec) {
    return table<T, Generated>(spec);
  },

  async counts(view) {
    const data = await load();
    const source = view === "order_counts" ? "orders" : "enquiries";
    const grouped = new Map<string, StatusCountRow>();
    for (const row of data.tables[source] ?? []) {
      const status = String(row.status);
      if (view !== "order_counts") {
        const entry = grouped.get(status) ?? { status, count: 0 };
        entry.count += 1;
        grouped.set(status, entry);
        continue;
      }
      // Grouped by both, matching the order_counts view.
      const paymentStatus = String(row.paymentStatus ?? "unpaid");
      const key = `${status}/${paymentStatus}`;
      const entry = grouped.get(key) ?? { status, paymentStatus, count: 0, subtotalMinor: 0 };
      entry.count += 1;
      entry.subtotalMinor = (entry.subtotalMinor ?? 0) + Number(row.subtotalMinor ?? 0);
      grouped.set(key, entry);
    }
    return [...grouped.values()];
  },

  /**
   * The local stand-in for the place_order function. It is one queued write,
   * so the order and its lines land together or not at all, which is the
   * property the SQL function provides in Postgres.
   */
  async placeOrder(order, lines) {
    if (lines.length === 0) throw new Error("placeOrder was given no lines");
    return serialize((data) => {
      const orderRows = (data.tables.orders ??= []);
      const created = applyGenerated(data, TABLES.orders, order);
      orderRows.push(created);

      const lineRows = (data.tables.order_lines ??= []);
      lines.forEach((line, index) => {
        lineRows.push(
          applyGenerated(data, TABLES.orderLines, {
            ...line,
            orderId: created.id,
            position: index,
          })
        );
      });
      return structuredClone(created);
    });
  },
};

