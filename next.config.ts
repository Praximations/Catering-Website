import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS, STRICT_TRANSPORT_SECURITY } from "./lib/security-headers";

/**
 * This file was an empty stub, which meant the site shipped with no security
 * headers at all.
 *
 * The headers here are the ones that do not depend on the request, so they are
 * declared once and apply to static assets as well as pages. The Content
 * Security Policy is NOT here: it carries a per-request nonce, which a static
 * header cannot, so it is set in proxy.ts. See lib/security-headers.ts for
 * what each one is for.
 */
const nextConfig: NextConfig = {
  // The project's AGENTS.md is hand written, and deliberately avoids the em
  // dashes the generated block uses. Regenerating it on every `next dev`
  // replaced that with an uncommitted change every time.
  agentRules: false,

  // The framework and its version are not the visitor's business.
  poweredByHeader: false,

  // The event menus were at /menu before they were called the catalog. Old
  // links, bookmarks and search results still land in the right place.
  async redirects() {
    return [
      { source: "/menu", destination: "/catalog", permanent: true },
      { source: "/menu/:path*", destination: "/catalog", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...STATIC_SECURITY_HEADERS,
          ...(process.env.NODE_ENV === "production" ? [STRICT_TRANSPORT_SECURITY] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
