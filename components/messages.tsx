import { ChatIcon, PhoneIcon } from "./icons";
import { cx, Pill } from "./ui";
import type { CustomerMessageRecord } from "@/lib/db/types";

/**
 * A conversation, as bubbles: the viewer's own messages on the right in the
 * accent colour, the other side's on the left. Grouped by day with a quiet
 * date between groups, which is how every messaging app people already use
 * reads, so there is nothing to learn.
 */

const LOCALE = "en-US";

function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

export function MessageThread({
  messages,
  viewer,
  otherName,
  orderReferences = {},
  emptyText = "No messages yet.",
  className,
}: {
  messages: CustomerMessageRecord[];
  viewer: "customer" | "owner";
  /** How the other side is named above their messages. */
  otherName: string;
  /** Order id to reference, so a message about an order can say which. */
  orderReferences?: Record<string, string>;
  emptyText?: string;
  className?: string;
}) {
  if (messages.length === 0) {
    return (
      <div className={cx("flex flex-col items-center justify-center py-12 text-center", className)}>
        <span className="grid size-11 place-items-center rounded-full bg-raised text-ink-subtle">
          <ChatIcon className="size-5" />
        </span>
        <p className="mt-3 text-sm text-ink-muted">{emptyText}</p>
      </div>
    );
  }

  const days = messages.map((message) => dayLabel(message.createdAt));
  return (
    <ol className={cx("flex flex-col gap-2", className)} aria-label="Messages">
      {messages.map((message, index) => {
        const mine = message.sender === viewer;
        const day = days[index]!;
        const showDay = index === 0 || day !== days[index - 1];
        const previous = messages[index - 1];
        const grouped = !showDay && previous?.sender === message.sender;
        const reference = message.orderId ? orderReferences[message.orderId] : undefined;

        return (
          <li key={message.id} className="contents">
            {showDay ? (
              <p className="my-3 text-center text-xs font-medium text-ink-subtle first:mt-0">{day}</p>
            ) : null}
            <div className={cx("flex animate-fade-up flex-col", mine ? "items-end" : "items-start", grouped ? "" : "mt-1")}>
              {!grouped ? (
                <p className="mb-1 px-1 text-xs text-ink-subtle">
                  {mine ? "You" : otherName}
                  {reference ? ` · Order ${reference}` : ""}
                </p>
              ) : null}
              <div
                className={cx(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 sm:max-w-[75%]",
                  mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md border border-line bg-surface text-ink shadow-xs"
                )}
              >
                {message.kind === "change_request" ? (
                  <Pill tone={mine ? "neutral" : "warning"} className="mb-1.5 h-5 bg-surface/90 text-[0.6875rem]">
                    Change request
                  </Pill>
                ) : null}
                <p className="break-words whitespace-pre-line">{message.body}</p>
              </div>
              <p className="mt-1 flex items-center gap-1 px-1 text-[0.6875rem] text-ink-subtle">
                {message.channel === "sms" ? (
                  <>
                    <PhoneIcon className="size-3" /> Text ·{" "}
                  </>
                ) : null}
                {time(message.createdAt)}
                {mine && message.readAt ? " · Seen" : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
