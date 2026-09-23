/**
 * Whether Google sign in is set up, from the environment alone.
 *
 * Separate from supabase-auth.ts for the same reason session-token.ts is
 * separate from session.ts: that file imports next/headers, which resolves only
 * inside Next's runtime, and the policy pages (which say whether sign in sets
 * cookies) are tested outside it.
 */
export const isGoogleAuthConfigured = Boolean(
  process.env.SUPABASE_URL?.replace(/\/$/, "") && process.env.SUPABASE_ANON_KEY
);
