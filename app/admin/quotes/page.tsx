import type { Metadata } from "next";
import Link from "next/link";
import { updateEnquiryAction } from "@/app/actions/enquiries";
import { formatEventDate, formatSentAt, packageLabel, relativeDay, StatusBadge } from "@/components/enquiry";
import { ChevronDownIcon, ExternalIcon, MailIcon, MapPinIcon, PhoneIcon, SparklesIcon, UserIcon } from "@/components/icons";
import { DateTile, mapSearchUrl, SearchBox } from "@/components/owner";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, EmptyState, PageHeader, Tabs, textareaClass } from "@/components/ui";
import { customerId } from "@/lib/customers";
import type { EnquiryRecord, EnquiryStatus } from "@/lib/db/types";
import { ENQUIRY_STATUSES, listAllEnquiries, STATUS_LABELS } from "@/lib/enquiries";
import { telHref } from "@/lib/phone";
import { requireOwner } from "@/lib/session";

export const metadata: Metadata = {
  title: "Quotes",
};

const VIEWS = ["all", ...ENQUIRY_STATUSES] as const;
type View = (typeof VIEWS)[number];

function matches(enquiry: EnquiryRecord, query: string): boolean {
  if (!query) return true;
  const haystack = `${enquiry.name} ${enquiry.email} ${enquiry.phone} ${enquiry.address} ${enquiry.notes}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}

/**
 * Event quote requests. Each is one row; the detail and the controls to move
 * it along open underneath, so working through a list never leaves the page.
 */
export default async function OwnerQuotes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; open?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const view: View = VIEWS.includes(params.status as View) ? (params.status as View) : "all";
  const query = typeof params.q === "string" ? params.q.slice(0, 80).trim() : "";
  const enquiries = await listAllEnquiries();
  const list = enquiries.filter((enquiry) => (view === "all" || enquiry.status === view) && matches(enquiry, query));

  const href = (target: View) => {
    const search = new URLSearchParams({ ...(target !== "all" ? { status: target } : {}), ...(query ? { q: query } : {}) });
    return `/admin/quotes${search.size ? `?${search}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Quotes" actions={<SearchBox action="/admin/quotes" defaultValue={query} placeholder="Search requests" hidden={view !== "all" ? { status: view } : {}} />} />

      <Tabs
        label="Quote status"
        active={href(view)}
        items={VIEWS.map((target) => ({
          href: href(target),
          label: target === "all" ? "All" : STATUS_LABELS[target as EnquiryStatus],
          count: target === "all" ? enquiries.length : enquiries.filter((enquiry) => enquiry.status === target).length,
        }))}
      />

      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState icon={SparklesIcon} title="No quote requests here" className="bg-surface">
            Requests from{" "}
            <Link href="/quote" className="font-medium text-accent hover:underline">
              the event form
            </Link>{" "}
            land here.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {list.map((enquiry) => (
              <li key={enquiry.id} id={enquiry.id}>
                <details className={cx("disclosure group", cardClass)} open={params.open === enquiry.id}>
                  <summary className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 sm:gap-4 sm:px-5">
                    <DateTile iso={enquiry.eventDate} muted={enquiry.status === "declined"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">
                        {enquiry.name} <span className="font-normal text-ink-subtle">· {relativeDay(enquiry.eventDate)}</span>
                      </span>
                      <span className="block truncate text-sm text-ink-muted">
                        {enquiry.guests} guests · {packageLabel(enquiry.packageSlug)}
                      </span>
                    </span>
                    <StatusBadge status={enquiry.status} />
                    <ChevronDownIcon className="disclosure-chevron size-4 shrink-0 text-ink-subtle transition-transform duration-200" />
                  </summary>

                  <div className="grid grid-cols-1 gap-6 border-t border-line px-4 py-5 sm:px-5 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <p className="font-medium text-ink">{formatEventDate(enquiry.eventDate)}</p>
                      <Link href={`/admin/customers/${customerId(enquiry.email)}`} className="flex items-center gap-2 text-ink hover:text-accent">
                        <UserIcon className="size-4 text-ink-subtle" />
                        {enquiry.name}
                      </Link>
                      <a
                        href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Your event on ${formatEventDate(enquiry.eventDate)}`)}`}
                        className="flex items-center gap-2 break-all text-ink-muted hover:text-accent"
                      >
                        <MailIcon className="size-4 shrink-0 text-ink-subtle" />
                        {enquiry.email}
                      </a>
                      {enquiry.phone ? (
                        <a href={telHref(enquiry.phone)} className="flex items-center gap-2 text-ink-muted hover:text-accent">
                          <PhoneIcon className="size-4 text-ink-subtle" />
                          {enquiry.phone}
                        </a>
                      ) : null}
                      {enquiry.address ? (
                        <a href={mapSearchUrl(enquiry.address)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-ink-muted hover:text-accent">
                          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                          <span>
                            {enquiry.address} <ExternalIcon className="inline size-3" />
                          </span>
                        </a>
                      ) : null}
                      {enquiry.notes ? <p className="rounded-lg bg-raised px-3 py-2 whitespace-pre-line text-ink">{enquiry.notes}</p> : null}
                      <p className="text-xs text-ink-subtle">Sent {formatSentAt(enquiry.createdAt)}</p>
                    </div>

                    <form action={updateEnquiryAction} className="space-y-3">
                      <input type="hidden" name="id" value={enquiry.id} />
                      <fieldset>
                        <legend className="text-sm font-medium text-ink">Status</legend>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ENQUIRY_STATUSES.map((status) => (
                            <label
                              key={status}
                              className="inline-flex cursor-pointer items-center rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-on-accent"
                            >
                              <input type="radio" name="status" value={status} defaultChecked={enquiry.status === status} className="sr-only" />
                              {STATUS_LABELS[status]}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div>
                        <label htmlFor={`notes-${enquiry.id}`} className="text-sm font-medium text-ink">
                          Private notes
                        </label>
                        <textarea
                          id={`notes-${enquiry.id}`}
                          name="ownerNotes"
                          rows={3}
                          defaultValue={enquiry.ownerNotes}
                          placeholder="Quoted 1,400, waiting to hear back"
                          className={cx(textareaClass, "mt-1.5")}
                        />
                      </div>
                      <SubmitButton pendingLabel="Saving" className={button("primary", "sm")}>
                        Save
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
