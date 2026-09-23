"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cx } from "./ui";

/**
 * A submit button for something hard to undo, such as cancelling an order.
 * The first press arms it ("Press again to cancel") for a few seconds; the
 * second press submits. No modal to dismiss, and no accidental cancellation
 * from a stray tap.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  className,
  armedClassName,
  name,
  value,
}: {
  children: ReactNode;
  confirmLabel: string;
  className: string;
  armedClassName?: string;
  name?: string;
  value?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3500);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type={armed ? "submit" : "button"}
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (!armed) {
          event.preventDefault();
          setArmed(true);
        }
      }}
      aria-live="polite"
      className={cx(className, armed && armedClassName)}
    >
      {pending ? "Working" : armed ? confirmLabel : children}
    </button>
  );
}
