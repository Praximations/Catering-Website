import {
  newId,
  readData,
  updateData,
  type ContactRecord,
  type ContactStatus,
} from "./store";

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
  const contact: ContactRecord = {
    id: newId(),
    userId: input.userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  await updateData((data) => data.contacts.push(contact));
  return contact;
}

export async function listContacts(): Promise<ContactRecord[]> {
  return [...(await readData()).contacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<boolean> {
  return updateData((data) => {
    const contact = data.contacts.find((item) => item.id === id);
    if (!contact) return false;
    contact.status = status;
    contact.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function contactCounts(): Promise<{ total: number; new: number }> {
  const contacts = (await readData()).contacts;
  return { total: contacts.length, new: contacts.filter((item) => item.status === "new").length };
}
