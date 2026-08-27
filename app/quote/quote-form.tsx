"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitEnquiryAction, type EnquiryFormState } from "@/app/actions/enquiries";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import type { MenuPackage } from "@/lib/menu";

/**
 * The enquiry form.
 *
 * useActionState gives back the action's returned state, so a validation
 * error lands next to the field that caused it instead of throwing away
 * everything the person typed. Note the action's own signature: previous
 * state first, form data second.
 *
 * The `min` date arrives as a prop rather than being computed here, so the
 * server and the browser cannot disagree about what "today" is and trip a
 * hydration mismatch.
 */
export function QuoteForm({
  packages,
  minDate,
  defaults,
}: {
  packages: MenuPackage[];
  minDate: string;
  defaults: { name: string; email: string };
}) {
  const [state, formAction] = useActionState<EnquiryFormState | undefined, FormData>(
    submitEnquiryAction,
    undefined
  );

  if (state?.ok) {
    return (
      <Alert tone="success" title="Thank you, we have it.">
        <p>
          We read every enquiry and reply by email, usually within a day or two. If it is urgent,
          call us.
        </p>
        <p className="mt-3">
          <Link href="/account" className="text-accent-strong hover:underline">
            Sign in to follow where it stands
          </Link>{" "}
          or{" "}
          <Link href="/menu" className="text-accent-strong hover:underline">
            have another look at the menu
          </Link>
          .
        </p>
      </Alert>
    );
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={defaults.name}
            className={inputClass}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaults.email}
            className={inputClass}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label="Phone" htmlFor="phone" hint="Optional, but it speeds things up." error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>

        <Field label="Date of the event" htmlFor="eventDate" error={errors.eventDate}>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            min={minDate}
            className={inputClass}
            aria-invalid={Boolean(errors.eventDate)}
          />
        </Field>

        <Field label="How many people" htmlFor="guests" hint="A rough number is fine." error={errors.guests}>
          <input
            id="guests"
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            className={inputClass}
            aria-invalid={Boolean(errors.guests)}
          />
        </Field>

        <Field label="What kind of food" htmlFor="packageSlug" error={errors.packageSlug}>
          <select id="packageSlug" name="packageSlug" defaultValue="unsure" className={inputClass}>
            <option value="unsure">Not sure yet, help us choose</option>
            {packages.map((pkg) => (
              <option key={pkg.slug} value={pkg.slug}>
                {pkg.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Anything else"
        htmlFor="notes"
        hint="Allergies, the venue, what the day is for, whatever matters."
        error={errors.notes}
      >
        <textarea id="notes" name="notes" rows={5} maxLength={2000} className={inputClass} />
      </Field>

      <SubmitButton pendingLabel="Sending...">Send enquiry</SubmitButton>
    </form>
  );
}
