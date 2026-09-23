import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RevealOnScroll } from "@/components/motion";
import { PortalNav } from "@/components/portal-nav";
import { business } from "@/lib/business";
import { contactCounts } from "@/lib/contacts";
import { listApprovals } from "@/lib/control";
import { enquiryCounts } from "@/lib/enquiries";
import { countUnreadForOwner } from "@/lib/messages";
import { orderCounts } from "@/lib/orders";
import { requireOwner } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Owner Portal", template: `%s, Owner Portal` },
  // Signed in only, and nothing here is for a search engine.
  robots: { index: false, follow: false },
};

/**
 * The Owner Portal: its own shell, separate from the public site, with the
 * counts that tell the owner where to look first.
 *
 * requireOwner here is for the shell's sake. EVERY page under it checks again,
 * and every action checks on its own: a layout is never the only lock.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const owner = await requireOwner();
  const [orders, quotes, contacts, unread, approvals] = await Promise.all([
    orderCounts(),
    enquiryCounts(),
    contactCounts(),
    countUnreadForOwner(),
    listApprovals("pending", 100),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col lg:flex-row lg:gap-6 lg:p-3">
      <PortalNav
        businessName={business.name}
        owner={{ name: owner.name, email: owner.email }}
        counts={{
          pendingOrders: orders.pending,
          newQuotes: quotes.new,
          inbox: unread + contacts.new,
          approvals: approvals.length,
        }}
      />
      <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-4 lg:pt-8 lg:pb-12">
        {children}
      </main>
      <RevealOnScroll />
    </div>
  );
}
