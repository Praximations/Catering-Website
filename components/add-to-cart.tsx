"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCartWithFeedbackAction, type AddToCartState } from "@/app/actions/cart";
import { BagIcon, CheckIcon, MinusIcon, PlusIcon } from "./icons";
import { button, cx } from "./ui";

/** Tells anything listening (the signup prompt) that the basket just grew. */
export const CART_ADDED_EVENT = "catering:cart-added";

/**
 * Add to the order, with a quantity stepper and a confirmation.
 *
 * The price is never here: the form sends a slug and a quantity, and the
 * server prices the basket from the catalog. The stepper is a real number
 * input underneath, so typing works and so does submitting without JavaScript.
 */
export function AddToCart({
  slug,
  min,
  step = 1,
  unitLabel,
  withQuantity = true,
  label = "Add",
  size = "md",
  fullWidth,
}: {
  slug: string;
  min: number;
  /** How far one press of plus or minus moves. Typing any number still works. */
  step?: number;
  /** "People", "Sandwiches": what the number counts. */
  unitLabel?: string;
  withQuantity?: boolean;
  label?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const [state, action] = useActionState<AddToCartState, FormData>(addToCartWithFeedbackAction, { status: "idle" });
  const [quantity, setQuantity] = useState(min);
  // "Added" shows for the latest add until its timer dismisses it.
  const [dismissedAt, setDismissedAt] = useState<number | undefined>(undefined);
  const showAdded = state.status === "added" && state.at !== undefined && state.at !== dismissedAt;

  useEffect(() => {
    if (state.status !== "added" || !state.at) return;
    window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
    const at = state.at;
    const timer = window.setTimeout(() => setDismissedAt(at), 1800);
    return () => window.clearTimeout(timer);
  }, [state.status, state.at]);

  const inputId = `qty-${slug}`;

  return (
    <form action={action} className={cx("flex flex-col gap-2", fullWidth && "w-full")}>
      <input type="hidden" name="slug" value={slug} />
      <div className="flex items-center gap-2">
        {withQuantity ? (
          <div className="flex h-11 items-center rounded-full border border-line bg-surface shadow-xs transition-[border-color,box-shadow] has-[input:focus-visible]:border-accent has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-accent/10">
            <button
              type="button"
              aria-label="Fewer"
              onClick={() => setQuantity((value) => Math.max(min, value - step))}
              disabled={quantity <= min}
              className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:text-ink active:scale-90 disabled:opacity-35"
            >
              <MinusIcon className="size-4" />
            </button>
            <label htmlFor={inputId} className="sr-only">
              {unitLabel ?? "Quantity"}
            </label>
            <input
              id={inputId}
              name="quantity"
              type="number"
              inputMode="numeric"
              min={min}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(0, Number(event.target.value) || 0))}
              onBlur={() => setQuantity((value) => Math.max(min, value))}
              className="w-12 [appearance:textfield] bg-transparent text-center text-sm font-semibold text-ink tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="More"
              onClick={() => setQuantity((value) => value + step)}
              className="grid size-10 place-items-center rounded-full text-ink-muted transition-colors hover:text-ink active:scale-90"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
        ) : (
          <input type="hidden" name="quantity" value={min} />
        )}
        <AddButton label={label} added={showAdded} size={size} fullWidth={fullWidth || !withQuantity} />
      </div>
      {state.status === "error" ? (
        <p role="alert" className="animate-fade-in text-xs font-medium text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function AddButton({
  label,
  added,
  size,
  fullWidth,
}: {
  label: string;
  added: boolean;
  size: "sm" | "md";
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className={cx(button(added ? "secondary" : "primary", size === "sm" ? "sm" : "md"), fullWidth ? "flex-1" : "", "min-w-24")}
    >
      {added ? (
        <>
          <CheckIcon className="size-4 animate-pop text-accent" />
          Added
        </>
      ) : pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-on-accent/40 border-t-on-accent" />
          Adding
        </>
      ) : (
        <>
          <BagIcon className="size-4" />
          {label}
        </>
      )}
    </button>
  );
}
