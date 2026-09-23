import Link from "next/link";
import { BagIcon, SearchIcon } from "./icons";
import { button } from "./ui";
import { business } from "@/lib/business";

/**
 * The 404's words, shared by the site's own 404 and the root one.
 *
 * Reached by a mistyped URL and by notFound() from a page, which is how an
 * order link with a wrong token is answered. It must not hint at whether a
 * token was merely wrong or belonged to somebody, so it says the same thing
 * either way.
 */
export function NotFoundContent() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="grid size-14 animate-pop place-items-center rounded-full bg-raised text-ink-muted">
        <SearchIcon className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">We cannot find that page</h1>
      <p className="mt-2 text-ink-muted">The link may be out of date or mistyped. For an order, use the link from your confirmation.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/" className={button("primary")}>
          Home
        </Link>
        <Link href="/shop" className={button("secondary")}>
          <BagIcon className="size-4" />
          Order online
        </Link>
      </div>
      <p className="mt-8 text-sm text-ink-subtle">
        Stuck? Call {business.phone}.
      </p>
    </div>
  );
}
