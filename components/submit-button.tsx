"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./ui";

/**
 * A submit button that disables itself while its form is in flight, and
 * shows a small spinner beside the pending label.
 *
 * useFormStatus reads the state of the form it sits INSIDE, which is why this
 * is its own component: a component cannot read its own form's status.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className ?? buttonClass}
    >
      {pending && pendingLabel !== "" ? (
        <>
          <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {pendingLabel ?? "Working"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
