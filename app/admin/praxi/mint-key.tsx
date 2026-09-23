"use client";

import { useActionState } from "react";
import { mintKeyAction, type KeyState } from "@/app/actions/praxi";
import { SubmitButton } from "@/components/submit-button";
import { Alert, button, inputClass } from "@/components/ui";

/**
 * Minting a control key. The token comes back exactly once, so the copy
 * around it has to be clear that this is the only time it will be shown.
 */
export function MintKey() {
  const [state, formAction] = useActionState<KeyState | undefined, FormData>(
    mintKeyAction,
    undefined
  );

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="label" className="text-xs font-medium text-ink-muted">
            What is this key for
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="Praxi"
            className={inputClass}
          />
        </div>
        <SubmitButton pendingLabel="Creating" className={button("secondary")}>
          Create a key
        </SubmitButton>
      </form>

      {state?.error ? (
        <div className="mt-4">
          <Alert tone="error">{state.error}</Alert>
        </div>
      ) : null}

      {state?.token ? (
        <div className="mt-4">
          <Alert tone="success" title="Copy this now. It will not be shown again.">
            <code className="mt-2 block break-all rounded-md border border-line bg-page px-3 py-2 font-mono text-xs text-ink">
              {state.token}
            </code>
            <p className="mt-3">
              Put it in Praxi as this site&apos;s control key. Only the first few characters are
              kept here, so if it is lost, revoke it and make another.
            </p>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
