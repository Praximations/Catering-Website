"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function SignupForm() {
  const [state, formAction] = useActionState<FormState | undefined, FormData>(
    signupAction,
    undefined
  );
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Your name" htmlFor="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
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
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters."
        error={errors.password}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
        />
      </Field>

      <SubmitButton pendingLabel="Creating...">Create account</SubmitButton>
    </form>
  );
}
