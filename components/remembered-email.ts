"use client";

import { useEffect, useState } from "react";

/**
 * The email address somebody typed, remembered for this browser tab.
 *
 * So it survives everything between typing it and being signed in: a wrong
 * password, switching from sign in to sign up, a failed sign up, going back to
 * the site and returning. sessionStorage, so it is gone when the tab closes,
 * and ONLY the email: a password is never stored anywhere on the client.
 */
const KEY = "catering:auth-email";

export function useRememberedEmail(initial: string): [string, (value: string) => void] {
  const [email, setEmail] = useState(initial);

  // Fill from the tab's memory only when nothing better was provided.
  // After hydration, so the server and the first client render agree.
  useEffect(() => {
    if (initial) return;
    const timer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(KEY);
        if (stored) setEmail((current) => current || stored);
      } catch {
        // Storage unavailable: the field simply starts empty.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial]);

  const update = (value: string) => {
    setEmail(value);
    try {
      window.sessionStorage.setItem(KEY, value.slice(0, 254));
    } catch {
      // Nothing to do.
    }
  };

  return [email, update];
}
