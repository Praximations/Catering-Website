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
  "inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

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
        <p id={errorId} aria-live="polite" className="text-xs text-accent-strong">
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
      ? "border-accent-strong/40 bg-accent/5"
      : tone === "success"
        ? "border-accent/40 bg-accent/5"
        : "border-line bg-raised";
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
    <span className="inline-flex items-center rounded-sm border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
      {children}
    </span>
  );
}

/** A page title with an optional line under it. Used by every page but home. */
export function PageHeader({ eyebrow, title, lede }: { eyebrow?: string; title: string; lede?: string }) {
  return (
    <header className="mb-10">
      {eyebrow ? (
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">{eyebrow}</p>
      ) : null}
      <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
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
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}
