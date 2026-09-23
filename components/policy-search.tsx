"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { SearchIcon, XIcon } from "./icons";
import { cardClass, cx, inputClass } from "./ui";

interface Entry {
  slug: string;
  policy: string;
  id: string;
  heading: string;
  text: string;
}

/** The sentence around the first match, so a result shows why it matched. */
function snippet(text: string, query: string): { before: string; match: string; after: string } | null {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return null;
  const start = Math.max(0, at - 60);
  const end = Math.min(text.length, at + query.length + 80);
  return {
    before: `${start > 0 ? "..." : ""}${text.slice(start, at)}`,
    match: text.slice(at, at + query.length),
    after: `${text.slice(at + query.length, end)}${end < text.length ? "..." : ""}`,
  };
}

/** Search across every policy at once, with the matching words shown. */
export function PolicySearch({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const results =
    deferred.length < 2
      ? []
      : entries.filter((entry) => `${entry.heading} ${entry.text}`.toLowerCase().includes(deferred.toLowerCase())).slice(0, 8);

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-subtle" />
        <label htmlFor="policy-search" className="sr-only">
          Search the policies
        </label>
        <input
          id="policy-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search: refund, allergy, cookies, delivery..."
          className={cx(inputClass, "h-12 rounded-full pr-4 pl-11 text-base shadow-sm")}
        />
      </div>
      {deferred.length >= 2 ? (
        <div aria-live="polite" className="mt-3">
          {results.length === 0 ? (
            <p className="px-2 text-sm text-ink-muted">Nothing matches &ldquo;{deferred}&rdquo;.</p>
          ) : (
            <ul className={cx(cardClass, "animate-fade-in divide-y divide-line overflow-hidden")}>
              {results.map((entry) => {
                const part = snippet(entry.text, deferred) ?? { before: entry.text.slice(0, 120), match: "", after: "" };
                return (
                  <li key={`${entry.slug}-${entry.id}`}>
                    <Link href={`/policies/${entry.slug}#${entry.id}`} className="block px-4 py-3 transition-colors hover:bg-raised/60">
                      <span className="text-xs text-ink-subtle">{entry.policy}</span>
                      <span className="block text-sm font-medium text-ink">{entry.heading}</span>
                      <span className="mt-0.5 block text-sm text-ink-muted">
                        {part.before}
                        {part.match ? <mark className="rounded bg-highlight-soft px-0.5 text-ink">{part.match}</mark> : null}
                        {part.after}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Filter the sections of the policy on screen. The sections are rendered on
 * the server; this only hides the ones that do not mention what was typed.
 */
export function SectionFilter() {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const needle = query.trim().toLowerCase();
    const sections = document.querySelectorAll<HTMLElement>("[data-policy-section]");
    let visible = 0;
    sections.forEach((section) => {
      const match = !needle || (section.textContent ?? "").toLowerCase().includes(needle);
      section.hidden = !match;
      if (match) visible += 1;
    });
    // Reported from a frame callback, not synchronously inside the effect.
    const frame = requestAnimationFrame(() => setShown(needle ? visible : null));
    return () => cancelAnimationFrame(frame);
  }, [query]);

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" />
      <label htmlFor="section-filter" className="sr-only">
        Find in this policy
      </label>
      <input
        id="section-filter"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find in this policy"
        className={cx(inputClass, "h-10 rounded-full pr-9 pl-10")}
      />
      {query ? (
        <button type="button" aria-label="Clear" onClick={() => setQuery("")} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-subtle hover:bg-ink/5">
          <XIcon className="size-3.5" />
        </button>
      ) : null}
      {shown !== null ? (
        <p aria-live="polite" className="mt-2 px-2 text-xs text-ink-muted">
          {shown === 0 ? "No section mentions that." : `${shown} ${shown === 1 ? "section" : "sections"}`}
        </p>
      ) : null}
    </div>
  );
}
