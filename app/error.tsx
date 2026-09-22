"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass, secondaryButtonClass } from "@/components/ui";

/**
 * The error boundary for everything under app/.
 *
 * WHY THE MESSAGE IS VAGUE. React strips the real error out of a production
 * build before it reaches the browser and leaves a digest in its place, which
 * is the right behaviour: a stack trace tells a visitor nothing useful and
 * tells an attacker about the inside of the server. The digest is printed so a
 * customer can quote it and it can be found in the server log.
 *
 * It has to be a Client Component, and it has to accept `reset`, which
 * re-renders the segment that threw. That is genuinely useful here: most
 * failures at this layer are a storage read that timed out, and trying again
 * is the correct response.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The full error is on the server already. This is what makes it visible
    // in a browser console during development.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24 text-center">
      <h1 className="font-display text-5xl text-ink">That did not work.</h1>
      <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-ink-muted">
        Something on our side failed rather than anything you did. Trying again
        often works, because the usual cause is a request that took too long.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass}>
          Try again
        </button>
        <Link href="/" className={secondaryButtonClass}>
          Back to the home page
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-10 text-sm text-ink-subtle">
          If you get in touch, quote this: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
