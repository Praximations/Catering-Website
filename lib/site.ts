/**
 * The site's own canonical URL.
 *
 * Needed wherever a link has to work outside the request that generated it:
 * a payment provider's return URL, a sitemap, an email. Deliberately NOT
 * taken from the incoming request's Host header, which a caller controls and
 * could point at a host of their choosing.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  // Vercel sets this per deployment. Correct for a preview, and the reason
  // NEXT_PUBLIC_SITE_URL should be set for production.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3100";
}
