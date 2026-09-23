"use server";

import { revalidatePath } from "next/cache";
import { clientAddress } from "@/lib/client-address";
import { createContact, CONTACT_STATUSES, updateContactStatus } from "@/lib/contacts";
import { bucketFor, checkRateLimit, PUBLIC_FORM_LIMIT } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { choice, isEmail, LIMITS, Problems, text } from "@/lib/validation";

export interface ContactFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was typed, so a refusal does not wipe the form. */
  values?: Record<string, string>;
}

export async function submitContactAction(
  _previous: ContactFormState | undefined,
  formData: FormData
): Promise<ContactFormState> {
  const name = text(formData, "name", LIMITS.name);
  const email = text(formData, "email", LIMITS.email);
  const phone = text(formData, "phone", LIMITS.phone);
  const subject = text(formData, "subject", LIMITS.subject);
  const message = text(formData, "message", LIMITS.message);
  const values = { name, email, phone, subject, message };

  const problems = new Problems();
  problems.when(name.length < 2, "name", "Enter your name.");
  problems.when(!isEmail(email), "email", "Enter a valid email.");
  problems.when(subject.length < 3, "subject", "Add a short subject.");
  problems.when(message.length < 10, "message", "Tell us a little more.");
  if (problems.any) return { fieldErrors: problems.fieldErrors, values };

  const limit = await checkRateLimit(
    bucketFor("contact", await clientAddress()),
    PUBLIC_FORM_LIMIT
  );
  if (!limit.allowed) {
    return { error: "We have had a lot of messages from here. Please try again later.", values };
  }

  const user = await getCurrentUser();
  await createContact({ userId: user?.id ?? null, name, email, phone, subject, message });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateContactStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return;

  const id = text(formData, "id", LIMITS.id);
  const status = choice(formData, "status", CONTACT_STATUSES);
  if (!id || !status) return;

  await updateContactStatus(id, status);
  revalidatePath("/admin", "layout");
}
