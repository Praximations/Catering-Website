import type { ReactNode } from "react";

/**
 * The small shared pieces. Every one of them is built from the tokens in
 * globals.css, so re-skinning the site still means editing one file.
 *
 * These are plain Server Components with no state. Anything that needs a
 * hook lives in its own "use client" file instead, which keeps the client
 * bundle to the two forms that actually need it.
 */

/*
 * Buttons change colour on hover and nothing else. The lift-and-shadow hover
 * on every clickable thing is another template tell, and on a page with a
 * dozen "Add" buttons it makes the whole grid twitch under the pointer.
 */
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const buttonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const secondaryButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-ink/15 bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/35 hover:bg-raised ${focusRing}`;

/** For a link that should read as a link, with an arrow, not as a button. */
export const textLinkClass =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:text-accent-strong hover:underline";

export const inputClass =
  "w-full rounded-sm border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {children}
      {/* aria-live so a screen reader hears the error when it appears,
          rather than only on the next focus. */}
      {error ? (
        <p id={errorId} aria-live="polite" className="text-xs font-medium text-highlight">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "error" | "success";
  title?: string;
  children?: ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-highlight/30 bg-highlight-soft"
      : tone === "success"
        ? "border-accent/40 bg-accent/5"
        : "border-line bg-raised/70";
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}
    >
      {title ? <p className="font-medium text-ink">{title}</p> : null}
      {children ? <div className="text-ink-muted [&>p]:mt-1 first:[&>p]:mt-0">{children}</div> : null}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-raised px-2 py-0.5 text-xs font-medium text-accent-strong">
      {children}
    </span>
  );
}

/**
 * A page title with an optional line under it.
 *
 * `eyebrow` is for the owner's screens, where a quiet "Dashboard" above the
 * title helps. Public pages leave it out.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 max-w-3xl sm:mb-10">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      {lede ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted sm:mt-4 sm:text-lg">{lede}</p>
      ) : null}
      {children}
    </header>
  );
}

/** A section heading with an optional line of explanation and an action. */
export function SectionHeading({
  id,
  title,
  lede,
  action,
}: {
  id?: string;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {lede ? <p className="mt-3 text-base leading-7 text-ink-muted">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * The practical facts a customer scans for: minimums, notice, area.
 *
 * A definition list, because that is what it is, and so a screen reader reads
 * each figure with the thing it measures rather than as a run of numbers.
 */
export function FactList({
  facts,
  className = "",
}: {
  facts: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4 lg:gap-x-8 ${className}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="border-l-2 border-accent/30 pl-3 sm:pl-4">
          <dt className="text-xs text-ink-muted sm:text-sm">{fact.label}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink sm:text-base">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The honest empty state. AGENTS.md is explicit that nothing may show a
 * fake number, so a list with nothing in it says exactly that.
 */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line px-6 py-14 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}

/**
 * The placeholder a slow page shows while its data loads.
 *
 * Shaped like the page it stands in for rather than being a spinner, so the
 * layout does not jump when the real content arrives. aria-hidden with a
 * single live region: a screen reader should hear "loading" once, not read out
 * a dozen empty boxes.
 */
export function SkeletonPage({ eyebrow, rows = 3 }: { eyebrow: string; rows?: number }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <p className="sr-only" role="status" aria-live="polite">
        Loading {eyebrow.toLowerCase()}
      </p>
      <div aria-hidden className="animate-pulse">
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-3 h-11 w-2/3 max-w-md rounded-md bg-raised" />
        <div className="mt-4 h-4 w-full max-w-xl rounded-sm bg-raised" />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 rounded-md border border-line bg-raised/50" />
          ))}
        </div>

        <div className="mt-10 space-y-4">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="h-28 rounded-lg border border-line bg-raised/40" />
          ))}
        </div>
      </div>
    </main>
  );
}
