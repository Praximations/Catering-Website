"use client";

import { useActionState } from "react";
import { clearAnnouncementAction, setAnnouncementAction, type OwnerFormState } from "@/app/actions/owner";
import { BellIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { button, cx, inputClass } from "@/components/ui";

/** The notice across the top of the site: write it, see it, clear it. */
export function NoticeForm({ current }: { current: string | null }) {
  const [state, action] = useActionState<OwnerFormState, FormData>(setAnnouncementAction, {});

  return (
    <div className="space-y-3">
      {current ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-highlight-soft px-4 py-2.5 text-sm text-highlight">
          <span className="flex min-w-0 items-center gap-2">
            <BellIcon className="size-4 shrink-0" />
            <span className="truncate">{current}</span>
          </span>
          <form action={clearAnnouncementAction}>
            <SubmitButton pendingLabel="" className="rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-highlight/10">
              Clear
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No notice is showing.</p>
      )}
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="notice" className="sr-only">
          Notice
        </label>
        <input id="notice" name="message" maxLength={200} placeholder="Closed 24 to 26 December" className={cx(inputClass, "flex-1")} />
        <SubmitButton pendingLabel="Saving" className={button("primary")}>
          {current ? "Replace" : "Show notice"}
        </SubmitButton>
      </form>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
