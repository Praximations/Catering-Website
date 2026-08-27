import {
  newId,
  readData,
  updateData,
  type EnquiryRecord,
  type EnquiryStatus,
} from "./store";

/**
 * Enquiries: somebody asking whether you can feed their event.
 *
 * This is the only thing the site actually collects, so it is the thing
 * both dashboards are built around. A customer sees their own; the owner
 * sees all of them and can move each one along.
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
  const enquiry: EnquiryRecord = {
    id: newId(),
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
  };

  await updateData((data) => {
    data.enquiries.push(enquiry);
  });
  return forCustomer(enquiry);
}

/** Every enquiry, newest first. Owner only; the route is what enforces that. */
export async function listAllEnquiries(): Promise<EnquiryRecord[]> {
  const data = await readData();
  return [...data.enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * One person's enquiries. Matched by account id AND by email address, so
 * an enquiry sent before signing up still appears once they do.
 */
export async function listEnquiriesForUser(
  userId: string,
  email: string
): Promise<CustomerEnquiry[]> {
  const data = await readData();
  const address = email.toLowerCase();
  return data.enquiries
    .filter((e) => e.userId === userId || e.email === address)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(forCustomer);
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; ownerNotes?: string }
): Promise<boolean> {
  return updateData((data) => {
    const enquiry = data.enquiries.find((e) => e.id === id);
    if (!enquiry) return false;
    if (patch.status) enquiry.status = patch.status;
    if (patch.ownerNotes !== undefined) enquiry.ownerNotes = patch.ownerNotes.trim();
    enquiry.updatedAt = new Date().toISOString();
    return true;
  });
}

/** Head counts for the dashboard. Real zeros, never a placeholder number. */
export async function enquiryCounts(): Promise<Record<EnquiryStatus | "total", number>> {
  const data = await readData();
  const counts = { total: data.enquiries.length } as Record<EnquiryStatus | "total", number>;
  for (const status of ENQUIRY_STATUSES) {
    counts[status] = data.enquiries.filter((e) => e.status === status).length;
  }
  return counts;
}
