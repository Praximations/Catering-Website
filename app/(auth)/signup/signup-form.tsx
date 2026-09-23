"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { AlertIcon } from "@/components/icons";
import { useRememberedEmail } from "@/components/remembered-email";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, cx, Field, inputClass } from "@/components/ui";

export function SignupForm({ next, initialEmail }: { next: string; initialEmail: string }) {
  const [state, formAction] = useActionState<FormState | undefined, FormData>(signupAction, undefined);
  const errors = state?.fieldErrors ?? {};
  // Controlled, so a refused signup keeps the name and email typed.
  const [email, setEmail] = useRememberedEmail(initialEmail);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const longEnough = password.length >= 8;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : null}

      <Field label="Name" htmlFor="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
          aria-invalid={Boolean(errors.name) || undefined}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={inputClass}
          aria-invalid={Boolean(errors.email) || undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cx(inputClass, "pr-16")}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby="password-rule"
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
        {/* The rule, checked as they type, rather than discovered on submit. */}
        {!errors.password ? (
          <p id="password-rule" className={cx("flex items-center gap-1.5 text-xs transition-colors", longEnough ? "text-accent" : "text-ink-subtle")}>
            <span className={cx("size-1.5 rounded-full transition-colors", longEnough ? "bg-accent" : "bg-line-strong")} />
            At least 8 characters
          </p>
        ) : null}
      </Field>

      <SubmitButton pendingLabel="Creating your account" className={cx(button("primary", "lg"), "w-full")}>
        Create account
      </SubmitButton>

      <p className="pt-1 text-center text-sm text-ink-muted">
        Have an account?{" "}
        <Link
          href={`/login${email || next ? "?" : ""}${new URLSearchParams({ ...(email ? { email } : {}), ...(next ? { next } : {}) })}`}
          className="font-semibold text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
