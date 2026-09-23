"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { ChatIcon, GridIcon, ReceiptIcon, SlidersIcon, type Icon } from "./icons";
import { CountBadge, cx } from "./ui";

/**
 * Icons by name. A Server Component cannot hand a function (an icon
 * component) to a Client Component, so layouts name the icon instead.
 */
const ICONS = {
  grid: GridIcon,
  receipt: ReceiptIcon,
  chat: ChatIcon,
  sliders: SlidersIcon,
} satisfies Record<string, Icon>;

export type NavTabIcon = keyof typeof ICONS;

/**
 * Section tabs for an area with its own pages (the account, the portal's
 * inbox). Each tab is a real URL. The active pill slides between tabs on
 * navigation, the same way the navbar's does.
 */
export function NavTabs({
  items,
  label,
  group,
  className,
}: {
  items: { href: string; label: string; icon?: NavTabIcon; badge?: number; exact?: boolean }[];
  label: string;
  /** Unique per tab set on a page, so two sets never share a sliding pill. */
  group: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={cx("relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="inline-flex min-w-max gap-1 rounded-full border border-line bg-surface p-1 shadow-xs">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = item.icon ? ICONS[item.icon] : null;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "group relative isolate inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-200",
                  active ? "text-on-accent" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
                )}
              >
                {active ? (
                  <ViewTransition name={`${group}-tab`} share="nav-pill" default="none">
                    <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-ink shadow-sm" />
                  </ViewTransition>
                ) : null}
                {ItemIcon ? <ItemIcon data-motion="hop" className="nav-icon size-4" /> : null}
                {item.label}
                {item.badge ? <CountBadge count={item.badge} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
