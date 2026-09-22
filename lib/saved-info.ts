import { readData, updateData, type SavedInfoRecord } from "./store";

export const EMPTY_SAVED_INFO = {
  venues: [],
  addresses: [],
  guestPreferences: "",
  dietaryInformation: "",
  favoriteMenuSlugs: [],
} as const;

export async function getSavedInfo(userId: string): Promise<SavedInfoRecord | null> {
  return (await readData()).savedInfo.find((item) => item.userId === userId) ?? null;
}

export async function saveInfo(
  userId: string,
  input: Omit<SavedInfoRecord, "userId" | "updatedAt">
): Promise<SavedInfoRecord> {
  return updateData((data) => {
    const now = new Date().toISOString();
    const existing = data.savedInfo.find((item) => item.userId === userId);
    if (existing) {
      Object.assign(existing, input, { updatedAt: now });
      return { ...existing };
    }
    const record: SavedInfoRecord = { userId, ...input, updatedAt: now };
    data.savedInfo.push(record);
    return record;
  });
}
