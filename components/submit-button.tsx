"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "./ui";

/**
 * A submit button that disables itself while the form is in flight.
 *
 * useFormStatus reads the state of the form it sits INSIDE, which is why
 * this has to be its own component rather than part of the form: a
 * component cannot read its own form's status.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? buttonClass}>
      {pending ? (pendingLabel ?? "Working...") : children}
    </button>
  );
}
