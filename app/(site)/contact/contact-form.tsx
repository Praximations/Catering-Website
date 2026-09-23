"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactFormState } from "@/app/actions/contacts";
import { AlertIcon, CheckIcon, SendIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cx, Field, inputClass, textareaClass } from "@/components/ui";

export function ContactForm({ defaults }: { defaults: { name: string; email: string; subject?: string } }) {
  const [state, action] = useActionState<ContactFormState | undefined, FormData>(submitContactAction, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="grid size-14 animate-pop place-items-center rounded-full bg-accent text-on-accent shadow-sm">
          <CheckIcon className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Message sent</h2>
        <p className="mt-1 text-sm text-ink-muted">We will reply to the email you gave us.</p>
      </div>
    );
  }

  const errors = state?.fieldErrors ?? {};
  // What was typed survives a refusal: React resets a form after its action,
  // so the server hands the values back.
  const values = state?.values ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" defaultValue={values.name ?? defaults.name} className={inputClass} aria-invalid={Boolean(errors.name) || undefined} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email ?? defaults.email} className={inputClass} aria-invalid={Boolean(errors.email) || undefined} />
        </Field>
        <Field label="Phone" htmlFor="phone" optional>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={values.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <input id="subject" name="subject" defaultValue={values.subject ?? defaults.subject} placeholder="An order, a question" className={inputClass} aria-invalid={Boolean(errors.subject) || undefined} />
        </Field>
      </div>
      <Field label="Message" htmlFor="message" error={errors.message}>
        <textarea id="message" name="message" rows={6} maxLength={2000} defaultValue={values.message ?? ""} className={textareaClass} aria-invalid={Boolean(errors.message) || undefined} />
      </Field>
      <SubmitButton pendingLabel="Sending" className={cx(button("primary"), "w-full sm:w-auto")}>
        <SendIcon className="size-4" />
        Send message
      </SubmitButton>
    </form>
  );
}
