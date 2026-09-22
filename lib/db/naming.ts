/**
 * camelCase in TypeScript, snake_case in Postgres.
 *
 * Mechanical and therefore done once here, rather than by sixteen
 * hand-written row mappers that would each be a place to typo a column
 * name into a silently missing field. The conversion is total and
 * round-trips, which the tests check against the real column list.
 */

const toSnakeCache = new Map<string, string>();
const toCamelCache = new Map<string, string>();

export function toSnake(key: string): string {
  const cached = toSnakeCache.get(key);
  if (cached !== undefined) return cached;
  const converted = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  toSnakeCache.set(key, converted);
  return converted;
}

export function toCamel(key: string): string {
  const cached = toCamelCache.get(key);
  if (cached !== undefined) return cached;
  const converted = key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
  toCamelCache.set(key, converted);
  return converted;
}

/** An object with its keys renamed. Values are passed through untouched. */
function rename(
  value: Record<string, unknown>,
  convert: (key: string) => string
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) out[convert(key)] = entry;
  return out;
}

/** An application object to a database row. */
export function rowFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  return rename(record, toSnake);
}

/** A database row to an application object. */
export function recordFromRow<T>(row: Record<string, unknown>): T {
  return rename(row, toCamel) as T;
}
