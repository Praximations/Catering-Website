import { getAnnouncement } from "@/lib/settings";

/**
 * The notice across the top of the site.
 *
 * Rendered on the server from the database, so whatever put it there (the
 * owner, or Praxi with permission) it is one line of stored text and never
 * markup. React escapes it, so a notice cannot inject anything into the
 * page it sits on.
 */
export async function AnnouncementBanner() {
  const announcement = await getAnnouncement();
  if (!announcement) return null;

  return (
    <div className="border-b border-highlight/20 bg-highlight-soft px-6 py-2.5 text-center text-sm font-medium text-highlight">
      {announcement.message}
    </div>
  );
}
