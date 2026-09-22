"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactFormState } from "@/app/actions/contacts";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, buttonClass, inputClass } from "@/components/ui";

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const [state, action] = useActionState<ContactFormState | undefined, FormData>(
    submitContactAction,
    undefined
  );
  if (state?.ok) {
    return (
      <Alert tone="success" title="Message sent">
        <p>We will reply to the email you provided.</p>
      </Alert>
    );
  }
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" defaultValue={defaults.name} placeholder="Your name" className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={defaults.email} placeholder="you@example.com" className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" hint="Optional">
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(555) 000-0000" className={inputClass} />
        </Field>
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <input id="subject" name="subject" placeholder="Event, order, or question" className={inputClass} />
        </Field>
      </div>
      <Field label="Message" htmlFor="message" error={errors.message}>
        <textarea id="message" name="message" rows={6} maxLength={2000} placeholder="How can we help?" className={inputClass} />
      </Field>
      <SubmitButton pendingLabel="Sending..." className={`${buttonClass} w-full sm:w-auto`}>
        Send message
      </SubmitButton>
    </form>
  );
}
