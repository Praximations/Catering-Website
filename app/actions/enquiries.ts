"use server";

import { revalidatePath } from "next/cache";
import { createEnquiry, ENQUIRY_STATUSES, updateEnquiry } from "@/lib/enquiries";
import { menu } from "@/lib/menu";
import { praxiEnquirySubmitted } from "@/lib/praxi";
import { getCurrentUser } from "@/lib/session";
import {
  checkEventDate,
  checkGuests,
  choice,
  integer,
  isEmail,
  LIMITS,
  MAX_GUESTS,
  Problems,
  text,
} from "@/lib/validation";

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

export async function submitEnquiryAction(
  _prevState: EnquiryFormState | undefined,
  formData: FormData
): Promise<EnquiryFormState> {
  const name = text(formData, "name", LIMITS.name);
  const email = text(formData, "email", LIMITS.email);
  const phone = text(formData, "phone", LIMITS.phone);
  const eventDate = text(formData, "eventDate", 10);
  const packageSlug = text(formData, "packageSlug", 64);
  const notes = text(formData, "notes", LIMITS.notes);
  const guests = integer(formData, "guests");

  const problems = new Problems();
  problems.when(name.length < 2, "name", "Please tell us your name.");
  problems.when(!isEmail(email), "email", "We need an email address to reply to.");

  switch (checkEventDate(eventDate)) {
    case "missing":
    case "malformed":
      problems.add("eventDate", "Pick the date of your event.");
      break;
    case "past":
      problems.add("eventDate", "That date has already passed.");
      break;
  }

  switch (checkGuests(guests)) {
    case "missing":
      problems.add("guests", "Roughly how many people are coming?");
      break;
    case "too_many":
      problems.add("guests", `Please call us for an event over ${MAX_GUESTS} people.`);
      break;
  }

  const validPackages = [...menu.map((p) => p.slug), "unsure"];
  if (!validPackages.includes(packageSlug)) {
    problems.add("packageSlug", "Choose one of the options.");
  }

  // `guests === null` is already reported above; repeating it here is what
  // narrows the type without a cast the compiler would simply believe.
  if (problems.any || guests === null) return { fieldErrors: problems.fieldErrors };

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

  const id = text(formData, "id", LIMITS.id);
  const status = choice(formData, "status", ENQUIRY_STATUSES);
  if (!id || !status) return;

  const ownerNotes = formData.has("ownerNotes")
    ? text(formData, "ownerNotes", LIMITS.notes)
    : undefined;

  await updateEnquiry(id, { status, ...(ownerNotes === undefined ? {} : { ownerNotes }) });
  revalidatePath("/admin");
  revalidatePath("/account");
}
