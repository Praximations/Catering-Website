"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { AlertIcon } from "@/components/icons";
import { useRememberedEmail } from "@/components/remembered-email";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cx, Field, inputClass } from "@/components/ui";

export function LoginForm({ next, initialEmail }: { next: string; initialEmail: string }) {
  const [state, formAction] = useActionState<FormState | undefined, FormData>(loginAction, undefined);
  // Controlled, so it survives React's reset of the form after each attempt.
  const [email, setEmail] = useRememberedEmail(initialEmail);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : null}

      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            // Focus lands here after a failed attempt: the email is still right.
            autoFocus={Boolean(state?.error && email)}
            className={cx(inputClass, "pr-16")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-ink/5"
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <SubmitButton pendingLabel="Signing in" className={cx(button("primary", "lg"), "w-full")}>
        Sign in
      </SubmitButton>

      <p className="pt-1 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href={`/signup${email || next ? "?" : ""}${new URLSearchParams({ ...(email ? { email } : {}), ...(next ? { next } : {}) })}`}
          className="font-semibold text-accent hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
