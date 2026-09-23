"use client";

import { useActionState, useEffect, useState } from "react";
import { saveCustomerInfoAction, type SaveDetailsState } from "@/app/actions/account";
import { CheckIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, Field, textareaClass } from "@/components/ui";

/**
 * The saved details, with a "Saved" that appears for a moment after saving so
 * there is no doubt it worked. Fields are uncontrolled and keep what was typed.
 */
export function SavedDetailsForm({
  saved,
  menus,
}: {
  saved: {
    venues: string;
    addresses: string;
    guestPreferences: string;
    dietaryInformation: string;
    favoriteMenuSlugs: string[];
  };
  menus: { slug: string; name: string }[];
}) {
  const [state, action] = useActionState<SaveDetailsState, FormData>(saveCustomerInfoAction, {});
  const [dismissedAt, setDismissedAt] = useState<number | undefined>(undefined);
  const justSaved = Boolean(state.ok && state.at && state.at !== dismissedAt);

  useEffect(() => {
    if (!state.ok || !state.at) return;
    const at = state.at;
    const timer = window.setTimeout(() => setDismissedAt(at), 2200);
    return () => window.clearTimeout(timer);
  }, [state.ok, state.at]);

  return (
    <form action={action} className={cx(cardClass, "space-y-5 p-5 sm:p-6")}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Delivery addresses" htmlFor="addresses" hint="One per line.">
          <textarea id="addresses" name="addresses" rows={3} defaultValue={saved.addresses} className={textareaClass} />
        </Field>
        <Field label="Venues" htmlFor="venues" hint="One per line.">
          <textarea id="venues" name="venues" rows={3} defaultValue={saved.venues} className={textareaClass} />
        </Field>
        <Field label="Dietary needs" htmlFor="dietaryInformation" optional>
          <textarea
            id="dietaryInformation"
            name="dietaryInformation"
            rows={3}
            defaultValue={saved.dietaryInformation}
            placeholder="Allergies and preferences"
            className={textareaClass}
          />
        </Field>
        <Field label="Guest preferences" htmlFor="guestPreferences" optional>
          <textarea
            id="guestPreferences"
            name="guestPreferences"
            rows={3}
            defaultValue={saved.guestPreferences}
            placeholder="Service style, favourites, timing"
            className={textareaClass}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Menus you like</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {menus.map((item) => (
            <label
              key={item.slug}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors has-checked:border-accent/40 has-checked:bg-accent-soft has-checked:text-accent-strong"
            >
              <input
                type="checkbox"
                name="favoriteMenuSlugs"
                value={item.slug}
                defaultChecked={saved.favoriteMenuSlugs.includes(item.slug)}
                className="sr-only"
              />
              {item.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Saving" className={button("primary")}>
          Save details
        </SubmitButton>
        {justSaved ? (
          <span role="status" className="inline-flex animate-fade-in items-center gap-1.5 text-sm font-medium text-accent">
            <CheckIcon className="size-4 animate-pop" />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
