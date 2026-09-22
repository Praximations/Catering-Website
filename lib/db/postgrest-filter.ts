import { normalizeFilter, type Comparison, type Conditions, type Filter, type Where } from "./query";
import { toSnake } from "./naming";

/**
 * Turning a Where into PostgREST query parameters.
 *
 * ITS OWN FILE BECAUSE IT IS THE INJECTION SURFACE. Everything else in
 * lib/db moves objects around; this is the one place application values are
 * spliced into a string a server will parse. PostgREST's filter grammar
 * treats , . : ( ) and " as syntax, so a value carrying any of them could
 * otherwise end the filter early and start another one, which is how
 * `email=eq.a@b.co` becomes `email=eq.a@b.co,role=eq.owner`.
 *
 * The defence is to double-quote EVERY value, always, and to escape the
 * backslash and the double quote inside it. Always-quoting rather than
 * quoting-when-needed matters: a rule that only fires on suspicious input
 * is a rule with an exception to find.
 */

/**
 * One value, quoted so PostgREST reads it as a single literal.
 *
 * Order matters: backslashes first, or the backslash added in front of a
 * quote would itself be escaped on the second pass.
 */
export function quoteValue(value: string | number | boolean): string {
  const text = String(value);
  const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * The right-hand side of one filter, such as `eq."ari@example.com"`.
 *
 * Null is special: PostgREST spells it `is.null`, and `eq.null` would look
 * for the four-character string "null".
 */
export function encodeComparison(comparison: Comparison): string {
  if ("eq" in comparison) {
    return comparison.eq === null ? "is.null" : `eq.${quoteValue(comparison.eq)}`;
  }
  if ("neq" in comparison) {
    return comparison.neq === null ? "not.is.null" : `neq.${quoteValue(comparison.neq)}`;
  }
  if ("in" in comparison) {
    // An empty IN would produce `in.()`, which PostgREST rejects. `in.("")`
    // would be worse: it matches the empty string. Compare the column with
    // null instead, which no value satisfies, so the result is empty.
    if (comparison.in.length === 0) return "is.null.not.is.null";
    return `in.(${comparison.in.map(quoteValue).join(",")})`;
  }
  if ("gt" in comparison) return `gt.${quoteValue(comparison.gt)}`;
  if ("gte" in comparison) return `gte.${quoteValue(comparison.gte)}`;
  if ("lt" in comparison) return `lt.${quoteValue(comparison.lt)}`;
  if ("lte" in comparison) return `lte.${quoteValue(comparison.lte)}`;
  throw new Error("Unsupported comparison.");
}

/**
 * Object.entries over a mapped type widens the value to unknown. One typed
 * reader here keeps that cast in a single place instead of at both call
 * sites below.
 */
function conditionEntries<T>(conditions: Conditions<T>): [string, Filter][] {
  return Object.entries(conditions) as [string, Filter][];
}

/** `column.eq."value"`, the form used inside an or=(...) group. */
function encodeConditionsForOr<T>(conditions: Conditions<T>): string {
  return conditionEntries(conditions)
    .map(([column, filter]) => `${toSnake(column)}.${encodeComparison(normalizeFilter(filter))}`)
    .join(",");
}

/**
 * A Where as PostgREST search params.
 *
 * The AND part becomes one parameter per column. The OR part becomes a
 * single `or=(...)`, and the two together are ANDed by PostgREST, which is
 * the same meaning matchesWhere() gives them locally.
 */
export function encodeWhere<T>(where: Where<T> | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!where) return params;

  for (const [column, filter] of conditionEntries(where.all ?? {})) {
    params.append(toSnake(column), encodeComparison(normalizeFilter(filter)));
  }

  if (where.any && where.any.length > 0) {
    const clauses = where.any.map((conditions) => {
      const encoded = encodeConditionsForOr(conditions);
      // A group of more than one condition is itself an AND, and needs its
      // own parentheses so it is not flattened into the outer OR.
      return Object.keys(conditions).length > 1 ? `and(${encoded})` : encoded;
    });
    params.append("or", `(${clauses.join(",")})`);
  }

  return params;
}
