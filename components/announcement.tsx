import { BellIcon } from "./icons";
import { getAnnouncement } from "@/lib/settings";

/**
 * The notice across the top of the site.
 *
 * Rendered on the server from the database, so whatever put it there (the
 * owner, or Praxi with permission) it is one line of stored text and never
 * markup. React escapes it, so a notice cannot inject anything into the page.
 */
export async function AnnouncementBanner() {
  const announcement = await getAnnouncement();
  if (!announcement) return null;

  return (
    <div className="px-3 pt-3 sm:px-4">
      <p className="mx-auto flex max-w-6xl animate-fade-in items-center justify-center gap-2 rounded-xl bg-highlight-soft px-4 py-2 text-center text-sm font-medium text-highlight">
        <BellIcon className="size-4 shrink-0" />
        {announcement.message}
      </p>
    </div>
  );
}
