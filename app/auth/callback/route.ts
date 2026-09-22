import { NextResponse } from "next/server";
import { praxiCustomerCreated } from "@/lib/praxi";
import { createSession } from "@/lib/session";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { findOrCreateGoogleUser } from "@/lib/users";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?oauth=failed", requestUrl.origin));

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const email = data.user?.email;
  if (error || !email) {
    return NextResponse.redirect(new URL("/login?oauth=failed", requestUrl.origin));
  }

  const name =
    typeof data.user.user_metadata?.full_name === "string"
      ? data.user.user_metadata.full_name
      : typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : email.split("@")[0];
  const result = await findOrCreateGoogleUser({ email, name });
  if (result.created) await praxiCustomerCreated(result.user);
  await createSession(result.user.id);

  const destination = result.user.role === "owner" ? "/admin" : "/account";
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
