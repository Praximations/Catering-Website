import { NextResponse, type NextRequest } from "next/server";
import { checkoutOrigins } from "@/lib/payments";
import { contentSecurityPolicy } from "@/lib/security-headers";

/**
 * WHY THIS FILE EXISTS, given that AGENTS.md used to say the app deliberately
 * had neither a middleware nor a proxy.
 *
 * That was the right call while nothing needed one. A nonce-based Content
 * Security Policy needs one: the nonce has to be freshly generated per
 * request and reach both the response header and the scripts Next renders,
 * and next.config.ts headers are static. The alternative is
 * script-src 'unsafe-inline', which permits every inline script including an
 * injected one, so it is a policy in name only.
 *
 * WHAT THIS FILE DOES NOT DO, and must not start doing: AUTHORIZATION. Pages
 * check with requireUser and requireOwner, and every Server Action re-checks
 * on its own, because a Server Action is a public POST endpoint that can be
 * called without the page ever rendering. Moving a check here would put the
 * only copy somewhere that does not run for a direct action invocation. This
 * file sets a header. That is all it is for.
 */

/**
 * A nonce has to be unguessable and different every time, or an attacker who
 * can read one page's nonce can write a script tag that passes on the next.
 * randomUUID is cryptographically random; base64 is the spelling CSP wants.
 */
function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = newNonce();
  const policy = contentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV !== "production",
    supabaseUrl: process.env.SUPABASE_URL?.replace(/\/$/, ""),
    checkoutOrigins: checkoutOrigins(),
  });

  // Next reads the nonce off the REQUEST header and puts it on the script tags
  // it renders, so setting it here is what connects the policy to the page.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  /**
   * Documents only.
   *
   * A policy on an image or a font does nothing, and generating a nonce for
   * every static asset is work with no result. The Stripe webhook is excluded
   * for the same reason plus one more: it is a server-to-server POST with no
   * browser involved, and nothing should sit between it and its signature
   * check.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/stripe/webhook|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$).*)",
  ],
};
