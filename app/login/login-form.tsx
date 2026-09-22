"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, buttonClass, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, formAction] = useActionState<FormState | undefined, FormData>(
    loginAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
          className={inputClass}
        />
      </Field>

      <SubmitButton pendingLabel="Signing in..." className={`${buttonClass} w-full`}>
        Sign in
      </SubmitButton>
    </form>
  );
}
