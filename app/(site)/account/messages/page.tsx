import type { Metadata } from "next";
import { markAccountReadAction, sendAccountMessageAction } from "@/app/actions/messages";
import { formatEventDate } from "@/components/enquiry";
import { MarkReadNoArg } from "@/components/mark-read";
import { MessageComposer } from "@/components/message-composer";
import { MessageThread } from "@/components/messages";
import { cardClass, cx } from "@/components/ui";
import { business } from "@/lib/business";
import { listThreadForUser } from "@/lib/messages";
import { listOrdersForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

/**
 * The conversation with the business: one thread, like a text conversation,
 * with each message tagged with the order it is about when there is one.
 */
export default async function AccountMessages() {
  const user = await requireUser();
  const orders = await listOrdersForUser(user.id, user.email);
  const messages = await listThreadForUser(
    user.id,
    orders.map((order) => order.id)
  );
  const unread = messages.some((message) => message.sender === "owner" && !message.readAt);
  const references = Object.fromEntries(orders.map((order) => [order.id, order.reference]));
  const upcoming = orders.filter((order) => order.status === "pending" || order.status === "confirmed");

  return (
    <section aria-label="Messages" className={cx(cardClass, "flex flex-col overflow-hidden")}>
      {unread ? <MarkReadNoArg action={markAccountReadAction} /> : null}
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{business.name}</h2>
          <p className="text-xs text-ink-muted">We usually reply within a working day.</p>
        </div>
      </div>

      <div className="max-h-[60vh] min-h-64 overflow-y-auto bg-page/60 px-4 py-5 sm:px-6">
        <MessageThread
          messages={messages}
          viewer="customer"
          otherName={business.name}
          orderReferences={references}
          emptyText="Questions about a menu, a date, or an order? Ask here."
        />
      </div>

      <div className="border-t border-line p-4 sm:p-5">
        <MessageComposer
          action={sendAccountMessageAction}
          hidden={{}}
          placeholder="Write to us"
          allowChangeRequest
          extra={
            orders.length > 0 ? (
              <label className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs text-ink-muted hover:bg-ink/5 has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-accent">
                <span className="sr-only sm:not-sr-only">About</span>
                <select
                  name="orderId"
                  defaultValue={upcoming[0]?.id ?? ""}
                  className="max-w-44 truncate bg-transparent text-xs font-medium text-ink outline-none"
                >
                  <option value="">General question</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Order {order.reference}, {formatEventDate(order.eventDate, "short")}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
      </div>
    </section>
  );
}
