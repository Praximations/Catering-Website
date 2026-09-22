import { counts, db } from "./db";
import type { EnquiryRecord, EnquiryStatus } from "./db/types";

/**
 * Enquiries: somebody asking whether you can feed their event.
 *
 * A customer sees their own; the owner sees all of them and can move each
 * one along.
 */

export const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "contacted", "confirmed", "declined"];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  declined: "Declined",
};

/** What a customer may see about their own enquiry. Owner notes are not in it. */
export type CustomerEnquiry = Omit<EnquiryRecord, "ownerNotes">;

function forCustomer(enquiry: EnquiryRecord): CustomerEnquiry {
  // Built by hand rather than by spreading and deleting: a new private
  // field added to EnquiryRecord should NOT reach a customer by default.
  return {
    id: enquiry.id,
    userId: enquiry.userId,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    eventDate: enquiry.eventDate,
    guests: enquiry.guests,
    packageSlug: enquiry.packageSlug,
    notes: enquiry.notes,
    status: enquiry.status,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
}

export async function createEnquiry(input: {
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  guests: number;
  packageSlug: string;
  notes: string;
}): Promise<CustomerEnquiry> {
  const now = new Date().toISOString();
  const created = await db.enquiries.insert({
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    eventDate: input.eventDate,
    guests: input.guests,
    packageSlug: input.packageSlug,
    notes: input.notes.trim(),
    status: "new",
    ownerNotes: "",
    createdAt: now,
    updatedAt: now,
  });
  return forCustomer(created);
}

/** Every enquiry, newest first. Owner only; the route is what enforces that. */
export async function listAllEnquiries(): Promise<EnquiryRecord[]> {
  return db.enquiries.find(undefined, { orderBy: "createdAt", direction: "desc" });
}

/**
 * One person's enquiries. Matched by account id OR by email address, so an
 * enquiry sent before signing up still appears once they do.
 */
export async function listEnquiriesForUser(
  userId: string,
  email: string
): Promise<CustomerEnquiry[]> {
  const rows = await db.enquiries.find(
    { any: [{ userId }, { email: email.toLowerCase() }] },
    { orderBy: "createdAt", direction: "desc" }
  );
  return rows.map(forCustomer);
}

export async function findEnquiryById(id: string): Promise<EnquiryRecord | null> {
  if (!id) return null;
  return db.enquiries.findOne({ all: { id } });
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; ownerNotes?: string }
): Promise<boolean> {
  const changes: Partial<EnquiryRecord> = {};
  if (patch.status) changes.status = patch.status;
  if (patch.ownerNotes !== undefined) changes.ownerNotes = patch.ownerNotes.trim();
  if (Object.keys(changes).length === 0) return false;

  return (await db.enquiries.update({ all: { id } }, changes)).length > 0;
}

/**
 * Head counts for the dashboard. Real zeros, never a placeholder number,
 * and counted by Postgres rather than by reading every row.
 */
export async function enquiryCounts(): Promise<Record<EnquiryStatus | "total", number>> {
  const result = {
    total: 0,
    new: 0,
    contacted: 0,
    confirmed: 0,
    declined: 0,
  } satisfies Record<EnquiryStatus | "total", number>;

  for (const row of await counts.enquiries()) {
    if (!(row.status in result)) continue;
    result[row.status as EnquiryStatus] = row.count;
    result.total += row.count;
  }
  return result;
}
