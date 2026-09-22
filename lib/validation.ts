/**
 * Reading untrusted form input, in one place.
 *
 * Every Server Action is a public POST endpoint, so each one has to treat
 * its FormData as hostile: fields that are absent, fields sent twice,
 * fields holding a File instead of a string, numbers that are not numbers,
 * and free text long enough to be a denial of service against the
 * database rather than a message.
 *
 * Before this module each action carried its own copy of `text()`, its own
 * email regex and its own `startOfToday()`. Four copies means four places
 * to fix a hole, and the copies had already drifted: two of the four
 * capped notes at 2000 characters and two did not cap them at all.
 *
 * THE CAPS ARE A SECURITY CONTROL, not tidiness. A field read without one
 * is an unbounded write, so `text()` requires a maximum and truncates to
 * it. Nothing here throws: a validator's job is to report, and the caller
 * decides whether a bad field is a field error or a silent refusal.
 */

/* --------------------------------- limits --------------------------------- */

/**
 * One table of lengths for the whole app, so a limit is chosen once and
 * every form that takes the same kind of value agrees on it.
 */
export const LIMITS = {
  name: 120,
  email: 254, // The longest address SMTP will carry, RFC 5321.
  phone: 40,
  subject: 120,
  address: 400,
  notes: 2000,
  message: 2000,
  /**
   * Passwords are hashed with scrypt, which is deliberately expensive. An
   * unbounded password is therefore a way to spend the server's CPU, so
   * the cap is as much a rate limit as a validation rule. Long enough that
   * no real passphrase or password manager output hits it.
   */
  password: 200,
  /** A single line of a free-text list, such as a saved venue. */
  line: 200,
  /** Identifiers we generate: a UUID, a token, a reference. */
  id: 100,
} as const;

/** Nobody is catering for more people than this without a phone call. */
export const MAX_GUESTS = 5000;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Deliberately permissive. Anything stricter rejects addresses that are
 * genuinely valid, and the only real proof an address works is sending
 * mail to it. This catches a typo, not a liar.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------- field readers ----------------------------- */

/**
 * One trimmed string, never longer than `max`.
 *
 * A FormData value can be a File, and `String(file)` would quietly store
 * "[object File]", so anything that is not a string reads as empty.
 */
export function text(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * A password, untrimmed apart from the length cap.
 *
 * Trimming a password changes it: a trailing space is a character the
 * person typed and the one they will type again next time.
 */
export function password(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, LIMITS.password) : "";
}

/** An integer, or null when the field is missing or is not one. */
export function integer(formData: FormData, key: string): number | null {
  const raw = text(formData, key, 32);
  if (!/^-?\d+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** A checkbox: present and not "false" means on. */
export function flag(formData: FormData, key: string): boolean {
  const raw = text(formData, key, 16).toLowerCase();
  return raw !== "" && raw !== "false" && raw !== "0" && raw !== "off";
}

/**
 * A repeated field as a list of trimmed lines, bounded in both directions:
 * `maxLines` entries, each at most `LIMITS.line` characters.
 */
export function lines(value: string, maxLines: number): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().slice(0, LIMITS.line))
    .filter(Boolean)
    .slice(0, maxLines);
}

/**
 * One value out of a known set, or null.
 *
 * Takes the allowed values rather than a type assertion, because
 * `formData.get("status") as OrderStatus` is a lie the compiler believes
 * and an attacker does not have to honour.
 */
export function choice<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[]
): T | null {
  const raw = text(formData, key, 64);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/* -------------------------------- predicates ------------------------------- */

export function isEmail(value: string): boolean {
  return value.length <= LIMITS.email && EMAIL_RE.test(value);
}

/** Midnight today, so "has this date passed" ignores the time of day. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export type DateProblem = "missing" | "malformed" | "past";

/**
 * An ISO calendar date that has not already gone by.
 *
 * The regex alone is not enough: "2026-02-31" matches it and is not a
 * date. Parsing at local midnight and reading the parts back is what
 * catches a day that rolled into the next month.
 */
export function checkEventDate(value: string): DateProblem | null {
  if (!value) return "missing";
  if (!ISO_DATE_RE.test(value)) return "malformed";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "malformed";

  const [year, month, day] = value.split("-").map(Number);
  const rolledOver =
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day;
  if (rolledOver) return "malformed";

  return parsed < startOfToday() ? "past" : null;
}

export type GuestsProblem = "missing" | "too_many";

export function checkGuests(value: number | null): GuestsProblem | null {
  if (value === null || value < 1) return "missing";
  return value > MAX_GUESTS ? "too_many" : null;
}

/* ------------------------------ error gathering ---------------------------- */

export type FieldErrors = Record<string, string>;

/**
 * Collects one message per field.
 *
 * `add` keeps the FIRST message for a field on purpose: the first check to
 * fail is the most specific thing wrong with it, and a field can only show
 * one message anyway.
 */
export class Problems {
  private readonly errors: FieldErrors = {};

  add(field: string, message: string): this {
    if (!(field in this.errors)) this.errors[field] = message;
    return this;
  }

  /** Adds `message` only when `condition` is true. Reads as a sentence. */
  when(condition: boolean, field: string, message: string): this {
    if (condition) this.add(field, message);
    return this;
  }

  get any(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  get fieldErrors(): FieldErrors {
    return { ...this.errors };
  }
}
