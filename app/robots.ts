import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * What a crawler may index.
 *
 * The public pages, and nothing else. The disallowed list is not about SEO,
 * it is about not publishing things:
 *
 *   /orders/   the path IS the credential. A crawler that followed one into an
 *              index would publish somebody's order.
 *   /admin     the owner's dashboard. Guarded anyway, but there is no reason
 *              for its existence to be in a search index.
 *   /account   the same, per customer.
 *   /api/      machine endpoints. Nothing there renders.
 *   /auth/     one-time codes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/orders/", "/admin", "/account", "/api/", "/auth/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
