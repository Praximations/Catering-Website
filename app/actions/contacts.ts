"use server";

import { revalidatePath } from "next/cache";
import { createContact, CONTACT_STATUSES, updateContactStatus } from "@/lib/contacts";
import { getCurrentUser } from "@/lib/session";
import type { ContactStatus } from "@/lib/store";

export interface ContactFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitContactAction(
  _previous: ContactFormState | undefined,
  formData: FormData
): Promise<ContactFormState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const subject = text(formData, "subject");
  const message = text(formData, "message");
  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) fieldErrors.name = "Enter your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email.";
  if (subject.length < 3) fieldErrors.subject = "Add a short subject.";
  if (message.length < 10) fieldErrors.message = "Tell us a little more.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const user = await getCurrentUser();
  await createContact({
    userId: user?.id ?? null,
    name,
    email,
    phone,
    subject: subject.slice(0, 120),
    message: message.slice(0, 2000),
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateContactStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return;
  const id = text(formData, "id");
  const status = text(formData, "status") as ContactStatus;
  if (!id || !CONTACT_STATUSES.includes(status)) return;
  await updateContactStatus(id, status);
  revalidatePath("/admin");
}
