import { business } from "./business";

/**
 * Phone numbers, which customers type every way there is: "(555) 010-0000",
 * "555.010.0000", "+1 555 010 0000". Stored as typed, because that is what the
 * owner reads and calls; normalized only to compare and to text.
 */

export function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * The number in E.164, which is what an SMS provider needs, or null when it
 * cannot be told which country it is in. A bare ten digit number is read as
 * North American only when the business looks up addresses in the US or
 * Canada; anywhere else it needs its + prefix, because guessing a country
 * code is how a text reaches a stranger.
 */
export function toE164(phone: string, countryCodes: string = business.countryCodes): string | null {
  const trimmed = phone.trim();
  const digits = digitsOf(trimmed);
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;

  const northAmerica = countryCodes
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .some((code) => code === "us" || code === "ca");
  if (northAmerica && digits.length === 10) return `+1${digits}`;
  if (northAmerica && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * Whether two numbers are the same line. Compares the last ten digits, which
 * is what survives every way of writing a number with or without its country
 * code. Too short to be sure (under seven digits) is never a match.
 */
export function samePhone(a: string, b: string): boolean {
  const left = digitsOf(a);
  const right = digitsOf(b);
  if (left.length < 7 || right.length < 7) return false;
  return left.slice(-10) === right.slice(-10);
}

/** A tel: link from however the number is written. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
