"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Sheet } from "./dialog";
import {
  ChatIcon,
  ExternalIcon,
  GridIcon,
  KeyIcon,
  LogOutIcon,
  MenuIcon,
  ReceiptIcon,
  SlidersIcon,
  SparklesIcon,
  TagIcon,
  UsersIcon,
  type Icon,
} from "./icons";
import { Logo } from "./logo";
import { Avatar, CountBadge, cx, iconButtonClass } from "./ui";

export interface PortalCounts {
  pendingOrders: number;
  newQuotes: number;
  inbox: number;
  approvals: number;
}

interface Item {
  href: string;
  label: string;
  icon: Icon;
  motion: "hop" | "tilt" | "wiggle" | "spin";
  badge?: keyof PortalCounts;
  exact?: boolean;
}

/**
 * Everything the owner does, in one list, in the order they do it. The badges
 * are the reason to look: orders waiting to be confirmed, new quote requests,
 * unread messages, and anything the assistant is waiting on.
 */
const ITEMS: Item[] = [
  { href: "/admin", label: "Overview", icon: GridIcon, motion: "hop", exact: true },
  { href: "/admin/orders", label: "Orders", icon: ReceiptIcon, motion: "tilt", badge: "pendingOrders" },
  { href: "/admin/quotes", label: "Quotes", icon: SparklesIcon, motion: "spin", badge: "newQuotes" },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon, motion: "hop" },
  { href: "/admin/inbox", label: "Inbox", icon: ChatIcon, motion: "wiggle", badge: "inbox" },
  { href: "/admin/catalog", label: "Catalog", icon: TagIcon, motion: "tilt" },
  { href: "/admin/settings", label: "Settings", icon: SlidersIcon, motion: "spin" },
  { href: "/admin/praxi", label: "Assistant", icon: KeyIcon, motion: "tilt", badge: "approvals" },
];

const MOBILE_TABS = ["/admin", "/admin/orders", "/admin/inbox", "/admin/customers"];

function isActive(pathname: string, item: Item): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The Owner Portal's navigation: a floating sidebar on a wide screen, and on
 * a phone a slim top bar with the four places used most in a dock at the
 * bottom, the rest one tap away in a sheet.
 */
export function PortalNav({
  businessName,
  owner,
  counts,
}: {
  businessName: string;
  owner: { name: string; email: string };
  counts: PortalCounts;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating closes the sheet: adjusted while rendering, not in an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const links = (size: "sidebar" | "sheet") =>
    ITEMS.map((item) => {
      const active = isActive(pathname, item);
      const badge = item.badge ? counts[item.badge] : 0;
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group relative isolate flex items-center gap-3 rounded-xl px-3 font-medium transition-colors duration-200",
              size === "sidebar" ? "h-10 text-sm" : "h-12 text-base",
              active ? "text-accent-strong" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
            )}
          >
            {active && size === "sidebar" ? (
              <ViewTransition name="portal-pill" share="nav-pill" default="none">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-accent/12" />
              </ViewTransition>
            ) : active ? (
              <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-accent/12" />
            ) : null}
            <item.icon data-motion={item.motion} className={cx("nav-icon shrink-0", size === "sidebar" ? "size-[1.125rem]" : "size-5")} />
            <span className="flex-1">{item.label}</span>
            <CountBadge count={badge} />
          </Link>
        </li>
      );
    });

  return (
    <>
      {/* ------------------------------ sidebar ------------------------------ */}
      <aside className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-60 shrink-0 flex-col rounded-2xl border border-line bg-surface p-3 shadow-sm lg:flex">
        <div className="px-1 pt-1 pb-4">
          <Logo name={businessName} href="/admin" />
          <p className="mt-2 pl-[2.625rem] text-xs text-ink-subtle">Owner Portal</p>
        </div>
        <nav aria-label="Owner Portal" className="flex-1 overflow-y-auto">
          <ul className="grid gap-0.5">{links("sidebar")}</ul>
        </nav>
        <div className="mt-3 border-t border-line pt-3">
          <Link
            href="/"
            className="group flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <ExternalIcon className="size-4" />
            View the site
          </Link>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <Avatar name={owner.name} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{owner.name}</p>
              <p className="truncate text-xs text-ink-subtle">{owner.email}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" aria-label="Sign out" className={cx(iconButtonClass, "size-8")}>
                <LogOutIcon className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ------------------------------- phone ------------------------------- */}
      <header className="sticky top-2 z-40 px-3 lg:hidden">
        <div className="flex h-14 items-center justify-between rounded-2xl border border-line bg-surface/95 pr-1.5 pl-2.5 shadow-sm backdrop-blur-xl">
          <Logo name="Owner Portal" href="/admin" />
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className={iconButtonClass}>
            <MenuIcon className="size-5" />
            {counts.approvals + counts.newQuotes > 0 ? (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-highlight ring-2 ring-surface" />
            ) : null}
          </button>
        </div>
      </header>

      <nav aria-label="Owner Portal quick" className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="grid h-16 grid-cols-5 items-center rounded-2xl border border-line bg-surface/95 px-1 shadow-lg backdrop-blur-xl">
          {ITEMS.filter((item) => MOBILE_TABS.includes(item.href)).map((item) => {
            const active = isActive(pathname, item);
            const badge = item.badge ? counts[item.badge] : 0;
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group relative flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[0.6875rem] font-medium active:scale-95",
                    active ? "text-accent-strong" : "text-ink-muted"
                  )}
                >
                  <span className={cx("relative grid size-7 place-items-center rounded-full transition-colors", active && "bg-accent/12")}>
                    <item.icon data-motion={item.motion} className="nav-icon size-5" />
                    {badge > 0 ? (
                      <span className="absolute -top-1.5 -right-2.5">
                        <CountBadge count={badge} className="ring-2 ring-surface" />
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[0.6875rem] font-medium text-ink-muted active:scale-95"
            >
              <span className="grid size-7 place-items-center">
                <MenuIcon className="size-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Owner Portal">
        <nav aria-label="Owner Portal">
          <ul className="grid gap-1">{links("sheet")}</ul>
        </nav>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
            <ExternalIcon className="size-4" />
            View the site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
              <LogOutIcon className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </Sheet>
    </>
  );
}
