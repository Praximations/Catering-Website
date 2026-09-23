"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Sheet } from "./dialog";
import {
  BagIcon,
  BookIcon,
  ChatIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  GridIcon,
  HomeIcon,
  InfoIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  PhoneIcon,
  ReceiptIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
  type Icon,
} from "./icons";
import { Logo } from "./logo";
import { Avatar, CountBadge, cx, iconButtonClass, Tooltip } from "./ui";

type NavUser = { name: string; email: string; role: "owner" | "customer" } | null;

interface NavLink {
  href: string;
  label: string;
  icon: Icon;
  /** How the icon moves on hover. See .nav-icon in globals.css. */
  motion: "hop" | "tilt" | "wiggle" | "spin";
}

/**
 * The main links, in plain words. On a desktop they are words alone, the way
 * a shop's own site reads; the icons belong to the phone's menu and dock,
 * where a thumb is looking for a target.
 */
const LINKS: NavLink[] = [
  { href: "/catalog", label: "Catalog", icon: BookIcon, motion: "tilt" },
  { href: "/shop", label: "Order online", icon: BagIcon, motion: "hop" },
  { href: "/quote", label: "Events", icon: SparklesIcon, motion: "spin" },
  { href: "/about", label: "How it works", icon: InfoIcon, motion: "wiggle" },
  { href: "/contact", label: "Contact", icon: ChatIcon, motion: "wiggle" },
];

/** On a desktop, ordering is the button on the right, so it is not a link too. */
const DESKTOP_LINKS = LINKS.filter((link) => link.href !== "/shop");

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function homeFor(user: NavUser): string {
  return user?.role === "owner" ? "/admin" : "/account";
}

/**
 * The navbar, floating and rounded rather than a full-width strip.
 *
 * DESKTOP: a slim strip above it says where the business delivers and how to
 * reach it, the two things a caterer's customer checks first. The bar has the
 * logo, the main links, the phone number, the basket, the account and an
 * Order online button: a business's site, with the thing to do on the right.
 * The active link carries a soft pill that SLIDES to the next link on
 * navigation (a named ViewTransition, so the browser does the motion).
 *
 * PHONE: the desktop bar is not squeezed down. A slim top bar keeps the logo,
 * the phone and a menu button, and the destinations people use most sit in a
 * dock at the bottom, where a thumb already is.
 */
export function SiteNavClient({
  user,
  cartCount,
  unread,
  businessName,
  phone,
  phoneHref,
  email,
  serviceArea,
}: {
  user: NavUser;
  cartCount: number;
  unread: number;
  businessName: string;
  phone: string;
  phoneHref: string;
  email: string;
  serviceArea: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // A little more shadow once the page moves under the bar.
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Navigating closes the menu. Adjusted while rendering, React's pattern for
  // resetting state when an input changes, rather than in an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const barClass = cx(
    "rounded-2xl border bg-surface/92 backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,border-color] duration-300",
    scrolled ? "border-line shadow-md" : "border-line/70 shadow-sm"
  );

  return (
    <>
      {/* ------------------------------ desktop ------------------------------ */}
      <div className="hidden lg:block">
        <div className="mx-auto flex h-10 max-w-page items-center justify-between gap-6 px-8 text-[0.8125rem] text-ink-muted">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPinIcon className="size-3.5 shrink-0 text-accent" />
            <span className="truncate">Delivering across {serviceArea}</span>
          </p>
          <p className="flex shrink-0 items-center gap-5">
            <span>Made fresh, delivered ready to serve</span>
            <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
              <MailIcon className="size-3.5" />
              {email}
            </a>
          </p>
        </div>
      </div>

      <header className="sticky top-3 z-40 hidden lg:block">
        <div className="mx-auto max-w-page px-8">
          <div className={cx("flex h-16 items-center gap-6 pr-2.5 pl-4", barClass)}>
            <Logo name={businessName} />

            <nav aria-label="Main" className="flex flex-1 justify-center">
              <ul className="flex items-center gap-1">
                {DESKTOP_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "relative isolate inline-flex h-10 items-center rounded-full px-4 text-[0.9375rem] font-medium transition-colors duration-200",
                          active ? "text-accent-strong" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
                        )}
                      >
                        {active ? (
                          <ViewTransition name="nav-pill" share="nav-pill" default="none">
                            <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-accent/12" />
                          </ViewTransition>
                        ) : null}
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex shrink-0 items-center gap-1">
              <a
                href={phoneHref}
                aria-label={`Call ${phone}`}
                className="group inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
              >
                <PhoneIcon data-motion="wiggle" className="nav-icon size-4 text-accent" />
                <span className="hidden xl:inline">{phone}</span>
              </a>
              <BasketButton count={cartCount} active={pathname === "/cart"} />
              <AccountMenu user={user} unread={unread} pathname={pathname} />
              <Link
                href="/shop"
                aria-current={isActive(pathname, "/shop") ? "page" : undefined}
                className="group ml-1.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent shadow-xs transition-colors hover:bg-accent-strong"
              >
                Order online
                <ChevronRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------- phone ------------------------------- */}
      <header className="sticky top-2 z-40 px-3 lg:hidden">
        <div className={cx("flex h-14 items-center justify-between gap-2 pr-1.5 pl-2.5", barClass)}>
          <Logo name={businessName} />
          <div className="flex items-center">
            <a href={phoneHref} aria-label={`Call ${phone}`} className={iconButtonClass}>
              <PhoneIcon className="size-5" />
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={iconButtonClass}
            >
              <MenuIcon className="size-5" />
              {unread > 0 ? <span className="absolute top-2 right-2 size-2 rounded-full bg-highlight ring-2 ring-surface" /> : null}
            </button>
          </div>
        </div>
      </header>

      <MobileDock user={user} cartCount={cartCount} pathname={pathname} />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" placement="bottom">
        <nav aria-label="Main">
          <ul className="grid gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors",
                      active ? "bg-accent-soft text-accent-strong" : "text-ink hover:bg-raised"
                    )}
                  >
                    <link.icon data-motion={link.motion} className="nav-icon size-5 text-accent" />
                    <span className="flex-1">{link.label === "Events" ? "Plan an event" : link.label}</span>
                    <ChevronRightIcon className="size-4 text-ink-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          {user ? (
            <div className="grid gap-1">
              <div className="mb-2 flex items-center gap-3 px-3">
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user.email}</p>
                </div>
              </div>
              <AccountLinks user={user} unread={unread} large />
              <form action={logoutAction}>
                <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-base font-medium text-ink-muted hover:bg-raised">
                  <LogOutIcon className="size-5" />
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface text-sm font-semibold shadow-xs">
                Sign in
              </Link>
              <Link href="/signup" className="inline-flex h-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent shadow-xs">
                Create account
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <a href={phoneHref} className="inline-flex items-center gap-2 font-semibold text-accent">
            <PhoneIcon className="size-4" />
            {phone}
          </a>
          <Link href="/policies" className="inline-flex items-center gap-1.5 text-ink-muted">
            <FileTextIcon className="size-4" />
            Policies
          </Link>
        </div>
      </Sheet>
    </>
  );
}

/* --------------------------------- basket ---------------------------------- */

function BasketButton({ count, active }: { count: number; active: boolean }) {
  return (
    <Tooltip label={count > 0 ? `Your order, ${count} ${count === 1 ? "item" : "items"}` : "Your order"}>
      <Link
        href="/cart"
        aria-label={count > 0 ? `Your order, ${count} items` : "Your order"}
        aria-current={active ? "page" : undefined}
        className={cx(iconButtonClass, active && "bg-accent/12 text-accent-strong")}
      >
        <BagIcon data-motion="hop" className="nav-icon size-[1.125rem]" />
        {/* Only shown when there is one. A zero badge reads as an error. */}
        {count > 0 ? (
          <span key={count} className="absolute -top-0.5 -right-0.5">
            <CountBadge count={count} className="bg-accent ring-2 ring-surface" />
          </span>
        ) : null}
      </Link>
    </Tooltip>
  );
}

/* --------------------------------- account --------------------------------- */

function AccountLinks({ user, unread, large }: { user: NonNullable<NavUser>; unread: number; large?: boolean }) {
  const owner = user.role === "owner";
  const items: { href: string; label: string; icon: Icon; badge?: number }[] = owner
    ? [
        { href: "/admin", label: "Owner Portal", icon: GridIcon },
        { href: "/admin/inbox", label: "Inbox", icon: ChatIcon, badge: unread },
        { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
        { href: "/admin/settings", label: "Settings", icon: SlidersIcon },
      ]
    : [
        { href: "/account", label: "Overview", icon: GridIcon },
        { href: "/account/orders", label: "Orders", icon: ReceiptIcon },
        { href: "/account/messages", label: "Messages", icon: ChatIcon, badge: unread },
        { href: "/account/details", label: "Details", icon: SlidersIcon },
      ];

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role={large ? undefined : "menuitem"}
          className={cx(
            "group flex items-center gap-3 rounded-xl px-3 font-medium text-ink transition-colors hover:bg-raised",
            large ? "h-12 text-base" : "h-10 text-sm"
          )}
        >
          <item.icon data-motion="hop" className={cx("nav-icon text-ink-muted", large ? "size-5" : "size-4")} />
          <span className="flex-1">{item.label}</span>
          {item.badge ? <CountBadge count={item.badge} /> : null}
        </Link>
      ))}
    </>
  );
}

function AccountMenu({ user, unread, pathname }: { user: NavUser; unread: number; pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="group inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
      >
        <UserIcon data-motion="hop" className="nav-icon size-4" />
        Sign in
      </Link>
    );
  }

  const inArea = pathname.startsWith(homeFor(user));

  return (
    <div ref={wrapper} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          "group inline-flex h-10 items-center gap-2 rounded-full border py-1 pr-2.5 pl-1 text-sm font-semibold transition-colors",
          inArea || open ? "border-accent/30 bg-accent/10" : "border-line bg-surface shadow-xs hover:bg-raised"
        )}
      >
        <span className="relative">
          <Avatar name={user.name} className="size-8" />
          {unread > 0 ? <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-highlight ring-2 ring-surface" /> : null}
        </span>
        <span className="hidden max-w-28 truncate xl:inline">{user.name.split(" ")[0]}</span>
        <ChevronDownIcon className={cx("size-4 text-ink-subtle transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 pt-2 pb-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="border-t border-line pt-1.5">
            <AccountLinks user={user} unread={unread} />
          </div>
          <form action={logoutAction} className="mt-1.5 border-t border-line pt-1.5">
            <button
              type="submit"
              role="menuitem"
              className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <LogOutIcon data-motion="hop" className="nav-icon size-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------- dock ----------------------------------- */

/**
 * The phone's main navigation, at the bottom of the screen. Five places, the
 * middle one being the thing most people came to do.
 */
function MobileDock({ user, cartCount, pathname }: { user: NavUser; cartCount: number; pathname: string }) {
  const accountHref = user ? homeFor(user) : "/login";
  const items: { href: string; label: string; icon: Icon; badge?: number; primary?: boolean; match?: string }[] = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/catalog", label: "Catalog", icon: BookIcon },
    { href: "/shop", label: "Order", icon: BagIcon, primary: true },
    { href: "/cart", label: "Basket", icon: ReceiptIcon, badge: cartCount },
    { href: accountHref, label: user ? "Account" : "Sign in", icon: UserIcon, match: user ? accountHref : "/login" },
  ];

  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-3 bottom-3 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5 items-center rounded-2xl border border-line bg-surface/95 px-1 shadow-lg backdrop-blur-xl backdrop-saturate-150">
        {items.map((item) => {
          const active = isActive(pathname, item.match ?? item.href);
          return (
            <li key={item.label} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.badge ? `${item.label}, ${item.badge} items` : undefined}
                className={cx(
                  "group relative flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[0.6875rem] font-medium transition-colors active:scale-95",
                  active ? "text-accent-strong" : "text-ink-muted"
                )}
              >
                <span
                  className={cx(
                    "relative grid place-items-center rounded-full transition-[background-color,transform] duration-200 ease-soft",
                    item.primary ? "size-9 bg-accent text-on-accent shadow-sm group-active:scale-90" : "size-7",
                    !item.primary && active && "bg-accent/12"
                  )}
                >
                  <item.icon data-motion="hop" className={cx("nav-icon", item.primary ? "size-[1.125rem]" : "size-5")} />
                  {item.badge ? (
                    <span key={item.badge} className="absolute -top-1.5 -right-2.5">
                      <CountBadge count={item.badge} className="bg-accent ring-2 ring-surface" />
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
