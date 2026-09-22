"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState } from "@/app/actions/orders";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

/**
 * Checkout. The form collects WHERE and WHEN; the what and the price come
 * from the cart on the server, which is why no price is submitted here.
 */
export function CheckoutForm({
  minDate,
  defaults,
  total,
}: {
  minDate: string;
  defaults: { name: string; email: string };
  total: string;
}) {
  // A successful checkout never comes back here: the action redirects to
  // the confirmation page. Anything in state is a problem to show.
  const [state, formAction] = useActionState<CheckoutState | undefined, FormData>(
    checkoutAction,
    undefined
  );

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

        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            aria-invalid={Boolean(errors.phone)}
          />
        </Field>

        <Field label="Date you need it" htmlFor="eventDate" error={errors.eventDate}>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            min={minDate}
            className={inputClass}
            aria-invalid={Boolean(errors.eventDate)}
          />
        </Field>

        <Field
          label="How many people"
          htmlFor="guests"
          error={errors.guests}
        >
          <input
            id="guests"
            name="guests"
            type="number"
            min={1}
            className={inputClass}
            aria-invalid={Boolean(errors.guests)}
          />
        </Field>
      </div>

      <Field label="Where should we bring it" htmlFor="address" error={errors.address}>
        <input
          id="address"
          name="address"
          type="text"
          autoComplete="street-address"
          className={inputClass}
          aria-invalid={Boolean(errors.address)}
        />
      </Field>

      <Field
        label="Order notes"
        htmlFor="notes"
        hint="Add allergies, timing, or delivery instructions."
      >
        <textarea id="notes" name="notes" rows={4} maxLength={2000} className={inputClass} />
      </Field>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <SubmitButton pendingLabel="Placing order...">Place order, {total}</SubmitButton>
        <p className="text-xs text-ink-subtle">Payment options appear after the order is saved.</p>
      </div>
    </form>
  );
}
