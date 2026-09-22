import { STATUS_LABELS } from "@/lib/enquiries";
import { findPackage } from "@/lib/menu";
import type { EnquiryStatus } from "@/lib/db/types";

/**
 * The shared way an enquiry is described, so the customer's page and the
 * owner's dashboard cannot drift into calling the same thing two names.
 */

/** Locale pinned so the wording cannot change with the server's locale. */
const LOCALE = "en-US";

export function formatEventDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatSentAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

export function packageLabel(slug: string): string {
  if (slug === "unsure") return "Not sure yet";
  return findPackage(slug)?.name ?? slug;
}

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "border-accent bg-accent/10 text-accent-strong",
  contacted: "border-line bg-raised text-ink-muted",
  confirmed: "border-accent-strong bg-accent text-on-accent",
  declined: "border-line bg-surface text-ink-subtle",
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** What each status means to the person who sent the enquiry. */
export const CUSTOMER_STATUS_HELP: Record<EnquiryStatus, string> = {
  new: "We have this and have not replied yet.",
  contacted: "We have been in touch, check your email.",
  confirmed: "Booked. It is in the diary.",
  declined: "We could not take this one on.",
};
