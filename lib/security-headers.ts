/**
 * The response headers that make the browser defend this site.
 *
 * Here rather than inline in next.config.ts and proxy.ts because the two need
 * the same values and because a policy is worth testing. Nothing in this file
 * reads a request, so it can be exercised directly.
 */

export interface CspOptions {
  /** Per-request, unguessable. Without one, no script on the page will run. */
  nonce: string;
  development?: boolean;
  /** The Supabase project URL, which the Google sign in flow redirects to. */
  supabaseUrl?: string | undefined;
  /**
   * Where a Pay button may end up submitting. See checkoutOrigins in
   * lib/payments, and the note on the form-action directive below.
   */
  checkoutOrigins?: readonly string[];
  /**
   * Origins the page may show in an iframe. Only the map, and only when maps
   * are on; see MAP_EMBED_ORIGIN in lib/geo.ts. Empty means frame nothing.
   */
  frameOrigins?: readonly string[];
}

/**
 * Content Security Policy.
 *
 * The point of a CSP here is that an injected <script> does nothing. React
 * escapes what it renders, so the realistic route in is not a stray tag in
 * copy: it is a dependency, a pasted snippet, or a future contributor
 * reaching for dangerouslySetInnerHTML. A policy is what makes that mistake
 * inert instead of fatal.
 *
 * WHY THERE IS A NONCE AT ALL. Next streams the page's data to the browser in
 * inline <script> tags. Allowing those without a nonce means
 * script-src 'unsafe-inline', which allows EVERY inline script including an
 * injected one, and is barely a policy. A nonce is the difference between a
 * CSP that stops an injection and one that only looks like it does.
 *
 * 'strict-dynamic' IS WHY THE ALLOWLIST BELOW LOOKS REDUNDANT. Where it is
 * understood, it makes 'self' and every host in script-src be ignored: the
 * browser trusts scripts this server nonced, plus scripts those load, and
 * nothing else. The https: and 'unsafe-inline' entries exist only for older
 * browsers that do not understand 'strict-dynamic' and would otherwise fall
 * back to refusing everything.
 *
 * 'unsafe-inline' IS PRESENT FOR STYLES AND NOT FOR SCRIPTS, deliberately.
 * Next injects inline <style> for the font loader and the critical CSS, and
 * an injected style cannot execute: the worst it does is restyle the page.
 * An injected script runs as the site.
 */
export function contentSecurityPolicy(options: CspOptions): string {
  const { nonce, development = false, supabaseUrl, checkoutOrigins = [], frameOrigins = [] } = options;

  const policy: [string, string[]][] = [
    ["default-src", ["'self'"]],

    [
      "script-src",
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        // Ignored where 'strict-dynamic' is understood; the fallback where it
        // is not.
        "https:",
        "'unsafe-inline'",
        // React uses eval in development to rebuild server stack traces in
        // the browser. Neither React nor Next uses it in production.
        ...(development ? ["'unsafe-eval'"] : []),
      ],
    ],

    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "https://fonts.gstatic.com", "data:"]],

    // data: and blob: for the placeholders next/image generates. No remote
    // hosts: every image here is in public/, and adding a remote one should be
    // a deliberate edit to this line.
    ["img-src", ["'self'", "data:", "blob:"]],

    [
      "connect-src",
      [
        "'self'",
        // Stripe's API is called SERVER side, so the browser never reaches it.
        // Supabase does need naming: Google sign in redirects there.
        ...(supabaseUrl ? [supabaseUrl] : []),
        // The dev server's hot reload socket.
        ...(development ? ["ws:", "wss:"] : []),
      ],
    ],

    // Checkout is a full redirect, not an iframe. The one thing a page frames
    // is the map, from exactly one origin, and only while maps are on. A map
    // iframe is sandboxed from this origin by the same-origin policy, and it
    // renders tiles, nothing that can reach into the page.
    ["frame-src", frameOrigins.length > 0 ? [...frameOrigins] : ["'none'"]],
    ["object-src", ["'none'"]],
    // The modern X-Frame-Options. Unlike that header it cannot be confused by
    // more than one value.
    ["frame-ancestors", ["'none'"]],
    /**
     * Forms post back here, so a form injected into a page cannot send what
     * somebody types into it anywhere else.
     *
     * The payment provider's checkout host is the one exception, and only when
     * that provider is configured. Firefox and Safari apply form-action across
     * REDIRECTS, so without it the Pay button, which posts to a Server Action
     * that redirects to hosted checkout, is refused and the customer lands on
     * a blank page. Chrome does not check redirects, so it looks fine there.
     */
    ["form-action", ["'self'", ...checkoutOrigins]],
    // No <base> tag can retarget every relative URL on the page.
    ["base-uri", ["'self'"]],
    // Nothing uses a worker, and a blob: worker is a well travelled way to get
    // script execution past a policy.
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
  ];

  const serialized = policy.map(([directive, values]) => `${directive} ${values.join(" ")}`);

  if (!development) {
    // Fetch this page's own subresources over https even where an old link
    // says http. A valueless directive.
    serialized.push("upgrade-insecure-requests");
  }

  return serialized.join("; ");
}

export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * The headers that do not depend on the request, so they can be declared once
 * in next.config.ts and apply to static assets as well as pages.
 */
export const STATIC_SECURITY_HEADERS: readonly SecurityHeader[] = [
  {
    // Belt to the CSP's frame-ancestors braces, for anything reading only this.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Stops a browser deciding a .txt is really HTML and running it in this
    // origin.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // THE PATH OF AN ORDER PAGE IS A BEARER TOKEN. /orders/<token> is reachable
    // without an account, so sending the full path in a Referer header to
    // anywhere the customer clicks through to would hand that token away.
    // Cross-origin requests get the origin only.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Nothing here needs a camera, a microphone, or a location. Saying so
    // means an injected script cannot ask on the site's behalf.
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  {
    // Keeps this origin in its own process, so a cross-origin page cannot hold
    // a usable reference to a window opened from here.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

/**
 * HSTS, production only.
 *
 * Sent over plain http in development it would pin localhost to https in the
 * developer's browser for two years, breaking every other project on
 * localhost too. `preload` is left off deliberately: submitting to the
 * preload list is close to irreversible and is the site owner's decision, not
 * a default somebody inherits.
 */
export const STRICT_TRANSPORT_SECURITY: SecurityHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains",
};
