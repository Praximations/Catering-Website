import { NextResponse } from "next/server";
import { praxiCustomerCreated } from "@/lib/praxi";
import { createSession } from "@/lib/session";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { findOrCreateGoogleUser } from "@/lib/users";

/**
 * Where Google sends the person back to.
 *
 * THE VERIFIED EMAIL CHECK BELOW IS THE WHOLE SECURITY MODEL OF THIS ROUTE.
 * findOrCreateGoogleUser matches an EXISTING account by email address, which
 * is what lets somebody who signed up with a password later sign in with
 * Google. That convenience is also the danger: an unverified address from any
 * provider would be enough to take over the account that owns it, and the
 * first account on this site is the OWNER.
 *
 * Supabase does verify Google addresses, so in practice this check passes. It
 * is here because "the provider we use today happens to verify" is not a
 * security property, and enabling a second provider later would silently turn
 * this route into an account takeover.
 */

/** Never cached: this exchanges a one-time code. */
export const dynamic = "force-dynamic";

function failed(origin: string, reason: string): NextResponse {
  // The reason goes in the log, not the URL. A visitor gets one message.
  console.warn(`[auth] Google sign in refused: ${reason}`);
  return NextResponse.redirect(new URL("/login?oauth=failed", origin));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Providers report a refusal here rather than by not coming back.
  const error = requestUrl.searchParams.get("error");
  if (error) return failed(origin, `provider returned ${error}`);

  const code = requestUrl.searchParams.get("code");
  if (!code) return failed(origin, "no code in the callback");

  const supabase = await createSupabaseAuthClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return failed(origin, `code exchange failed: ${exchangeError.message}`);

  const user = data.user;
  if (!user) return failed(origin, "the exchange returned no user");

  const email = user.email;
  if (!email) return failed(origin, "the provider returned no email address");

  /**
   * Both spellings, because they do not mean the same thing.
   *
   * `email_confirmed_at` is Supabase's own record that the address is
   * confirmed. `user_metadata.email_verified` is what the provider claimed.
   * Either is enough; NEITHER is not, and an address that is merely present
   * is not verified.
   */
  const verifiedBySupabase = Boolean(user.email_confirmed_at);
  const verifiedByProvider = user.user_metadata?.email_verified === true;
  if (!verifiedBySupabase && !verifiedByProvider) {
    return failed(origin, `${email} is not a verified address`);
  }

  // Only a real identity provider, never a password or a magic link arriving
  // through this route by some other path.
  const provider = user.app_metadata?.provider;
  if (provider !== "google") {
    return failed(origin, `unexpected provider ${String(provider)}`);
  }

  const name = readName(user.user_metadata) ?? email.split("@")[0]!;
  const result = await findOrCreateGoogleUser({ email, name });

  if (result.created) await praxiCustomerCreated(result.user);
  await createSession(result.user.id);

  const destination = result.user.role === "owner" ? "/admin" : "/account";
  // Built from this request's own origin, never from a parameter, so the
  // callback cannot be used as an open redirect.
  return NextResponse.redirect(new URL(destination, origin));
}

function readName(metadata: Record<string, unknown> | undefined): string | null {
  for (const key of ["full_name", "name"]) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  }
  return null;
}
