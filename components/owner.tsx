import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon, SearchIcon, type Icon } from "./icons";
import { cx, inputClass, type Tone } from "./ui";

/**
 * Pieces the Owner Portal's pages share, so a list of orders and a list of
 * quotes look like the same product.
 */

/** A calendar-page date: month over day. Scannable down a list. */
export function DateTile({ iso, muted }: { iso: string; muted?: boolean }) {
  const date = new Date(`${iso}T00:00:00`);
  const valid = !Number.isNaN(date.getTime());
  return (
    <span
      className={cx(
        "grid size-12 shrink-0 place-items-center rounded-xl text-center",
        muted ? "bg-raised text-ink-subtle" : "bg-accent-soft text-accent-strong"
      )}
    >
      <span className="block text-[0.625rem] leading-none font-semibold uppercase">
        {valid ? date.toLocaleDateString("en-US", { month: "short" }) : ""}
      </span>
      <span className="-mt-0.5 block font-display text-lg leading-tight font-semibold">{valid ? date.getDate() : "?"}</span>
    </span>
  );
}

/**
 * A search box that filters a list through the URL (?q=), so the result can
 * be bookmarked and the back button works. A plain GET form: no JavaScript.
 */
export function SearchBox({
  action,
  defaultValue,
  placeholder,
  hidden = {},
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" role="search" className="relative w-full sm:max-w-xs">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
      <label htmlFor="search" className="sr-only">
        {placeholder}
      </label>
      <input id="search" name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className={cx(inputClass, "h-10 rounded-full pl-10")} />
    </form>
  );
}

/** One row of a list that opens a detail page. */
export function ListRow({
  href,
  leading,
  title,
  subtitle,
  trailing,
  meta,
}: {
  href: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/60 sm:gap-4 sm:px-5">
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{title}</span>
          {subtitle ? <span className="block truncate text-sm text-ink-muted">{subtitle}</span> : null}
        </span>
        {meta ? <span className="hidden text-right text-sm text-ink-muted sm:block">{meta}</span> : null}
        {/* On a phone the pills keep their icon and the name keeps the room;
            the words stay for screen readers and return from sm up. */}
        {trailing ? (
          <span className="flex shrink-0 flex-wrap justify-end gap-1.5 max-sm:[&_[data-pill-label]]:sr-only max-sm:[&>span]:px-1.5">
            {trailing}
          </span>
        ) : null}
        <ChevronRightIcon className="size-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

const attentionTone: Record<Tone, string> = {
  neutral: "bg-raised text-ink",
  accent: "bg-accent-soft text-accent-strong",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  highlight: "bg-highlight-soft text-highlight",
  muted: "bg-raised text-ink-subtle",
};

/** One thing waiting on the owner, with how many and where to go. */
export function AttentionItem({
  href,
  icon: IconGlyph,
  label,
  detail,
  count,
  tone = "warning",
}: {
  href: string;
  icon: Icon;
  label: string;
  detail?: string;
  count?: number;
  tone?: Tone;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/60 sm:px-5">
        <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", attentionTone[tone])}>
          <IconGlyph className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{label}</span>
          {detail ? <span className="block truncate text-xs text-ink-muted">{detail}</span> : null}
        </span>
        {count !== undefined ? <span className="font-display text-lg font-semibold tabular-nums">{count}</span> : null}
        <ChevronRightIcon className="size-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

/** A link to a map search for an address, for lists where a map would be heavy. */
export function mapSearchUrl(address: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
}
