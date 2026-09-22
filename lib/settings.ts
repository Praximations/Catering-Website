import { db } from "./db";
import type { AnnouncementRecord } from "./db/types";

/**
 * Small single-value site state, such as the notice across the top.
 *
 * A key/value table rather than a column per setting, because these come and
 * go with the copy rather than with the data model. Every reader validates
 * the shape it expects: the column is jsonb, so what comes back is whatever
 * was last written, which is not a promise about its type.
 */

const ANNOUNCEMENT = "announcement";

function asAnnouncement(value: unknown): AnnouncementRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AnnouncementRecord>;
  if (typeof candidate.message !== "string" || !candidate.message) return null;
  return {
    message: candidate.message,
    setBy: typeof candidate.setBy === "string" ? candidate.setBy : "",
    setAt: typeof candidate.setAt === "string" ? candidate.setAt : "",
  };
}

export async function getAnnouncement(): Promise<AnnouncementRecord | null> {
  const row = await db.settings.findOne({ all: { key: ANNOUNCEMENT } });
  return row ? asAnnouncement(row.value) : null;
}

export async function setAnnouncement(message: string, setBy: string): Promise<void> {
  await db.settings.upsert({
    key: ANNOUNCEMENT,
    value: { message, setBy, setAt: new Date().toISOString() } satisfies AnnouncementRecord,
    updatedAt: new Date().toISOString(),
  });
}

/** Returns whether there was one to clear, so the caller can say so. */
export async function clearAnnouncement(): Promise<boolean> {
  return (await db.settings.remove({ all: { key: ANNOUNCEMENT } })) > 0;
}
