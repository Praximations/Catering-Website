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
  { href: "/quote", label: "Request a quote" },
];

export async function SiteHeader() {
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);

  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="font-display text-lg tracking-tight text-ink">
          {business.name}
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-sm">
          {/* The count is only shown when there is one. A zero badge is
              noise, and "0" next to a cart reads as an error. */}
          <Link href="/cart" className="text-ink-muted transition-colors hover:text-ink">
            Cart
            {cart.count > 0 ? (
              <span className="ml-1.5 rounded-sm bg-accent px-1.5 py-0.5 text-xs text-on-accent">
                {cart.count}
              </span>
            ) : null}
          </Link>

          {user ? (
            <>
              <Link
                href={user.role === "owner" ? "/admin" : "/account"}
                className="text-ink-muted transition-colors hover:text-ink"
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
            <Link href="/login" className="text-ink-muted transition-colors hover:text-ink">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
