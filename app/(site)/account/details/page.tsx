import type { Metadata } from "next";
import { logoutEverywhereAction } from "@/app/actions/auth";
import { LockIcon, LogOutIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, KeyValues, Section } from "@/components/ui";
import { menu } from "@/lib/menu";
import { getSavedInfo } from "@/lib/saved-info";
import { requireUser } from "@/lib/session";
import { SavedDetailsForm } from "./saved-details-form";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false, follow: false },
};

/** What we keep so you do not have to type it again, and your sessions. */
export default async function AccountDetails() {
  const user = await requireUser();
  const saved = await getSavedInfo(user.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <Section title="Saved details" description="Offered at checkout so the next order is quicker.">
        <SavedDetailsForm
          saved={{
            venues: saved?.venues.join("\n") ?? "",
            addresses: saved?.addresses.join("\n") ?? "",
            guestPreferences: saved?.guestPreferences ?? "",
            dietaryInformation: saved?.dietaryInformation ?? "",
            favoriteMenuSlugs: saved?.favoriteMenuSlugs ?? [],
          }}
          menus={menu.map((item) => ({ slug: item.slug, name: item.name }))}
        />
      </Section>

      <div className="space-y-6">
        <Section title="Account">
          <div className={cx(cardClass, "p-5")}>
            <KeyValues
              items={[
                { label: "Name", value: user.name },
                { label: "Email", value: <span className="break-all">{user.email}</span> },
              ]}
            />
          </div>
        </Section>

        <Section title="Security">
          <div className={cx(cardClass, "p-5")}>
            <p className="flex items-start gap-2 text-sm leading-6 text-ink-muted">
              <LockIcon className="mt-1 size-4 shrink-0 text-ink-subtle" />
              Signed in on a shared computer? This ends every session on every device at once.
            </p>
            <form action={logoutEverywhereAction} className="mt-4">
              <SubmitButton pendingLabel="Signing out" className={cx(button("secondary"), "w-full")}>
                <LogOutIcon className="size-4" />
                Sign out everywhere
              </SubmitButton>
            </form>
          </div>
        </Section>
      </div>
    </div>
  );
}
