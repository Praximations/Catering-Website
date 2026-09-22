import { NextResponse } from "next/server";
import { createSupabaseAuthClient, isGoogleAuthConfigured } from "@/lib/supabase-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (!isGoogleAuthConfigured) {
    return NextResponse.redirect(new URL("/login?oauth=not-configured", requestUrl.origin));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || requestUrl.origin;
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?oauth=failed", requestUrl.origin));
  }
  return NextResponse.redirect(data.url);
}
