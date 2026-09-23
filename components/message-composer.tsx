"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { MessageFormState } from "@/app/actions/messages";
import { AlertIcon, PhoneIcon, SendIcon } from "./icons";
import { Alert, cx } from "./ui";

/**
 * Write a message. Grows as you type, sends with the button or with
 * Ctrl/Cmd+Enter, and clears itself only once the message is saved, so a
 * failed send never loses what was written.
 *
 * `hidden` carries whatever identifies the conversation (an order token, a
 * thread key); `extra` is any optional control (which order it is about).
 */
export function MessageComposer({
  action,
  hidden,
  placeholder = "Write a message",
  allowChangeRequest,
  smsAvailable,
  smsDefault,
  extra,
}: {
  action: (state: MessageFormState, formData: FormData) => Promise<MessageFormState>;
  hidden: Record<string, string>;
  placeholder?: string;
  allowChangeRequest?: boolean;
  /** Owner only: the text-message copy is possible for this conversation. */
  smsAvailable?: boolean;
  smsDefault?: boolean;
  extra?: ReactNode;
}) {
  const [state, formAction] = useActionState<MessageFormState, FormData>(action, {});
  const [body, setBody] = useState("");
  const [changeRequest, setChangeRequest] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // A successful send clears the box, once per send (keyed on `at`). Adjusted
  // while rendering, React's pattern for resetting state on a new input.
  const [clearedAt, setClearedAt] = useState(state.at);
  if (state.ok && state.at !== clearedAt) {
    setClearedAt(state.at);
    setBody("");
    setChangeRequest(false);
  }

  useEffect(() => {
    if (state.ok && state.at) textarea.current?.focus();
  }, [state.ok, state.at]);

  // Grow with the text, up to a point.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [body]);

  return (
    <form ref={form} action={formAction} className="space-y-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {allowChangeRequest ? <input type="hidden" name="kind" value={changeRequest ? "change_request" : "message"} /> : null}

      {state.error ? (
        <Alert tone="error" icon={AlertIcon}>
          {state.error}
        </Alert>
      ) : state.warning ? (
        <Alert tone="warning" icon={AlertIcon}>
          {state.warning}
        </Alert>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface shadow-xs transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
        <label htmlFor="message-body" className="sr-only">
          Message
        </label>
        <textarea
          ref={textarea}
          id="message-body"
          name="body"
          rows={2}
          maxLength={2000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              form.current?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="block max-h-52 w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 text-sm leading-6 text-ink outline-none placeholder:text-ink-subtle"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {allowChangeRequest ? (
              <button
                type="button"
                aria-pressed={changeRequest}
                onClick={() => setChangeRequest((value) => !value)}
                className={cx(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors",
                  changeRequest ? "bg-warning-soft text-warning" : "text-ink-muted hover:bg-ink/5"
                )}
              >
                {changeRequest ? "Change request" : "Mark as a change request"}
              </button>
            ) : null}
            {smsAvailable ? (
              <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-xs font-medium text-ink-muted hover:bg-ink/5">
                <input type="checkbox" name="sms" defaultChecked={smsDefault} className="size-3.5 accent-accent" />
                <PhoneIcon className="size-3.5" />
                Also send as a text
              </label>
            ) : null}
            {extra}
          </div>
          <SendButton disabled={body.trim().length < 2} />
        </div>
      </div>
    </form>
  );
}

function SendButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label="Send"
      className="group inline-flex h-9 items-center gap-2 rounded-full bg-accent pr-4 pl-3.5 text-sm font-semibold text-on-accent shadow-xs transition-[background-color,transform,opacity] hover:bg-accent-strong active:scale-95 disabled:opacity-40"
    >
      {pending ? (
        <span className="size-4 animate-spin rounded-full border-2 border-on-accent/40 border-t-on-accent" />
      ) : (
        <SendIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
      Send
    </button>
  );
}
