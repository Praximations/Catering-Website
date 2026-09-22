import { db } from "./db";
import type { SavedInfoRecord } from "./db/types";

export const EMPTY_SAVED_INFO = {
  venues: [],
  addresses: [],
  guestPreferences: "",
  dietaryInformation: "",
  favoriteMenuSlugs: [],
} as const;

export async function getSavedInfo(userId: string): Promise<SavedInfoRecord | null> {
  return db.savedInfo.findOne({ all: { userId } });
}

export async function saveInfo(
  userId: string,
  input: Omit<SavedInfoRecord, "userId" | "updatedAt">
): Promise<SavedInfoRecord> {
  // One row per account, keyed by the account, so this is an upsert rather
  // than a find-then-insert-or-update.
  return db.savedInfo.upsert({
    userId,
    ...input,
    updatedAt: new Date().toISOString(),
  });
}
