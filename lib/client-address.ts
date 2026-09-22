import { headers } from "next/headers";

/**
 * A best-effort identifier for who is making a request, for rate limiting.
 *
 * READ THE CAVEAT BEFORE USING THIS FOR ANYTHING ELSE. Every header below is
 * set by a proxy, and a client can send any of them. They are only
 * trustworthy because a platform like Vercel OVERWRITES them at its edge
 * before the request reaches this code. Behind a proxy that appends instead of
 * overwriting, or none at all, a caller can put whatever they like here.
 *
 * So this is used for ONE thing: spreading a rate limit across callers. A
 * spoofed value there buys an attacker a fresh allowance, which is why the
 * limits that matter are also keyed on something the attacker cannot choose,
 * such as the email address being guessed at. It is never used for
 * authorization, never stored, and never shown to anyone.
 */
export async function clientAddress(): Promise<string> {
  const store = await headers();

  // Vercel's own, set at the edge and not forwardable by the client.
  const vercel = store.get("x-vercel-forwarded-for");
  if (vercel) return first(vercel);

  // Cloudflare's equivalent.
  const cloudflare = store.get("cf-connecting-ip");
  if (cloudflare) return first(cloudflare);

  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return first(forwarded);

  const real = store.get("x-real-ip");
  if (real) return first(real);

  // Local development, where there is no proxy and every request is the same
  // machine anyway.
  return "unknown";
}

/**
 * The first entry of a comma-separated list.
 *
 * x-forwarded-for is a chain, client first, each proxy appending. The leftmost
 * is the closest thing to the real client and also the one a client can
 * prepend to, which is the caveat above rather than a bug here.
 */
function first(value: string): string {
  return value.split(",")[0]!.trim().slice(0, 64) || "unknown";
}
