"use server";

import { redirect } from "next/navigation";
import { clientAddress } from "@/lib/client-address";
import { praxiCustomerCreated } from "@/lib/praxi";
import {
  bucketFor,
  checkRateLimit,
  clearRateLimit,
  LOGIN_LIMIT,
  SIGNUP_LIMIT,
} from "@/lib/rate-limit";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { authenticate, createUser, revokeSessions } from "@/lib/users";
import {
  isEmail,
  LIMITS,
  MIN_PASSWORD_LENGTH,
  password as readPassword,
  Problems,
  safeNextPath,
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
  /**
   * What was typed, minus the password, so a refusal never makes somebody
   * type their email again. A password is never sent back to the page.
   */
  values?: { name?: string; email?: string };
}

/** Where a signed-in person goes: the page that sent them, or their home. */
function destination(role: "owner" | "customer", formData: FormData): string {
  return safeNextPath(text(formData, "next", 200)) ?? (role === "owner" ? "/admin" : "/account");
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
  const values = { name, email };
  if (problems.any) return { fieldErrors: problems.fieldErrors, values };

  // Keyed on the caller rather than the address, because the address is new
  // every time: this limits how many accounts one source can create.
  const limit = await checkRateLimit(
    bucketFor("signup", await clientAddress()),
    SIGNUP_LIMIT
  );
  if (!limit.allowed) {
    return { error: "Too many accounts created from here. Please try again later.", values };
  }

  const result = await createUser({ name, email, password });
  if (!result.ok) {
    // Sign up is the one place where "this address is taken" has to be
    // said out loud; there is no way to create the account otherwise.
    return { fieldErrors: { email: "There is already an account with that email. Sign in instead?" }, values };
  }

  // Praxi learns about the new customer. It cannot break signup: the
  // account already exists and the call swallows its own failures.
  await praxiCustomerCreated(result.user);

  await createSession(result.user.id);
  // Outside any try/catch: redirect works by throwing, and catching it
  // would swallow the navigation.
  redirect(destination(result.user.role, formData));
}

export async function loginAction(
  _prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const email = text(formData, "email", LIMITS.email);
  const password = readPassword(formData, "password");

  const values = { email };
  if (!email || !password) {
    return { error: "Enter your email and password.", values };
  }

  /**
   * TWO BUCKETS, because either one alone has a hole.
   *
   * By ADDRESS, so one account cannot be ground through a password list, even
   * from a rotating set of addresses. By CALLER, so one source cannot spray
   * one common password across many accounts, which the per-address bucket
   * never sees. The caller's address is spoofable behind a careless proxy,
   * which is exactly why the email bucket is there too.
   */
  const perAccount = bucketFor("login", email);
  const perCaller = bucketFor("login-source", await clientAddress());

  const [accountLimit, callerLimit] = await Promise.all([
    checkRateLimit(perAccount, LOGIN_LIMIT),
    checkRateLimit(perCaller, LOGIN_LIMIT),
  ]);

  if (!accountLimit.allowed || !callerLimit.allowed) {
    // Says nothing about whether the address exists.
    return { error: "Too many sign in attempts. Please wait a few minutes and try again.", values };
  }

  const user = await authenticate(email, password);
  if (!user) {
    // Deliberately does not say which half was wrong.
    return { error: "That email and password do not match an account.", values };
  }

  /**
   * Only the PER-ACCOUNT bucket is cleared. Somebody who mistyped their own
   * password four times should not be locked out tomorrow.
   *
   * The per-caller bucket is deliberately left alone. Clearing it would let an
   * attacker who holds any one valid account reset the spray counter at will:
   * try nine accounts with one common password, sign in to their own, and
   * start again, which is exactly the attack that bucket exists to see.
   */
  await clearRateLimit(perAccount);

  await createSession(user.id);
  redirect(destination(user.role, formData));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * Sign out of every browser, not just this one.
 *
 * Deleting the cookie only clears the copy in the browser doing the deleting.
 * A signed cookie cannot be recalled, so this moves the account's session
 * epoch instead, which every other cookie is then checked against and fails.
 * This is the control somebody needs after using a shared machine.
 */
export async function logoutEverywhereAction(): Promise<void> {
  const user = await getCurrentUser();
  // Re-checked here, not just on the page: a Server Action is a public POST
  // endpoint, and this one revokes credentials.
  if (user) await revokeSessions(user.id);
  await destroySession();
  redirect("/");
}
