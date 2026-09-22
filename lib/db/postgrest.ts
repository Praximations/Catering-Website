import { recordFromRow, rowFromRecord, toSnake } from "./naming";
import { encodeWhere } from "./postgrest-filter";
import type { FindOptions, Where } from "./query";
import type { Insert, StatusCountRow, Store, Table, TableSpec } from "./store";

/**
 * Supabase over its PostgREST endpoint, with fetch and nothing else.
 *
 * The service-role key never reaches the browser: every module that imports
 * this one is server-only. The key bypasses row level security by design,
 * which is why supabase/schema.sql grants no policies to anyone else. The
 * application's own authorization checks are the only way in.
 */

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);
export const isSupabasePartiallyConfigured = Boolean(url) !== Boolean(serviceRoleKey);

/** Postgres tells us WHY a write was refused. These are the codes we act on. */
const UNIQUE_VIOLATION = "23505";

/** A slow database must not hold a request open indefinitely. */
const TIMEOUT_MS = 10_000;

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
}

export class StorageError extends Error {
  readonly status: number;
  /** The Postgres SQLSTATE, when PostgREST passed one back. */
  readonly code: string | undefined;

  // Written out rather than declared as constructor parameter properties:
  // Node strips types without transpiling, and a parameter property is
  // syntax that would have to be compiled away. Same reason there are no
  // enums or namespaces in this codebase.
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "StorageError";
    this.status = status;
    this.code = code;
  }
}

function headers(prefer?: string): HeadersInit {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    "Accept-Profile": "public",
    "Content-Profile": "public",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function request(
  path: string,
  init: RequestInit & { prefer?: string } = {}
): Promise<Response> {
  if (!url) throw new Error("SUPABASE_URL is not configured.");
  const { prefer, ...rest } = init;

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...rest,
    headers: { ...headers(prefer), ...rest.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // Read the body before throwing: PostgREST puts the Postgres error code
    // in it, and that code is the difference between "already exists", which
    // several callers handle as a normal answer, and a real failure.
    const error = (await response.json().catch(() => ({}))) as PostgrestError;
    throw new StorageError(
      error.message ?? `Storage request failed with status ${response.status}.`,
      response.status,
      error.code
    );
  }
  return response;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof StorageError && error.code === UNIQUE_VIOLATION;
}

/** `select=*` unless the caller wants the embedded children too. */
function searchParams<T>(where?: Where<T>, options?: FindOptions<T>): URLSearchParams {
  const params = encodeWhere(where);
  params.set("select", "*");
  if (options?.orderBy) {
    params.set("order", `${toSnake(options.orderBy)}.${options.direction ?? "asc"}`);
  }
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  return params;
}

function table<T, Generated extends keyof T = never>(spec: TableSpec): Table<T, Generated> {
  const rows = async (response: Response): Promise<T[]> => {
    const parsed = (await response.json()) as Record<string, unknown>[];
    return parsed.map((row) => recordFromRow<T>(row));
  };

  /** The one row a write was supposed to produce. */
  const one = async (response: Response, what: string): Promise<T> => {
    const all = await rows(response);
    if (all.length !== 1) {
      throw new StorageError(`${what} did not return exactly one row.`, 500);
    }
    return all[0]!;
  };

  return {
    async find(where, options) {
      return rows(await request(`${spec.name}?${searchParams(where, options)}`));
    },

    async findOne(where) {
      const found = await rows(
        await request(`${spec.name}?${searchParams(where, { limit: 1 })}`)
      );
      return found[0] ?? null;
    },

    async count(where) {
      const params = encodeWhere(where);
      // HEAD plus count=exact: Postgres counts, and no rows cross the wire.
      params.set("select", spec.primaryKey.map(toSnake).join(","));
      const response = await request(`${spec.name}?${params}`, {
        method: "HEAD",
        prefer: "count=exact",
      });
      // "0-24/1234", or "*/1234" when the range is empty.
      const total = response.headers.get("content-range")?.split("/")[1];
      const parsed = Number(total);
      if (!Number.isFinite(parsed)) {
        throw new StorageError("Storage did not report a row count.", 500);
      }
      return parsed;
    },

    async insert(record) {
      const response = await request(spec.name, {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify(rowFromRecord(record as Record<string, unknown>)),
      });
      return one(response, `Insert into ${spec.name}`);
    },

    async insertIfAbsent(record) {
      try {
        return await this.insert(record);
      } catch (error) {
        // Somebody else won the race, which is the answer this returns null
        // to report. Anything else is a real failure and keeps travelling.
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },

    async update(where, patch) {
      const params = encodeWhere(where);
      params.set("select", "*");
      const response = await request(`${spec.name}?${params}`, {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify(rowFromRecord(patch as Record<string, unknown>)),
      });
      return rows(response);
    },

    async upsert(record) {
      const params = new URLSearchParams({
        on_conflict: spec.primaryKey.map(toSnake).join(","),
        select: "*",
      });
      const response = await request(`${spec.name}?${params}`, {
        method: "POST",
        prefer: "return=representation,resolution=merge-duplicates",
        body: JSON.stringify(rowFromRecord(record as Record<string, unknown>)),
      });
      return one(response, `Upsert into ${spec.name}`);
    },

    async remove(where) {
      const params = encodeWhere(where);
      params.set("select", spec.primaryKey.map(toSnake).join(","));
      const response = await request(`${spec.name}?${params}`, {
        method: "DELETE",
        prefer: "return=representation",
      });
      return (await rows(response)).length;
    },
  };
}

export const postgrestStore: Store = {
  kind: "postgrest",

  from<T, Generated extends keyof T = never>(spec: TableSpec) {
    return table<T, Generated>(spec);
  },

  async counts(view) {
    const response = await request(`${view}?select=*`);
    const parsed = (await response.json()) as Record<string, unknown>[];
    return parsed.map((row) => {
      const record = recordFromRow<StatusCountRow>(row);
      // count and sum come back as strings from a bigint column.
      return {
        status: String(record.status),
        count: Number(record.count),
        ...(record.paymentStatus === undefined
          ? {}
          : { paymentStatus: String(record.paymentStatus) }),
        ...(record.subtotalMinor === undefined
          ? {}
          : { subtotalMinor: Number(record.subtotalMinor) }),
      };
    });
  },

  async placeOrder(order, lines) {
    const response = await request("rpc/place_order", {
      method: "POST",
      // The SQL function reads the column names, so the conversion happens
      // here rather than being the caller's problem.
      body: JSON.stringify({
        p_order: rowFromRecord(order),
        p_lines: lines.map((line) => rowFromRecord(line)),
      }),
    });
    const parsed = (await response.json()) as Record<string, unknown>;
    return recordFromRow<Record<string, unknown>>(parsed);
  },
};

export type { Insert };
