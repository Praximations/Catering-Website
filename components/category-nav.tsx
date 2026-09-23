"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

/**
 * Section chips that follow the scroll: the chip for the section on screen is
 * highlighted, and tapping one scrolls there. Plain anchor links underneath,
 * so without JavaScript they still jump to the right place.
 */
export function CategoryNav({
  items,
  label,
  className,
}: {
  items: { id: string; label: string }[];
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // A band across the upper middle of the screen decides which section is "current".
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className={cx("sticky top-[4.75rem] z-30 lg:top-20", className)}>
      <ul className="relative -mx-4 flex gap-1.5 overflow-x-auto bg-page/90 px-4 py-2 backdrop-blur-md sm:mx-0 sm:px-0">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={selected ? "true" : undefined}
                className={cx(
                  "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap shadow-xs backdrop-blur-xl transition-[background-color,border-color,color] duration-200",
                  selected
                    ? "border-ink bg-ink text-on-accent"
                    : "border-line bg-surface/90 text-ink-muted hover:border-line-strong hover:text-ink"
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
