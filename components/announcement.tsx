import { readData } from "@/lib/store";

/**
 * The notice across the top of the site.
 *
 * Rendered on the server from the database, so whatever put it there (the
 * owner, or Praxi with permission) it is one line of stored text and never
 * markup. React escapes it, so a notice cannot inject anything into the
 * page it sits on.
 */
export async function AnnouncementBanner() {
  const data = await readData();
  if (!data.announcement) return null;

  return (
    <div className="border-b border-accent bg-accent/10 px-6 py-2.5 text-center text-sm text-accent-strong">
      {data.announcement.message}
    </div>
  );
}
