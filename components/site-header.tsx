import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { BagIcon, PhoneIcon } from "@/components/icons";
import { business } from "@/lib/business";
import { getCart } from "@/lib/cart";
import { phoneHref } from "@/lib/facts";
import { getCurrentUser } from "@/lib/session";

/**
 * The header knows who is signed in, but it is NOT what keeps anyone out.
 *
 * Protection lives on each protected page (requireUser / requireOwner) and
 * inside each Server Action, because a layout does not necessarily re-run
 * on every navigation and because actions can be called without ever
 * loading a page.
 *
 * THE PHONE NUMBER IS IN THE HEADER ON PURPOSE. People book caterers by phone
 * as often as online, especially for anything bigger than a lunch, and a
 * number they have to hunt for in the footer is a booking that goes elsewhere.
 */

const links = [
  { href: "/menu", label: "Menus" },
  { href: "/about", label: "How it works" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-3 sm:px-8">
        <Link href="/" className="font-display text-xl leading-none tracking-tight text-ink">
          {business.name}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-4">
          <a
            href={phoneHref}
            className="hidden items-center gap-2 font-medium text-ink-muted transition-colors hover:text-ink lg:inline-flex"
          >
            <PhoneIcon className="size-4" />
            {business.phone}
          </a>

          {user ? (
            <>
              <Link
                href={user.role === "owner" ? "/admin" : "/account"}
                className="hidden font-medium text-ink-muted transition-colors hover:text-ink sm:inline"
              >
                {user.role === "owner" ? "Dashboard" : "Account"}
              </Link>
              {/* A plain form, so signing out is a POST and not something a
                  stray link preview can trigger. */}
              <form action={logoutAction} className="hidden sm:block">
                <button type="submit" className="text-ink-subtle transition-colors hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden font-medium text-ink-muted transition-colors hover:text-ink sm:inline"
            >
              Sign in
            </Link>
          )}

          {/* The count is only shown when there is one. A zero badge is noise,
              and "0" next to a basket reads as an error. */}
          <Link
            href="/cart"
            aria-label={cart.count > 0 ? `Your order, ${cart.count} items` : "Your order"}
            className="relative grid size-10 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <BagIcon className="size-5" />
            {cart.count > 0 ? (
              <span className="absolute right-0.5 top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-highlight px-1 text-[0.625rem] font-bold leading-[1.125rem] text-on-accent">
                {cart.count}
              </span>
            ) : null}
          </Link>

          <Link
            href="/shop"
            className="inline-flex min-h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Order online
          </Link>
        </div>
      </div>

      {/* Below md the main links move to a second row rather than behind a
          menu button: there are only a few of them, and a hamburger hides the
          phone number, which is the thing most worth seeing on a phone. */}
      <nav
        aria-label="Main"
        className="flex items-center gap-5 overflow-x-auto border-t border-line px-5 py-2.5 text-sm md:hidden"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 font-medium text-ink-muted">
            {link.label}
          </Link>
        ))}
        <a href={phoneHref} className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-medium text-accent">
          <PhoneIcon className="size-4" />
          Call
        </a>
        {user ? (
          <>
            <Link href={user.role === "owner" ? "/admin" : "/account"} className="shrink-0 font-medium text-ink-muted sm:hidden">
              {user.role === "owner" ? "Dashboard" : "Account"}
            </Link>
            <form action={logoutAction} className="shrink-0 sm:hidden">
              <button type="submit" className="text-ink-subtle">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="shrink-0 font-medium text-ink-muted sm:hidden">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
