import { normalizeFilter, type Comparison, type Conditions, type Filter, type Where } from "./query";
import { toSnake } from "./naming";

/**
 * Turning a Where into PostgREST query parameters.
 *
 * ITS OWN FILE BECAUSE IT IS THE INJECTION SURFACE. Everything else in
 * lib/db moves objects around; this is the one place application values are
 * spliced into a string a server will parse.
 *
 * WHERE A VALUE SITS DECIDES HOW IT IS WRITTEN, because PostgREST reads the
 * two positions differently:
 *
 *   A top-level parameter, `email=eq.<value>`. Everything after the operator
 *   is the value, taken LITERALLY: PostgREST does not strip quotes here. The
 *   value is its own query parameter, so URLSearchParams escaping & = and #
 *   is what keeps it from starting another one, and nothing inside it is
 *   syntax. So it is sent exactly as it is.
 *
 *   Inside a list, `in.(...)`, or a logic group, `or=(...)`. Here , . : ( )
 *   ARE syntax, and a bare value carrying one could end the filter early and
 *   start another, which is how `email.eq.a@b.co` becomes
 *   `email.eq.a@b.co,role.eq.owner`. So EVERY value in these positions is
 *   double-quoted, always, with the backslash and the quote escaped.
 *   Always, rather than when it looks necessary: a rule that only fires on
 *   suspicious input is a rule with an exception to find.
 *
 * This file used to quote the top-level values too. PostgREST kept the
 * quotes as part of them, so in production an email never matched, a uuid
 * failed to parse, and a timestamp window counted nothing. The tests here
 * and in db-postgrest.test.ts pin both positions for that reason.
 */

/** Where a comparison is written: its own parameter, or inside or=(...). */
export type Position = "param" | "group";

/**
 * One value, quoted so PostgREST reads it as a single literal inside a list
 * or a logic group.
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
 * The right-hand side of one filter: `eq.ari@example.com` as its own
 * parameter, `eq."ari@example.com"` inside a group.
 *
 * Null is special: PostgREST spells it `is.null`, and `eq.null` would look
 * for the four-character string "null".
 *
 * A list is quoted in either position, because a list always reads quotes.
 * An EMPTY list has no spelling PostgREST accepts that means "none of
 * these" (`in.()` is a parse error, `in.("")` matches the empty string), so
 * it never reaches here: see matchesNothing.
 */
export function encodeComparison(comparison: Comparison, position: Position = "param"): string {
  const value = (raw: string | number | boolean) => (position === "group" ? quoteValue(raw) : String(raw));

  if ("eq" in comparison) {
    return comparison.eq === null ? "is.null" : `eq.${value(comparison.eq)}`;
  }
  if ("neq" in comparison) {
    return comparison.neq === null ? "not.is.null" : `neq.${value(comparison.neq)}`;
  }
  if ("in" in comparison) {
    if (comparison.in.length === 0) {
      throw new Error("An empty IN matches nothing and is answered without a request; see matchesNothing.");
    }
    return `in.(${comparison.in.map(quoteValue).join(",")})`;
  }
  if ("gt" in comparison) return `gt.${value(comparison.gt)}`;
  if ("gte" in comparison) return `gte.${value(comparison.gte)}`;
  if ("lt" in comparison) return `lt.${value(comparison.lt)}`;
  if ("lte" in comparison) return `lte.${value(comparison.lte)}`;
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
    .map(([column, filter]) => `${toSnake(column)}.${encodeComparison(normalizeFilter(filter), "group")}`)
    .join(",");
}

function isEmptyIn(filter: Filter): boolean {
  const comparison = normalizeFilter(filter);
  return "in" in comparison && comparison.in.length === 0;
}

function hasEmptyIn<T>(conditions: Conditions<T>): boolean {
  return conditionEntries(conditions).some(([, filter]) => isEmptyIn(filter));
}

/**
 * Whether a Where can match no row at all: an AND with an empty IN in it, or
 * an OR whose every branch has one. The adapter answers these with nothing,
 * without a request, which is also what the local adapter's matchesWhere()
 * gives them.
 */
export function matchesNothing<T>(where: Where<T> | undefined): boolean {
  if (!where) return false;
  if (hasEmptyIn(where.all ?? {})) return true;
  return Boolean(where.any && where.any.length > 0 && where.any.every((branch) => hasEmptyIn(branch)));
}

/**
 * A Where as PostgREST search params.
 *
 * The AND part becomes one parameter per column. The OR part becomes a
 * single `or=(...)`, and the two together are ANDed by PostgREST, which is
 * the same meaning matchesWhere() gives them locally.
 *
 * A Where that matches nothing is REFUSED rather than encoded without its
 * impossible condition: dropped from an update or a delete, that condition
 * would widen it to rows it was never meant to touch. Check matchesNothing
 * first. An OR branch that can never be true is simply left out, which
 * narrows the OR rather than widening it.
 */
export function encodeWhere<T>(where: Where<T> | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!where) return params;
  if (matchesNothing(where)) {
    throw new Error("This filter matches nothing; the caller answers it without a request.");
  }

  for (const [column, filter] of conditionEntries(where.all ?? {})) {
    params.append(toSnake(column), encodeComparison(normalizeFilter(filter), "param"));
  }

  const branches = (where.any ?? []).filter((conditions) => !hasEmptyIn(conditions));
  if (branches.length > 0) {
    const clauses = branches.map((conditions) => {
      const encoded = encodeConditionsForOr(conditions);
      // A group of more than one condition is itself an AND, and needs its
      // own parentheses so it is not flattened into the outer OR.
      return Object.keys(conditions).length > 1 ? `and(${encoded})` : encoded;
    });
    params.append("or", `(${clauses.join(",")})`);
  }

  return params;
}
