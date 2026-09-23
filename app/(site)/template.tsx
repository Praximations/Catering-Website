import { ViewTransition, type ReactNode } from "react";

/**
 * The page transition. A template, unlike a layout, remounts on every
 * navigation, which is what lets React see the old page leave and the new one
 * arrive. The browser's View Transitions API does the animation (globals.css,
 * the `.page` class); browsers without it simply swap pages, as they always
 * did. The navbar opts out by name so it stays still while content changes.
 */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
