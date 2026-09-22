import { db } from "./db";
import type { ContactRecord, ContactStatus } from "./db/types";

export const CONTACT_STATUSES: ContactStatus[] = ["new", "read", "replied"];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
};

export async function createContact(input: {
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<ContactRecord> {
  const now = new Date().toISOString();
  return db.contacts.insert({
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
}

export async function listContacts(): Promise<ContactRecord[]> {
  return db.contacts.find(undefined, { orderBy: "createdAt", direction: "desc" });
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<boolean> {
  return (await db.contacts.update({ all: { id } }, { status })).length > 0;
}

export async function contactCounts(): Promise<{ total: number; new: number }> {
  const [total, unread] = await Promise.all([
    db.contacts.count(),
    db.contacts.count({ all: { status: "new" } }),
  ]);
  return { total, new: unread };
}
