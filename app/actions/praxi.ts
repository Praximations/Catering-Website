"use server";

import { revalidatePath } from "next/cache";
import { approveRequest, denyRequest } from "@/lib/control";
import { mintControlKey, revokeControlKey } from "@/lib/controlKeys";
import { setMode, resetPermissions } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import type { PermissionMode } from "@/lib/store";

/**
 * The owner's controls over Praxi: what it may do, which keys it holds,
 * and what to do with anything waiting for approval.
 *
 * Every action re-checks that the caller is the owner. These are public
 * POST endpoints like any Server Action, and this particular set decides
 * what an assistant is allowed to do to the business, so the check being
 * here as well as on the page is not belt and braces, it is the belt.
 */

async function requireOwnerActor(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") return null;
  return user.email;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function setPermissionAction(formData: FormData): Promise<void> {
  if (!(await requireOwnerActor())) return;

  const mode = text(formData, "mode") as PermissionMode;
  await setMode(text(formData, "capability"), mode);
  revalidatePath("/admin/praxi");
}

export async function resetPermissionsAction(): Promise<void> {
  if (!(await requireOwnerActor())) return;
  await resetPermissions();
  revalidatePath("/admin/praxi");
}

export interface KeyState {
  /** Shown exactly once, right after minting. Never stored in plain text. */
  token?: string;
  error?: string;
}

export async function mintKeyAction(
  _prevState: KeyState | undefined,
  formData: FormData
): Promise<KeyState> {
  if (!(await requireOwnerActor())) return { error: "Only the owner can do that." };

  const { token } = await mintControlKey(text(formData, "label") || "Praxi");
  revalidatePath("/admin/praxi");
  return { token };
}

export async function revokeKeyAction(formData: FormData): Promise<void> {
  if (!(await requireOwnerActor())) return;
  await revokeControlKey(text(formData, "id"));
  revalidatePath("/admin/praxi");
}

export async function approveAction(formData: FormData): Promise<void> {
  const actor = await requireOwnerActor();
  if (!actor) return;

  await approveRequest(text(formData, "id"), actor);
  // The approved action may have changed an order, a price, or the site
  // notice, so refresh everything rather than guessing which.
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/praxi");
}

export async function denyAction(formData: FormData): Promise<void> {
  const actor = await requireOwnerActor();
  if (!actor) return;

  await denyRequest(text(formData, "id"), actor);
  revalidatePath("/admin");
  revalidatePath("/admin/praxi");
}
