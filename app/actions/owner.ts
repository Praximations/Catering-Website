"use server";

import { revalidatePath } from "next/cache";
import { clearProductOverride, setProductAvailability, setProductPrice } from "@/lib/catalog";
import { clearAnnouncement, setAnnouncement } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { flag, LIMITS, text } from "@/lib/validation";

/**
 * The Owner Portal's own writes: the site notice and the catalog overrides.
 *
 * Each re-checks the role, because a Server Action is a public POST endpoint
 * that can be called without the portal ever loading. The catalog goes
 * through lib/catalog.ts, whose guardrails (a price floor, a ceiling, and no
 * more than three times away from the listed price) apply to the owner too:
 * they catch a slipped decimal point, whoever typed it.
 */

async function ownerEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.role === "owner" ? user.email : null;
}

export interface OwnerFormState {
  ok?: boolean;
  error?: string;
  at?: number;
}

/* ---------------------------------- notice --------------------------------- */

export async function setAnnouncementAction(_previous: OwnerFormState, formData: FormData): Promise<OwnerFormState> {
  const by = await ownerEmail();
  if (!by) return { error: "Only the owner can do that." };
  const message = text(formData, "message", 200);
  if (message.length < 3) return { error: "Write a short notice first." };
  await setAnnouncement(message, by);
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}

export async function clearAnnouncementAction(): Promise<void> {
  if (!(await ownerEmail())) return;
  await clearAnnouncement();
  revalidatePath("/", "layout");
}

/* --------------------------------- catalog --------------------------------- */

const MAX_SLUG = 64;

export async function setAvailabilityAction(formData: FormData): Promise<void> {
  const by = await ownerEmail();
  if (!by) return;
  await setProductAvailability(text(formData, "slug", MAX_SLUG), flag(formData, "available"), by);
  revalidatePath("/", "layout");
}

export async function setPriceAction(_previous: OwnerFormState, formData: FormData): Promise<OwnerFormState> {
  const by = await ownerEmail();
  if (!by) return { error: "Only the owner can do that." };

  // Typed in major units ("12.50"), stored in minor. Parsed as a string, never
  // through a float multiply, so 12.10 cannot become 1209.
  const raw = text(formData, "price", 16).replace(/[^\d.]/g, "");
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) return { error: "Enter a price like 12.50." };
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));

  const result = await setProductPrice(text(formData, "slug", MAX_SLUG), minor, by);
  if (!result.ok) return { error: result.detail };
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}

export async function clearOverrideAction(formData: FormData): Promise<void> {
  if (!(await ownerEmail())) return;
  await clearProductOverride(text(formData, "slug", LIMITS.id));
  revalidatePath("/", "layout");
}
