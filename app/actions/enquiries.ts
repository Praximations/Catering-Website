"use server";

import { revalidatePath } from "next/cache";
import { createEnquiry, ENQUIRY_STATUSES, updateEnquiry } from "@/lib/enquiries";
import { menu } from "@/lib/menu";
import { praxiEnquirySubmitted } from "@/lib/praxi";
import { getCurrentUser } from "@/lib/session";
import type { EnquiryStatus } from "@/lib/store";

/**
 * The enquiry form, and the owner moving an enquiry along.
 *
 * The public form accepts anonymous submissions on purpose: making
 * somebody create an account before they can ask a question is how a
 * catering business loses the job. If they happen to be signed in, the
 * enquiry is linked to their account so it shows up on their page.
 */

export interface EnquiryFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES = 2000;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Midnight today, so "is this date in the past" ignores the clock. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function submitEnquiryAction(
  _prevState: EnquiryFormState | undefined,
  formData: FormData
): Promise<EnquiryFormState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const eventDate = text(formData, "eventDate");
  const guestsText = text(formData, "guests");
  const packageSlug = text(formData, "packageSlug");
  const notes = text(formData, "notes").slice(0, MAX_NOTES);

  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) fieldErrors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "We need an email address to reply to.";

  if (!DATE_RE.test(eventDate)) {
    fieldErrors.eventDate = "Pick the date of your event.";
  } else {
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.eventDate = "That is not a real date.";
    } else if (parsed < startOfToday()) {
      fieldErrors.eventDate = "That date has already passed.";
    }
  }

  const guests = Number.parseInt(guestsText, 10);
  if (!Number.isInteger(guests) || guests < 1) {
    fieldErrors.guests = "Roughly how many people are coming?";
  } else if (guests > 5000) {
    fieldErrors.guests = "Please call us for an event that size.";
  }

  const validPackages = new Set([...menu.map((p) => p.slug), "unsure"]);
  if (!validPackages.has(packageSlug)) {
    fieldErrors.packageSlug = "Choose one of the options.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Under the minimum or inside the lead time is allowed, not blocked: it
  // is the kitchen's call, not the form's. The page says so up front, and
  // the owner sees the numbers on the dashboard.
  const user = await getCurrentUser();

  const enquiry = await createEnquiry({
    userId: user?.id ?? null,
    name,
    email,
    phone,
    eventDate,
    guests,
    packageSlug,
    notes,
  });

  // Praxi sees the lead. Fail soft: the enquiry is already saved.
  await praxiEnquirySubmitted(enquiry);

  // So the customer's own page shows it immediately after submitting.
  revalidatePath("/account");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateEnquiryAction(formData: FormData): Promise<void> {
  // Authorize inside the action. The dashboard already checks, but a
  // Server Action can be called without ever loading that page.
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return;

  const id = text(formData, "id");
  const status = text(formData, "status") as EnquiryStatus;
  if (!id || !ENQUIRY_STATUSES.includes(status)) return;

  const ownerNotes = formData.has("ownerNotes")
    ? text(formData, "ownerNotes").slice(0, MAX_NOTES)
    : undefined;

  await updateEnquiry(id, { status, ...(ownerNotes === undefined ? {} : { ownerNotes }) });
  revalidatePath("/admin");
  revalidatePath("/account");
}
