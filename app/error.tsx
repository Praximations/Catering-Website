"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertIcon } from "@/components/icons";
import { button } from "@/components/ui";

/**
 * The error boundary for everything under app/.
 *
 * WHY THE MESSAGE IS VAGUE. React strips the real error from a production
 * build and leaves a digest, which is right: a stack trace tells a visitor
 * nothing and tells an attacker about the server. The digest is shown so a
 * customer can quote it and it can be found in the server log.
 *
 * `reset` re-renders the segment that threw, which is genuinely useful: most
 * failures here are a storage read that timed out, and trying again works.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="grid size-14 animate-pop place-items-center rounded-full bg-warning-soft text-warning">
        <AlertIcon className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">That did not work</h1>
      <p className="mt-2 text-ink-muted">Something on our side failed, not anything you did. Trying again usually works.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className={button("primary")}>
          Try again
        </button>
        <Link href="/" className={button("secondary")}>
          Home
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-8 text-sm text-ink-subtle">
          If you get in touch, quote <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
