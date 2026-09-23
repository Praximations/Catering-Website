"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkoutAction, type CheckoutState } from "@/app/actions/orders";
import { AddressField } from "@/components/address-field";
import { AlertIcon, CalendarIcon, MapPinIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cardClass, cx, Field, inputClass, textareaClass } from "@/components/ui";

/**
 * Checkout. The form collects WHEN and WHERE; the what and the price come from
 * the basket on the server, which is why no price is submitted here.
 *
 * NOTHING TYPED IS LOST:
 *   - a refusal from the server hands back what was sent (CheckoutState.values)
 *   - a draft is kept in this tab's sessionStorage as they type, so going back
 *     to change a quantity, or signing in half way, does not empty the form;
 *     the order page clears it once the order exists
 *   - the address, name and email a signed-in customer has saved are offered
 */

const DRAFT_KEY = "catering:checkout-draft";
const DRAFT_FIELDS = ["name", "email", "phone", "eventDate", "guests", "address", "notes"] as const;
type Draft = Partial<Record<(typeof DRAFT_FIELDS)[number], string>>;

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(form: HTMLFormElement) {
  try {
    const data = new FormData(form);
    const draft: Draft = {};
    for (const field of DRAFT_FIELDS) {
      const value = data.get(field);
      if (typeof value === "string" && value) draft[field] = value.slice(0, 2000);
    }
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode, or storage is full: the form still works, it just forgets.
  }
}

/** Called from the order page once the order exists. */
export function clearCheckoutDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do.
  }
}

export function CheckoutForm({
  minDate,
  defaults,
  savedAddresses,
  signedIn,
  total,
  onlinePayment,
  mapsEnabled,
}: {
  minDate: string;
  defaults: { name: string; email: string };
  savedAddresses: string[];
  signedIn: boolean;
  total: string;
  onlinePayment: boolean;
  mapsEnabled: boolean;
}) {
  const [state, formAction] = useActionState<CheckoutState | undefined, FormData>(checkoutAction, undefined);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Restored after hydration, so the server and the first render agree.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readDraft();
      if (stored) setDraft(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // A saved address chip changes the field without a change event; save it.
  useEffect(() => {
    if (address === undefined) return;
    // After the address field has re-rendered with it.
    const timer = window.setTimeout(() => formRef.current && writeDraft(formRef.current), 0);
    return () => window.clearTimeout(timer);
  }, [address]);

  // What each field shows: the server's copy after a refusal, else the draft,
  // else what the account knows.
  const values: Draft = state?.values ?? draft ?? {};
  const pick = (field: keyof Draft, fallback = "") => values[field] ?? fallback;
  const errors = state?.fieldErrors ?? {};
  const firstError = Object.keys(errors)[0];

  // Take them to the first problem rather than leaving them to hunt for it.
  useEffect(() => {
    if (!firstError) return;
    const element = formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state, firstError]);

  return (
    <form
      // Remount when a draft or a server answer arrives, so every field picks
      // up its restored default.
      key={state ? `state-${JSON.stringify(state.values ?? {})}` : draft ? "draft" : "fresh"}
      ref={formRef}
      action={formAction}
      onChange={(event) => writeDraft(event.currentTarget)}
      className="space-y-4"
      noValidate
    >
      {state?.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : firstError ? (
        <Alert tone="error" icon={AlertIcon}>
          A couple of details need another look.
        </Alert>
      ) : null}

      {!signedIn ? (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-ink-muted shadow-xs">
          Ordered before?{" "}
          <Link href="/login?next=/cart" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>{" "}
          to fill this in. What you have typed stays.
        </p>
      ) : null}

      <FormSection icon={CalendarIcon} title="When">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Delivery date" htmlFor="eventDate" error={errors.eventDate}>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              min={minDate}
              defaultValue={pick("eventDate")}
              className={inputClass}
              aria-invalid={Boolean(errors.eventDate) || undefined}
            />
          </Field>
          <Field label="Guests" htmlFor="guests" error={errors.guests}>
            <input
              id="guests"
              name="guests"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={pick("guests")}
              placeholder="How many people"
              className={inputClass}
              aria-invalid={Boolean(errors.guests) || undefined}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={MapPinIcon} title="Where">
        <Field label="Delivery address" htmlFor="address" error={errors.address}>
          <AddressField
            id="address"
            name="address"
            defaultValue={address ?? pick("address") ?? ""}
            placeholder="Street, town, postcode"
            invalid={Boolean(errors.address)}
            mapsEnabled={mapsEnabled}
          />
        </Field>
        {savedAddresses.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {savedAddresses.slice(0, 4).map((saved) => (
              <button
                key={saved}
                type="button"
                onClick={() => setAddress(saved)}
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-xs transition-colors hover:border-accent/40 hover:text-accent-strong"
              >
                <MapPinIcon className="size-3.5 shrink-0" />
                <span className="truncate">{saved}</span>
              </button>
            ))}
          </div>
        ) : null}
      </FormSection>

      <FormSection icon={UserIcon} title="Who">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              defaultValue={pick("name", defaults.name)}
              className={inputClass}
              aria-invalid={Boolean(errors.name) || undefined}
            />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone} hint="In case anything changes on the day.">
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={pick("phone")}
              className={inputClass}
              aria-invalid={Boolean(errors.phone) || undefined}
            />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email} className="sm:col-span-2">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={pick("email", defaults.email)}
              className={inputClass}
              aria-invalid={Boolean(errors.email) || undefined}
            />
          </Field>
        </div>
        <details className="disclosure group mt-4" open={Boolean(pick("notes"))}>
          <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-strong">
            <span className="transition-transform group-open:rotate-45">+</span> Allergies, timing or access notes
          </summary>
          <div className="pt-3">
            <label htmlFor="notes" className="sr-only">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={pick("notes")}
              placeholder="Two guests are gluten free. Deliver by 11:45, loading bay at the back."
              className={textareaClass}
            />
          </div>
        </details>
      </FormSection>

      <div className={cx(cardClass, "p-5 sm:p-6")}>
        <SubmitButton pendingLabel="Placing your order" className={cx(button("primary", "lg"), "w-full")}>
          Place order · {total}
        </SubmitButton>
        {/* Said before the click: the hesitation here is "am I being charged". */}
        <p className="mt-3 flex items-start justify-center gap-2 text-center text-xs leading-5 text-ink-muted">
          <ShieldIcon className="mt-0.5 size-3.5 shrink-0 text-accent" />
          Nothing is charged now. We confirm the date first
          {onlinePayment ? ", then you can pay securely online." : ", then arrange payment with you."}
        </p>
      </div>
    </form>
  );
}

function FormSection({
  icon: IconGlyph,
  title,
  children,
}: {
  icon: typeof CalendarIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={cx(cardClass, "p-5 sm:p-6")}>
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-tight">
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent">
          <IconGlyph className="size-3.5" />
        </span>
        {title}
      </p>
      {children}
    </fieldset>
  );
}
