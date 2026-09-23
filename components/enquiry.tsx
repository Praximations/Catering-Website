import { BanIcon, CheckCircleIcon, ChatIcon, SparklesIcon, type Icon } from "./icons";
import { Pill, type Tone } from "./ui";
import { STATUS_LABELS } from "@/lib/enquiries";
import { findPackage } from "@/lib/menu";
import type { ContactStatus, EnquiryStatus } from "@/lib/db/types";

/**
 * The shared way an enquiry is described, so the customer's pages and the
 * Owner Portal cannot drift into calling the same thing two names.
 */

/** Locale pinned so the wording cannot change with the server's locale. */
const LOCALE = "en-US";

export function formatEventDate(iso: string, style: "long" | "short" = "long"): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return style === "short"
    ? date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" })
    : date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function formatSentAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

/** "2:14 pm" today, "Tue" this week, "12 Mar" otherwise. For message lists. */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }
  if (days < 6) return date.toLocaleDateString(LOCALE, { weekday: "short" });
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

/** Whole days from today to an event date. Negative once it has passed. */
export function daysUntil(isoDate: string, now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const event = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.round((event - start) / 86_400_000);
}

/** "Today", "Tomorrow", "In 5 days", "3 days ago". */
export function relativeDay(isoDate: string, now = new Date()): string {
  const days = daysUntil(isoDate, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export function packageLabel(slug: string): string {
  if (slug === "unsure") return "Not sure yet";
  return findPackage(slug)?.name ?? slug;
}

const ENQUIRY_TONE: Record<EnquiryStatus, { tone: Tone; icon: Icon; live?: boolean }> = {
  new: { tone: "warning", icon: SparklesIcon, live: true },
  contacted: { tone: "info", icon: ChatIcon },
  confirmed: { tone: "accent", icon: CheckCircleIcon },
  declined: { tone: "muted", icon: BanIcon },
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  const { tone, icon } = ENQUIRY_TONE[status];
  return (
    <Pill tone={tone} icon={icon}>
      {STATUS_LABELS[status]}
    </Pill>
  );
}

const CONTACT_TONE: Record<ContactStatus, { tone: Tone; label: string }> = {
  new: { tone: "warning", label: "New" },
  read: { tone: "neutral", label: "Read" },
  replied: { tone: "accent", label: "Replied" },
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  const { tone, label } = CONTACT_TONE[status];
  return (
    <Pill tone={tone} dot live={status === "new"}>
      {label}
    </Pill>
  );
}

/** What each status means to the person who sent the enquiry. */
export const CUSTOMER_STATUS_HELP: Record<EnquiryStatus, string> = {
  new: "We have this and have not replied yet.",
  contacted: "We have been in touch, check your email.",
  confirmed: "Booked. It is in the diary.",
  declined: "We could not take this one on.",
};
