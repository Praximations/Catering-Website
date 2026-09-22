import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass, secondaryButtonClass } from "@/components/ui";
import { business } from "@/lib/business";

// No `robots` here on purpose: Next already sends noindex on a 404, and a
// second robots tag saying the same thing is just two tags to reconcile.
export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The 404.
 *
 * Reached by a mistyped URL and by notFound() from a page, which is how
 * /orders/[token] answers a token that does not exist. That matters here:
 * this page must not hint at whether a token was merely wrong or actually
 * belonged to somebody, so it says the same thing either way.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-5xl text-ink">We cannot find that page.</h1>
      <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-ink-muted">
        The link may be out of date, or the address may have a typo in it. If you
        were looking for an order, use the link from your confirmation: it is the
        only way back to it.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass}>
          Back to the home page
        </Link>
        <Link href="/shop" className={secondaryButtonClass}>
          See what we cater
        </Link>
      </div>
      <p className="mt-10 text-sm text-ink-subtle">
        Stuck? Call us on {business.phone} or email {business.email}.
      </p>
    </main>
  );
}
