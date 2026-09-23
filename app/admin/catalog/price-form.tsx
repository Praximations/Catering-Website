"use client";

import { useActionState, useEffect, useState } from "react";
import { setPriceAction, type OwnerFormState } from "@/app/actions/owner";
import { CheckIcon } from "@/components/icons";
import { cx } from "@/components/ui";

/**
 * An inline price field. Saves on Enter or on the check button, shows a tick
 * when it worked and the guardrail's own words when it did not.
 */
export function PriceForm({ slug, priceMinor, symbol }: { slug: string; priceMinor: number; symbol: string }) {
  const [state, action, pending] = useActionState<OwnerFormState, FormData>(setPriceAction, {});
  const [dismissedAt, setDismissedAt] = useState<number | undefined>(undefined);
  const saved = Boolean(state.ok && state.at && state.at !== dismissedAt);

  useEffect(() => {
    if (!state.ok || !state.at) return;
    const at = state.at;
    const timer = window.setTimeout(() => setDismissedAt(at), 1800);
    return () => window.clearTimeout(timer);
  }, [state.ok, state.at]);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex items-center gap-1">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-subtle">{symbol}</span>
          <label htmlFor={`price-${slug}`} className="sr-only">
            Price
          </label>
          <input
            id={`price-${slug}`}
            name="price"
            inputMode="decimal"
            defaultValue={(priceMinor / 100).toFixed(2)}
            className="h-9 w-24 rounded-full border border-line bg-surface pr-3 pl-6 text-right text-sm font-medium tabular-nums outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-label="Save price"
          className={cx(
            "grid size-9 place-items-center rounded-full border transition-colors",
            saved ? "border-accent bg-accent text-on-accent" : "border-line bg-surface text-ink-muted hover:text-ink"
          )}
        >
          <CheckIcon className={cx("size-4", saved && "animate-pop")} />
        </button>
      </div>
      {state.error ? <p className="max-w-56 text-right text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
