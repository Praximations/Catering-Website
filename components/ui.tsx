import type { ReactNode } from "react";

/**
 * The small shared pieces. Every one of them is built from the tokens in
 * globals.css, so re-skinning the site still means editing one file.
 *
 * These are plain Server Components with no state. Anything that needs a
 * hook lives in its own "use client" file instead, which keeps the client
 * bundle to the two forms that actually need it.
 */

export const buttonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-accent px-6 py-3 text-sm font-bold text-on-accent shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-line bg-surface px-6 py-3 text-sm font-bold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink shadow-sm placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

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
    <span className="inline-flex items-center rounded-full bg-raised px-2.5 py-1 text-xs font-semibold text-accent-strong">
      {children}
    </span>
  );
}

/** A page title with an optional line under it. Used by every page but home. */
export function PageHeader({ eyebrow, title, lede }: { eyebrow?: string; title: string; lede?: string }) {
  return (
    <header className="mb-12 max-w-2xl">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">{eyebrow}</p>
      ) : null}
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-[-0.025em] text-ink sm:text-5xl">
        {title}
      </h1>
      {lede ? <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">{lede}</p> : null}
    </header>
  );
}

/**
 * The honest empty state. AGENTS.md is explicit that nothing may show a
 * fake number, so a list with nothing in it says exactly that.
 */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg bg-raised/70 px-6 py-14 text-center">
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
