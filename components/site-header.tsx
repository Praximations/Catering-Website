import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { business } from "@/lib/business";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/session";

/**
 * The header knows who is signed in, but it is NOT what keeps anyone out.
 *
 * Protection lives on each protected page (requireUser / requireOwner) and
 * inside each Server Action, because a layout does not necessarily re-run
 * on every navigation and because actions can be called without ever
 * loading a page.
 */

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/shop", label: "Order" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-ink">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full border border-accent/25 font-display text-base italic text-accent"
          >
            {business.name.slice(0, 1)}
          </span>
          <span>
            <span className="block font-display text-lg leading-none tracking-tight">{business.name}</span>
            <span className="mt-1 hidden text-[0.58rem] font-bold uppercase tracking-[0.2em] text-ink-subtle sm:block">Catering and events</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:order-none sm:w-auto sm:flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-ink-muted transition-colors hover:text-accent-strong"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {/* The count is only shown when there is one. A zero badge is
              noise, and "0" next to a cart reads as an error. */}
          <Link
            href="/cart"
            aria-label={cart.count > 0 ? `Cart, ${cart.count} selections` : "Cart"}
            className="relative grid size-10 place-items-center text-ink-muted transition-colors hover:bg-raised hover:text-accent-strong"
          >
            <span aria-hidden className="relative block h-5 w-5">
              <span className="absolute inset-x-0 bottom-0 h-4 rounded-sm border-2 border-current" />
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-current" />
            </span>
            {cart.count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-highlight px-1 py-0.5 text-[0.65rem] font-bold leading-none text-on-accent ring-2 ring-surface">
                {cart.count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <>
              <Link
                href={user.role === "owner" ? "/admin" : "/account"}
                className="font-medium text-ink-muted transition-colors hover:text-accent-strong"
              >
                {user.role === "owner" ? "Dashboard" : "My enquiries"}
              </Link>
              {/* A plain form, so signing out is a POST and not something a
                  stray link preview can trigger. */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-ink-subtle transition-colors hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="font-medium text-ink-muted transition-colors hover:text-accent-strong">
              Sign in
            </Link>
          )}
          <Link href="/quote" className="hidden min-h-10 items-center bg-accent px-4 text-xs font-bold text-on-accent transition-colors hover:bg-accent-strong md:inline-flex">
            Plan an event
          </Link>
        </div>
      </div>
    </header>
  );
}
