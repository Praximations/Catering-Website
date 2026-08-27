"use server";

import { redirect } from "next/navigation";
import { praxiCustomerCreated } from "@/lib/praxi";
import { createSession, destroySession } from "@/lib/session";
import { authenticate, createUser } from "@/lib/users";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signupAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = text(formData, "password");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please give us a name to call you by.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "That does not look like an email address.";
  if (password.length < MIN_PASSWORD) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD} characters.`;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
  const email = text(formData, "email");
  const password = text(formData, "password");

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
