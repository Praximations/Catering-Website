import type { Metadata } from "next";
import { formatWhen } from "@/components/enquiry";
import { UsersIcon } from "@/components/icons";
import { ListRow, SearchBox } from "@/components/owner";
import { Avatar, cardClass, cx, EmptyState, PageHeader, Pill, Tabs } from "@/components/ui";
import { listCustomers } from "@/lib/customers";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Customers",
};

/**
 * Everybody who has been in touch, whether they ordered, asked for a quote, or
 * sent a message, stitched together by email. Most recent first.
 */
export default async function OwnerCustomers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 80).trim().toLowerCase() : "";
  const view = params.view === "accounts" || params.view === "guests" ? params.view : "all";
  const customers = await listCustomers();

  const list = customers.filter((customer) => {
    if (view === "accounts" && !customer.hasAccount) return false;
    if (view === "guests" && customer.hasAccount) return false;
    if (!query) return true;
    return `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query);
  });

  const href = (target: string) => {
    const search = new URLSearchParams({ ...(target !== "all" ? { view: target } : {}), ...(query ? { q: query } : {}) });
    return `/admin/customers${search.size ? `?${search}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Customers" actions={<SearchBox action="/admin/customers" defaultValue={query} placeholder="Name, email or phone" hidden={view !== "all" ? { view } : {}} />} />

      <Tabs
        label="Which customers"
        active={href(view)}
        items={[
          { href: href("all"), label: "All", count: customers.length },
          { href: href("accounts"), label: "With account", count: customers.filter((c) => c.hasAccount).length },
          { href: href("guests"), label: "Guests", count: customers.filter((c) => !c.hasAccount).length },
        ]}
      />

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState icon={UsersIcon} title={query ? `Nobody matches "${query}"` : "No customers yet"} className="bg-surface" />
        ) : (
          <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
            {list.map((customer) => (
              <ListRow
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                leading={<Avatar name={customer.name || customer.email} />}
                title={customer.name || customer.email}
                subtitle={`${customer.email}${customer.phone ? ` · ${customer.phone}` : ""}`}
                meta={
                  <>
                    <span className="block font-medium text-ink tabular-nums">{formatMoney(customer.lifetimeValueMinor)}</span>
                    <span className="block text-xs">
                      {customer.orders} {customer.orders === 1 ? "order" : "orders"} · {formatWhen(customer.lastActivity)}
                    </span>
                  </>
                }
                trailing={customer.hasAccount ? <Pill tone="accent">Account</Pill> : <Pill tone="muted">Guest</Pill>}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
