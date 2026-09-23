import type { Metadata } from "next";
import Link from "next/link";
import { updateContactStatusAction } from "@/app/actions/contacts";
import { markThreadReadAction, ownerReplyAction } from "@/app/actions/messages";
import { ContactStatusBadge, formatWhen } from "@/components/enquiry";
import { ArrowLeftIcon, ChatIcon, ChevronDownIcon, MailIcon, PhoneIcon, UserIcon } from "@/components/icons";
import { MarkRead } from "@/components/mark-read";
import { MessageComposer } from "@/components/message-composer";
import { MessageThread } from "@/components/messages";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, button, cardClass, cx, EmptyState, PageHeader, Pill, Tabs } from "@/components/ui";
import { listContacts } from "@/lib/contacts";
import { customerId } from "@/lib/customers";
import { db } from "@/lib/db";
import { listConversations, listThread, parseThreadKey } from "@/lib/messages";
import { telHref, toE164 } from "@/lib/phone";
import { requireOwner } from "@/lib/session";
import { activeSmsProvider } from "@/lib/sms";

export const metadata: Metadata = {
  title: "Inbox",
};

/**
 * Every conversation with a customer, and every contact form message, in one
 * place. On a wide screen the list sits beside the open thread; on a phone it
 * is one or the other, with a way back.
 */
export default async function OwnerInbox({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tab?: string; filter?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const tab = params.tab === "contact" ? "contact" : "conversations";
  const [conversations, contacts] = await Promise.all([listConversations(), listContacts()]);
  const unreadCount = conversations.filter((conversation) => conversation.unread > 0).length;
  const newContacts = contacts.filter((contact) => contact.status === "new").length;

  return (
    <div>
      <PageHeader title="Inbox" />
      <Tabs
        label="Inbox"
        active={tab === "contact" ? "/admin/inbox?tab=contact" : "/admin/inbox"}
        items={[
          { href: "/admin/inbox", label: "Conversations", count: unreadCount || undefined },
          { href: "/admin/inbox?tab=contact", label: "Contact form", count: newContacts || undefined },
        ]}
      />
      <div className="mt-5">
        {tab === "contact" ? <ContactList contacts={contacts} /> : <Conversations conversations={conversations} selected={params.c} filter={params.filter} />}
      </div>
    </div>
  );
}

/* ------------------------------ conversations ------------------------------ */

async function Conversations({
  conversations,
  selected,
  filter,
}: {
  conversations: Awaited<ReturnType<typeof listConversations>>;
  selected?: string;
  filter?: string;
}) {
  const key = selected ? parseThreadKey(selected) : null;
  const shown = filter === "unread" ? conversations.filter((conversation) => conversation.unread > 0) : conversations;
  const active = key ? conversations.find((conversation) => conversation.key === key) : undefined;

  if (conversations.length === 0) {
    return (
      <EmptyState icon={ChatIcon} title="No conversations yet" className="bg-surface">
        When a customer messages you from their account or an order page, it appears here.
      </EmptyState>
    );
  }

  const messages = active ? await listThread(active.key) : [];
  const orders = active
    ? await db.orders.find(active.userId ? { any: [{ userId: active.userId }, { email: active.email }] } : { all: { id: active.orderId ?? "" } })
    : [];
  const references = Object.fromEntries(orders.map((order) => [order.id, order.reference]));
  const canText = Boolean(activeSmsProvider()) && Boolean(active?.phone && toE164(active.phone));

  return (
    <div className={cx(cardClass, "grid overflow-hidden lg:h-[calc(100dvh-14rem)] lg:min-h-[30rem] lg:grid-cols-[20rem_minmax(0,1fr)]")}>
      {/* The list. Hidden on a phone while a thread is open. */}
      <div className={cx("flex min-h-0 flex-col border-line lg:border-r", active ? "hidden lg:flex" : "flex")}>
        <div className="flex gap-1 border-b border-line p-2">
          <Link href="/admin/inbox" className={cx("rounded-full px-3 py-1.5 text-xs font-medium", filter !== "unread" ? "bg-ink text-on-accent" : "text-ink-muted hover:bg-ink/5")}>
            All
          </Link>
          <Link href="/admin/inbox?filter=unread" className={cx("rounded-full px-3 py-1.5 text-xs font-medium", filter === "unread" ? "bg-ink text-on-accent" : "text-ink-muted hover:bg-ink/5")}>
            Unread
          </Link>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {shown.map((conversation) => {
            const isActive = conversation.key === active?.key;
            return (
              <li key={conversation.key}>
                <Link
                  href={`/admin/inbox?c=${conversation.key}${filter === "unread" ? "&filter=unread" : ""}`}
                  scroll={false}
                  aria-current={isActive ? "true" : undefined}
                  className={cx("flex gap-3 px-4 py-3 transition-colors", isActive ? "bg-accent-soft" : "hover:bg-raised/60")}
                >
                  <span className="relative">
                    <Avatar name={conversation.name} />
                    {conversation.unread > 0 ? <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-highlight ring-2 ring-surface" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("truncate text-sm", conversation.unread > 0 ? "font-semibold text-ink" : "font-medium text-ink")}>{conversation.name}</span>
                      <span className="shrink-0 text-[0.6875rem] text-ink-subtle">{formatWhen(conversation.lastAt)}</span>
                    </span>
                    <span className={cx("mt-0.5 line-clamp-1 block text-xs", conversation.unread > 0 ? "text-ink" : "text-ink-muted")}>
                      {conversation.lastSender === "owner" ? "You: " : ""}
                      {conversation.lastBody}
                    </span>
                    {conversation.hasChangeRequest ? (
                      <Pill tone="warning" className="mt-1.5 h-5 text-[0.6875rem]">
                        Change request
                      </Pill>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
          {shown.length === 0 ? <li className="px-4 py-10 text-center text-sm text-ink-muted">Nothing unread.</li> : null}
        </ul>
      </div>

      {/* The open thread. */}
      <div className={cx("min-h-0 flex-col", active ? "flex" : "hidden lg:flex")}>
        {active ? (
          <>
            {active.unread > 0 ? <MarkRead action={markThreadReadAction} arg={active.key} /> : null}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Link href="/admin/inbox" aria-label="Back to conversations" className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-ink/5 lg:hidden">
                <ArrowLeftIcon className="size-5" />
              </Link>
              <Avatar name={active.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{active.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {active.email}
                  {active.orderReferences.length ? ` · Orders ${active.orderReferences.map((reference) => `#${reference}`).join(", ")}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {active.phone ? (
                  <a href={telHref(active.phone)} aria-label={`Call ${active.name}`} className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink">
                    <PhoneIcon className="size-4" />
                  </a>
                ) : null}
                {active.email ? (
                  <Link href={`/admin/customers/${customerId(active.email)}`} aria-label="Customer profile" className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink">
                    <UserIcon className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-page/50 px-4 py-5">
              <MessageThread messages={messages} viewer="owner" otherName={active.name} orderReferences={references} />
            </div>
            <div className="border-t border-line p-3">
              <MessageComposer
                action={ownerReplyAction}
                hidden={{ thread: active.key }}
                placeholder={`Reply to ${active.name.split(" ")[0]}`}
                smsAvailable={canText}
                smsDefault={active.lastChannel === "sms"}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-raised text-ink-subtle">
              <ChatIcon className="size-5" />
            </span>
            <p className="mt-3 text-sm text-ink-muted">Choose a conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- contact form ------------------------------ */

function ContactList({ contacts }: { contacts: Awaited<ReturnType<typeof listContacts>> }) {
  if (contacts.length === 0) {
    return <EmptyState icon={MailIcon} title="No contact messages yet" className="bg-surface" />;
  }
  return (
    <ul className="space-y-3">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <details className={cx("disclosure group", cardClass)} open={contact.status === "new"}>
            <summary className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 sm:px-5">
              <Avatar name={contact.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{contact.subject}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {contact.name} · {formatWhen(contact.createdAt)}
                </span>
              </span>
              <ContactStatusBadge status={contact.status} />
              <ChevronDownIcon className="disclosure-chevron size-4 shrink-0 text-ink-subtle transition-transform duration-200" />
            </summary>
            <div className="border-t border-line px-4 py-4 sm:px-5">
              <p className="text-sm leading-6 whitespace-pre-line text-ink">{contact.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {contact.email ? (
                  <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`} className={button("primary", "sm")}>
                    <MailIcon className="size-4" />
                    Reply by email
                  </a>
                ) : null}
                {contact.phone ? (
                  <a href={telHref(contact.phone)} className={button("secondary", "sm")}>
                    <PhoneIcon className="size-4" />
                    {contact.phone}
                  </a>
                ) : null}
                {(["read", "replied"] as const)
                  .filter((status) => status !== contact.status)
                  .map((status) => (
                    <form key={status} action={updateContactStatusAction}>
                      <input type="hidden" name="id" value={contact.id} />
                      <input type="hidden" name="status" value={status} />
                      <SubmitButton pendingLabel="Saving" className={button("ghost", "sm")}>
                        Mark {status}
                      </SubmitButton>
                    </form>
                  ))}
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
