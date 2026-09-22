"use server";

import { redirect } from "next/navigation";
import { praxiCustomerCreated } from "@/lib/praxi";
import { createSession, destroySession } from "@/lib/session";
import { authenticate, createUser } from "@/lib/users";
import {
  isEmail,
  LIMITS,
  MIN_PASSWORD_LENGTH,
  password as readPassword,
  Problems,
  text,
} from "@/lib/validation";

/**
 * Sign up, sign in, sign out.
 *
 * Every action here is treated as an untrusted entry point, because it is
 * one: a Server Action is a public POST endpoint, so nothing relies on the
 * form that called it having been rendered.
 *
 * Shape note: with useActionState the previous state arrives FIRST and the
 * form data second. Returning a state object rather than throwing is what
 * lets the form show the error next to the field.
 */

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signupAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const name = text(formData, "name", LIMITS.name);
  const email = text(formData, "email", LIMITS.email);
  const password = readPassword(formData, "password");

  const problems = new Problems();
  problems.when(name.length < 2, "name", "Please give us a name to call you by.");
  problems.when(!isEmail(email), "email", "That does not look like an email address.");
  problems.when(
    password.length < MIN_PASSWORD_LENGTH,
    "password",
    `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  );
  if (problems.any) return { fieldErrors: problems.fieldErrors };

  const result = await createUser({ name, email, password });
  if (!result.ok) {
    // Sign up is the one place where "this address is taken" has to be
    // said out loud; there is no way to create the account otherwise.
    return { fieldErrors: { email: "There is already an account with that email." } };
  }

  // Praxi learns about the new customer. It cannot break signup: the
  // account already exists and the call swallows its own failures.
  await praxiCustomerCreated(result.user);

  await createSession(result.user.id);
  // Outside any try/catch: redirect works by throwing, and catching it
  // would swallow the navigation.
  redirect(result.user.role === "owner" ? "/admin" : "/account");
}

export async function loginAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const email = text(formData, "email", LIMITS.email);
  const password = readPassword(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await authenticate(email, password);
  if (!user) {
    // Deliberately does not say which half was wrong.
    return { error: "That email and password do not match an account." };
  }

  await createSession(user.id);
  redirect(user.role === "owner" ? "/admin" : "/account");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
