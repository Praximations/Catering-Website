/**
 * The query vocabulary both adapters speak.
 *
 * Small on purpose. It covers exactly what this application asks for, and
 * nothing that would let a caller express a query one adapter could answer
 * and the other could not. Anything more expressive belongs in a database
 * view, where Postgres can plan it, rather than in a homegrown ORM.
 */

/** A comparison against one column. Exactly one key per object. */
export type Comparison =
  | { eq: string | number | boolean | null }
  | { neq: string | number | boolean | null }
  | { gt: string | number }
  | { gte: string | number }
  | { lt: string | number }
  | { lte: string | number }
  | { in: readonly (string | number)[] };

/** A bare value is shorthand for `{ eq: value }`. */
export type Filter = string | number | boolean | null | Comparison;

/** Conditions on a row, ANDed together. */
export type Conditions<T> = { readonly [K in keyof T]?: Filter };

export interface Where<T> {
  /** ANDed together. */
  readonly all?: Conditions<T>;
  /**
   * ORed together, then ANDed with `all`. One clause, which is all the
   * application needs: "this account's orders, or orders placed under this
   * address before the account existed".
   */
  readonly any?: readonly Conditions<T>[];
}

export interface FindOptions<T> {
  readonly orderBy?: keyof T & string;
  readonly direction?: "asc" | "desc";
  readonly limit?: number;
  readonly offset?: number;
}

export function isComparison(value: Filter): value is Comparison {
  return typeof value === "object" && value !== null;
}

/** Unwraps the shorthand so both adapters see the same shape. */
export function normalizeFilter(value: Filter): Comparison {
  return isComparison(value) ? value : { eq: value };
}

/**
 * Whether one row satisfies one comparison.
 *
 * Shared rather than duplicated: the local adapter evaluates filters in
 * JavaScript, and the tests use it to check that both adapters agree.
 * Comparisons use < and >, which is why every sortable column in this
 * schema is either a number or an ISO string, where lexicographic order and
 * chronological order are the same order.
 */
export function matchesComparison(actual: unknown, comparison: Comparison): boolean {
  if ("eq" in comparison) return actual === comparison.eq;
  if ("neq" in comparison) return actual !== comparison.neq;
  if ("in" in comparison) {
    return comparison.in.some((candidate) => candidate === actual);
  }
  // A null never satisfies an ordering comparison, the same way SQL's
  // three-valued logic refuses to guess where a null sorts.
  if (actual === null || actual === undefined) return false;
  if ("gt" in comparison) return (actual as string) > (comparison.gt as string);
  if ("gte" in comparison) return (actual as string) >= (comparison.gte as string);
  if ("lt" in comparison) return (actual as string) < (comparison.lt as string);
  if ("lte" in comparison) return (actual as string) <= (comparison.lte as string);
  return false;
}

export function matchesConditions<T>(row: T, conditions: Conditions<T>): boolean {
  return Object.entries(conditions).every(([column, filter]) =>
    matchesComparison(
      (row as Record<string, unknown>)[column],
      normalizeFilter(filter as Filter)
    )
  );
}

export function matchesWhere<T>(row: T, where: Where<T> | undefined): boolean {
  if (!where) return true;
  if (where.all && !matchesConditions(row, where.all)) return false;
  if (where.any && where.any.length > 0) {
    if (!where.any.some((conditions) => matchesConditions(row, conditions))) return false;
  }
  return true;
}
