import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronDownIcon, type Icon } from "./icons";

/**
 * THE SHARED PIECES. Every screen is assembled from these, which is what makes
 * the public site, the account area and the Owner Portal read as one product.
 *
 * Plain Server Components with no state. Anything that needs a hook lives in
 * its own "use client" file (dialog.tsx, motion.tsx, forms), which keeps the
 * client bundle to the parts that are actually interactive.
 *
 * The rules they encode:
 *   Buttons are pills. Cards are rounded-xl on a white surface with a hairline
 *   and the softest shadow. Inputs are rounded-md. Status is a coloured pill
 *   with an icon, never colour alone. Motion is transform and opacity only,
 *   150 to 250 ms, and it respects reduced motion (see globals.css).
 */

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* --------------------------------- buttons --------------------------------- */

const buttonBase =
  "group/button inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55";

const buttonSizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

const buttonVariants = {
  primary: "bg-accent text-on-accent shadow-xs hover:bg-accent-strong hover:shadow-sm",
  secondary:
    "border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-raised",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink",
  danger: "border border-danger/25 bg-surface text-danger hover:bg-danger-soft",
  inverse: "bg-surface text-ink shadow-xs hover:bg-raised",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function button(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return cx(buttonBase, buttonSizes[size], buttonVariants[variant]);
}

/** The three the pages use most, as plain strings. */
export const buttonClass = button("primary");
export const secondaryButtonClass = button("secondary");
export const ghostButtonClass = button("ghost");

/** A square, round, icon-only button. Pair it with an aria-label or a Tooltip. */
export const iconButtonClass =
  "group relative inline-grid size-10 shrink-0 place-items-center rounded-full text-ink-muted transition-[background-color,color,transform] duration-200 ease-soft hover:bg-ink/5 hover:text-ink active:scale-90";

/** For a link that should read as a link, with an arrow that nudges on hover. */
export const textLinkClass =
  "group inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 transition-colors hover:text-accent-strong";

/** The arrow inside a textLink or button: moves two pixels toward where it goes. */
export const nudgeClass =
  "size-4 transition-transform duration-200 ease-soft group-hover:translate-x-0.5 group-hover/button:translate-x-0.5";

/* ---------------------------------- fields --------------------------------- */

const control =
  "w-full rounded-md border border-line bg-surface text-sm text-ink shadow-xs outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-subtle hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/10 aria-[invalid=true]:border-danger/60 aria-[invalid=true]:ring-danger/10";

export const inputClass = `${control} h-11 px-3.5`;
export const textareaClass = `${control} px-3.5 py-3 leading-6`;
export const selectClass = `${control} h-11 appearance-none bg-no-repeat px-3.5 pr-9`;

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-subtle">Optional</span> : null}
      </label>
      {children}
      {/* aria-live so a screen reader hears the error when it appears. */}
      {error ? (
        <p id={`${htmlFor}-error`} aria-live="polite" className="animate-fade-in text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- surfaces ------------------------------- */

export const cardClass = "rounded-xl border border-line bg-surface shadow-xs";

/** A card that is itself a link: lifts its shadow and border on hover. */
export const interactiveCardClass = `${cardClass} transition-[box-shadow,border-color,transform] duration-200 ease-soft hover:border-line-strong hover:shadow-md`;

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside" | "li";
}) {
  return <Tag className={cx(cardClass, className)}>{children}</Tag>;
}

/** A titled block inside a card or a page: small heading, optional action. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={className} aria-labelledby={id ? `${id}-title` : undefined} id={id}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="font-display text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** The top of a page: one title, one optional line, actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {lede ? <p className="mt-2 text-base leading-7 text-ink-muted">{lede}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** The page's outer container, so every page has the same gutters. */
export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "narrow" | "default" | "wide";
}) {
  const width = size === "narrow" ? "max-w-3xl" : size === "wide" ? "max-w-7xl" : "max-w-6xl";
  return <div className={cx("mx-auto w-full px-4 sm:px-6", width, className)}>{children}</div>;
}

/* ----------------------------------- pills --------------------------------- */

export type Tone = "neutral" | "accent" | "warning" | "danger" | "info" | "highlight" | "muted";

const toneClass: Record<Tone, string> = {
  neutral: "bg-raised text-ink",
  accent: "bg-accent-soft text-accent-strong",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  highlight: "bg-highlight-soft text-highlight",
  muted: "bg-raised text-ink-subtle",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-ink-muted",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  highlight: "bg-highlight",
  muted: "bg-ink-subtle",
};

/**
 * A small status label. `live` adds a soft ping to the dot, for states that
 * are waiting on somebody (a new order, an unread message), so the eye finds
 * them without reading every row.
 */
export function Pill({
  tone = "neutral",
  icon: IconGlyph,
  dot,
  live,
  children,
  className,
}: {
  tone?: Tone;
  icon?: Icon;
  dot?: boolean;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "relative inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className
      )}
    >
      {IconGlyph ? <IconGlyph className="size-3.5 shrink-0" /> : null}
      {dot || live ? (
        <span className="relative inline-flex size-1.5">
          {live ? <span className={cx("absolute inset-0 rounded-full animate-ping-soft", dotClass[tone])} /> : null}
          <span className={cx("relative size-1.5 rounded-full", dotClass[tone])} />
        </span>
      ) : null}
      {/* Marked so a tight row can hide the words on a phone and keep the icon. */}
      <span data-pill-label="">{children}</span>
    </span>
  );
}

/** Kept for the few places that want a neutral label. */
export function Badge({ children }: { children: ReactNode }) {
  return <Pill tone="neutral">{children}</Pill>;
}

/** A round count, for unread messages and waiting items. Hidden at zero. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cx(
        "inline-grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-highlight px-1.5 text-[0.6875rem] font-bold leading-none text-on-accent",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ---------------------------------- alerts --------------------------------- */

export function Alert({
  tone = "info",
  title,
  icon: IconGlyph,
  children,
  className,
}: {
  tone?: "info" | "error" | "success" | "warning";
  title?: string;
  icon?: Icon;
  children?: ReactNode;
  className?: string;
}) {
  const style =
    tone === "error"
      ? "border-danger/20 bg-danger-soft text-danger"
      : tone === "success"
        ? "border-accent/20 bg-accent-soft text-accent-strong"
        : tone === "warning"
          ? "border-warning/20 bg-warning-soft text-warning"
          : "border-line bg-raised text-ink";
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cx("flex animate-fade-in gap-3 rounded-lg border px-4 py-3 text-sm", style, className)}
    >
      {IconGlyph ? <IconGlyph className="mt-0.5 size-4 shrink-0" /> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cx("leading-6 opacity-90", title ? "mt-0.5" : "")}>{children}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------- empty states ----------------------------- */

/**
 * The honest empty state. AGENTS.md: nothing shows a fake number, so a list
 * with nothing in it says exactly that, and offers the one useful next step.
 */
export function EmptyState({
  icon: IconGlyph,
  title,
  children,
  action,
  className,
}: {
  icon?: Icon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      {IconGlyph ? (
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-raised text-ink-muted">
          <IconGlyph className="size-5" />
        </span>
      ) : null}
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------- data display ------------------------------ */

/** One headline number. Real zeros are shown as zeros, never as a sample. */
export function Stat({
  label,
  value,
  hint,
  icon: IconGlyph,
  href,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: Icon;
  href?: string;
  tone?: Tone;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{label}</p>
        {IconGlyph ? (
          <span className={cx("grid size-8 place-items-center rounded-full", toneClass[tone])}>
            <IconGlyph className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cx(interactiveCardClass, "block p-4 sm:p-5")}>
      {body}
    </Link>
  ) : (
    <div className={cx(cardClass, "p-4 sm:p-5")}>{body}</div>
  );
}

/** Label and value pairs. A definition list, because that is what it is. */
export function KeyValues({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; icon?: Icon }[];
  className?: string;
}) {
  return (
    <dl className={cx("divide-y divide-line", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-6 py-3 text-sm first:pt-0 last:pb-0">
          <dt className="flex items-center gap-2 text-ink-muted">
            {item.icon ? <item.icon className="size-4 text-ink-subtle" /> : null}
            {item.label}
          </dt>
          <dd className="min-w-0 text-right font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The practical facts a customer scans for, as quiet chips rather than a row
 * of bordered boxes: icon, value, and the thing it measures.
 */
export function FactChips({
  facts,
  className,
}: {
  facts: { label: string; value: ReactNode; icon: Icon }[];
  className?: string;
}) {
  return (
    <dl className={cx("flex flex-wrap gap-2", className)}>
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-2 text-sm shadow-xs"
        >
          <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent">
            <fact.icon className="size-3.5" />
          </span>
          <dt className="sr-only">{fact.label}</dt>
          <dd className="text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------ progressive disclosure --------------------- */

/**
 * Detail that is there when wanted and out of the way when not. A native
 * <details>, so it works without JavaScript and is in the page for search;
 * globals.css animates its height.
 */
export function Disclosure({
  summary,
  meta,
  children,
  defaultOpen,
  className,
  bordered = true,
  metaWhenClosed,
}: {
  summary: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  /** The meta previews what is inside, so it steps aside once that is showing. */
  metaWhenClosed?: boolean;
  defaultOpen?: boolean;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <details open={defaultOpen} className={cx("disclosure group/disclosure", bordered ? cardClass : "", className)}>
      <summary
        className={cx(
          "flex cursor-pointer items-center justify-between gap-4 rounded-xl text-left text-sm font-medium text-ink transition-colors hover:text-accent-strong",
          bordered ? "px-4 py-3.5 sm:px-5" : "py-3"
        )}
      >
        <span className="min-w-0 flex-1">{summary}</span>
        {meta ? (
          <span className={cx("shrink-0 text-ink-muted", metaWhenClosed && "group-open/disclosure:hidden")}>{meta}</span>
        ) : null}
        <ChevronDownIcon className="disclosure-chevron size-4 shrink-0 text-ink-subtle transition-transform duration-200 ease-soft" />
      </summary>
      <div className={bordered ? "border-t border-line px-4 py-4 sm:px-5" : "pb-4"}>{children}</div>
    </details>
  );
}

/* ---------------------------------- tooltip -------------------------------- */

/**
 * A hover and focus label. CSS only: it appears after a short delay so it does
 * not flash while the pointer crosses a toolbar. The wrapped control keeps its
 * own accessible name; this is the sighted-user equivalent of it.
 */
export function Tooltip({
  label,
  children,
  side = "bottom",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cx("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-on-accent opacity-0 shadow-md transition-[opacity,transform] duration-150 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-focus-within/tip:opacity-100",
          side === "bottom"
            ? "top-full mt-2 translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0"
            : "bottom-full mb-2 -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0"
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ----------------------------------- tabs ---------------------------------- */

/**
 * Link tabs, as a segmented control. Each tab is a real URL, so a view can be
 * bookmarked and the back button works; the active one is a raised pill.
 */
export function Tabs({
  items,
  active,
  className,
  label,
}: {
  items: { href: string; label: string; count?: number; icon?: Icon }[];
  active: string;
  className?: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className={cx("relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="inline-flex min-w-max gap-1 rounded-full border border-line bg-surface p-1 shadow-xs">
        {items.map((item) => {
          const selected = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                scroll={false}
                className={cx(
                  "group inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-[background-color,color] duration-200",
                  selected ? "bg-ink text-on-accent" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
                )}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                {item.label}
                {item.count !== undefined ? (
                  <span
                    className={cx(
                      "tabular-nums text-xs",
                      selected ? "text-on-accent/70" : "text-ink-subtle"
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------------------------------- misc ----------------------------------- */

/** Initials in a circle. Never an image: there is no avatar upload. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className={cx(
        "inline-grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong",
        className
      )}
    >
      {initials}
    </span>
  );
}

/** An icon in a soft round tile, used to anchor a card or a list row. */
export function IconTile({ icon: IconGlyph, tone = "accent", className }: { icon: Icon; tone?: Tone; className?: string }) {
  return (
    <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", toneClass[tone], className)}>
      <IconGlyph className="size-5" />
    </span>
  );
}

/**
 * Stagger helper for scroll reveals. Spread onto any element:
 * <li {...reveal(index)}>. Only elements that start below the fold are ever
 * hidden; see components/motion.tsx.
 */
export function reveal(index = 0, step = 60): { "data-reveal": ""; style?: CSSProperties } {
  return index > 0
    ? { "data-reveal": "", style: { ["--reveal-delay" as string]: `${Math.min(index, 8) * step}ms` } }
    : { "data-reveal": "" };
}

/**
 * The placeholder a slow page shows while its data loads, shaped like the page
 * so the layout does not jump. One live region, so a screen reader hears
 * "loading" once rather than a dozen empty boxes.
 */
export function SkeletonPage({ label, rows = 3 }: { label: string; rows?: number }) {
  const bar = "rounded-md bg-sunken/70";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="sr-only" role="status" aria-live="polite">
        Loading {label.toLowerCase()}
      </p>
      <div aria-hidden className="animate-pulse">
        <div className={cx(bar, "h-9 w-56")} />
        <div className={cx(bar, "mt-3 h-4 w-80 max-w-full")} />
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 rounded-xl bg-surface shadow-xs" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="h-20 rounded-xl bg-surface shadow-xs" />
          ))}
        </div>
      </div>
    </div>
  );
}
