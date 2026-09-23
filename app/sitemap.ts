import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * The public pages, listed by hand.
 *
 * DELIBERATELY NOT GENERATED from the routes on disk. A sitemap built by
 * walking the filesystem would happily list /admin, /account and
 * /orders/[token], and the whole point of that last one is that its addresses
 * are not published. A list somebody has to edit is the safer shape here: the
 * cost is remembering to add a page, and the alternative cost is publishing an
 * order.
 */
const PUBLIC_PAGES = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.9 },
  { path: "/menu", changeFrequency: "monthly", priority: 0.8 },
  { path: "/quote", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/refunds", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/delivery", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/allergens", changeFrequency: "yearly", priority: 0.3 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
  { path: "/signup", changeFrequency: "yearly", priority: 0.2 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return PUBLIC_PAGES.map((page) => ({
    url: `${base}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
