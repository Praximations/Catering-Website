"use client";

import { useEffect } from "react";

/**
 * Marks a conversation read once it has actually been SEEN, in a browser.
 *
 * Doing this while the page renders on the server would count a link
 * prefetch, which renders the page without anybody looking at it, as the
 * owner having read every message in it. An effect only runs when a person
 * has the page open.
 */
export function MarkRead({ action, arg }: { action: (arg: string) => Promise<void>; arg: string }) {
  useEffect(() => {
    void action(arg);
  }, [action, arg]);
  return null;
}

/** The same, for an action that takes no argument. */
export function MarkReadNoArg({ action }: { action: () => Promise<void> }) {
  useEffect(() => {
    void action();
  }, [action]);
  return null;
}
