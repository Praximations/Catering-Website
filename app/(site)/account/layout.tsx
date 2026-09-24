import Link from "next/link";
import type { ReactNode } from "react";
import { BagIcon } from "@/components/icons";
import { NavTabs } from "@/components/nav-tabs";
import { Avatar, button, Container } from "@/components/ui";
import { countUnreadForCustomer, orderIdsForAccount } from "@/lib/messages";
import { requireUser } from "@/lib/session";

/**
 * The customer's area: one header, four places. Overview for what is next,
 * Orders for everything placed and quoted, Messages for the conversation with
 * the business, Details for what is saved and how to sign out everywhere.
 *
 * requireUser here is for the header's sake. Each page checks again on its
 * own, because a layout is not re-run on every navigation and is never the
 * only lock (AGENTS.md).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const unread = await countUnreadForCustomer(user.id, await orderIdsForAccount(user.id));

  return (
    // Without the footer below it, the page's own bottom padding is what keeps
    // the last of it clear of the phone's dock.
    <Container size="medium" className="pb-28 lg:pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={user.name} className="size-12 text-sm" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
        </div>
        <Link href="/shop" className={button("primary")}>
          <BagIcon className="size-4" />
          New order
        </Link>
      </header>

      <NavTabs
        label="Account"
        group="account"
        items={[
          { href: "/account", label: "Overview", icon: "grid", exact: true },
          { href: "/account/orders", label: "Orders", icon: "receipt" },
          { href: "/account/messages", label: "Messages", icon: "chat", badge: unread },
          { href: "/account/details", label: "Details", icon: "sliders" },
        ]}
      />

      <div className="mt-6">{children}</div>
    </Container>
  );
}
