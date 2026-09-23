"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitEnquiryAction, type EnquiryFormState } from "@/app/actions/enquiries";
import { AddressField } from "@/components/address-field";
import { AlertIcon, CalendarIcon, CheckIcon, MapPinIcon, SendIcon, UserIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cardClass, cx, Field, inputClass, textareaClass } from "@/components/ui";

/**
 * The event request. Three short groups (the event, where, who) rather than
 * one long form, a package picker as chips rather than a dropdown, and the
 * venue on a live map. Everything typed survives a refusal.
 *
 * The `min` date arrives as a prop, so the server and the browser cannot
 * disagree about what "today" is and trip a hydration mismatch.
 */
export function QuoteForm({
  packages,
  minDate,
  defaults,
  mapsEnabled,
}: {
  packages: { slug: string; name: string }[];
  minDate: string;
  defaults: { name: string; email: string; packageSlug: string };
  mapsEnabled: boolean;
}) {
  const [state, formAction] = useActionState<EnquiryFormState | undefined, FormData>(submitEnquiryAction, undefined);

  if (state?.ok) {
    return (
      <section className={cx(cardClass, "flex flex-col items-center px-6 py-14 text-center")}>
        <span className="grid size-16 animate-pop place-items-center rounded-full bg-accent text-on-accent shadow-md">
          <CheckIcon className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Thank you, we have it</h2>
        <p className="mt-2 max-w-sm text-ink-muted">We will reply by email with a menu and a price, usually within a working day.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/menu" className={button("secondary")}>
            Browse the menus
          </Link>
          <Link href="/" className={button("ghost")}>
            Back home
          </Link>
        </div>
      </section>
    );
  }

  const errors = state?.fieldErrors ?? {};
  const values = state?.values ?? {};
  const options = [...packages, { slug: "unsure", name: "Not sure yet" }];
  const chosen = values.packageSlug ?? (defaults.packageSlug || "unsure");

  return (
    <form action={formAction} className="space-y-4" noValidate key={JSON.stringify(values)}>
      {state?.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : null}

      <fieldset className={cx(cardClass, "p-5 sm:p-6")}>
        <legend className="sr-only">The event</legend>
        <GroupTitle icon={CalendarIcon}>The event</GroupTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="eventDate" error={errors.eventDate}>
            <input id="eventDate" name="eventDate" type="date" min={minDate} defaultValue={values.eventDate ?? ""} className={inputClass} aria-invalid={Boolean(errors.eventDate) || undefined} />
          </Field>
          <Field label="Guests" htmlFor="guests" error={errors.guests}>
            <input id="guests" name="guests" type="number" inputMode="numeric" min={1} defaultValue={values.guests ?? ""} placeholder="Roughly" className={inputClass} aria-invalid={Boolean(errors.guests) || undefined} />
          </Field>
        </div>
        <div className="mt-4">
          <p id="package-label" className="text-sm font-medium text-ink">
            Menu
          </p>
          <div role="radiogroup" aria-labelledby="package-label" className="mt-2 flex flex-wrap gap-2">
            {options.map((option) => (
              <label
                key={option.slug}
                className="inline-flex cursor-pointer items-center rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink-muted shadow-xs transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-on-accent has-focus-visible:ring-4 has-focus-visible:ring-accent/20"
              >
                <input type="radio" name="packageSlug" value={option.slug} defaultChecked={chosen === option.slug} className="sr-only" />
                {option.name}
              </label>
            ))}
          </div>
          {errors.packageSlug ? <p className="mt-1.5 text-xs font-medium text-danger">{errors.packageSlug}</p> : null}
        </div>
      </fieldset>

      <fieldset className={cx(cardClass, "p-5 sm:p-6")}>
        <legend className="sr-only">Where</legend>
        <GroupTitle icon={MapPinIcon}>Where</GroupTitle>
        <Field label="Venue address" htmlFor="address" optional>
          <AddressField id="address" name="address" defaultValue={values.address ?? ""} placeholder="The venue, if you know it" mapsEnabled={mapsEnabled} />
        </Field>
      </fieldset>

      <fieldset className={cx(cardClass, "p-5 sm:p-6")}>
        <legend className="sr-only">Your details</legend>
        <GroupTitle icon={UserIcon}>You</GroupTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name}>
            <input id="name" name="name" autoComplete="name" defaultValue={values.name ?? defaults.name} className={inputClass} aria-invalid={Boolean(errors.name) || undefined} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email ?? defaults.email} className={inputClass} aria-invalid={Boolean(errors.email) || undefined} />
          </Field>
          <Field label="Phone" htmlFor="phone" optional className="sm:col-span-2">
            <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={values.phone ?? ""} className={inputClass} />
          </Field>
        </div>
        <Field label="Anything else" htmlFor="notes" optional className="mt-4" hint="Dietary needs, timing, budget, style of service.">
          <textarea id="notes" name="notes" rows={4} maxLength={2000} defaultValue={values.notes ?? ""} className={textareaClass} />
        </Field>
      </fieldset>

      <SubmitButton pendingLabel="Sending" className={cx(button("primary", "lg"), "w-full sm:w-auto")}>
        <SendIcon className="size-4" />
        Send request
      </SubmitButton>
    </form>
  );
}

function GroupTitle({ icon: IconGlyph, children }: { icon: typeof CalendarIcon; children: React.ReactNode }) {
  return (
    <p aria-hidden className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent">
        <IconGlyph className="size-3.5" />
      </span>
      {children}
    </p>
  );
}
