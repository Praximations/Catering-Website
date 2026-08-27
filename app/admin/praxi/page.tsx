import type { Metadata } from "next";
import Link from "next/link";
import {
  approveAction,
  denyAction,
  resetPermissionsAction,
  revokeKeyAction,
  setPermissionAction,
} from "@/app/actions/praxi";
import { formatSentAt } from "@/components/enquiry";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { CATEGORY_LABELS, RISK_LABELS, findCapability } from "@/lib/capabilities";
import { listOverrides } from "@/lib/catalog";
import { listApprovals } from "@/lib/control";
import { listControlKeys } from "@/lib/controlKeys";
import { MODE_HELP, MODE_LABELS, PERMISSION_MODES, listAudit, listPermissions } from "@/lib/permissions";
import { praxiConfigured } from "@/lib/praxi";
import { requireOwner } from "@/lib/session";
import { formatMoney } from "@/lib/shop";
import type { CapabilityCategory } from "@/lib/capabilities";
import { MintKey } from "./mint-key";

export const metadata: Metadata = {
  title: "Praxi",
};

const CATEGORY_ORDER: CapabilityCategory[] = [
  "orders",
  "enquiries",
  "customers",
  "catalog",
  "site",
];

const DECISION_LABELS: Record<string, string> = {
  allowed: "allowed",
  denied: "refused",
  queued: "waiting for you",
  executed: "done",
  failed: "failed",
};

/**
 * The owner's control panel over Praxi.
 *
 * The whole point of this page is that the answer to "what can this thing
 * do to my business" is visible, in the owner's own words, and changeable
 * in one click. Everything else here (the keys, the queue, the log) exists
 * to make that answer trustworthy: a setting nobody can audit is a promise
 * rather than a control.
 */
export default async function PraxiAdminPage() {
  const owner = await requireOwner();
  const [permissions, keys, pending, decided, audit, overrides] = await Promise.all([
    listPermissions(),
    listControlKeys(),
    listApprovals("pending"),
    listApprovals(),
    listAudit(25),
    listOverrides(),
  ]);

  const recentlyDecided = decided.filter((a) => a.status !== "pending").slice(0, 5);
  const activeKeys = keys.filter((key) => key.status === "active");

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <PageHeader
        eyebrow={`Signed in as ${owner.email}`}
        title="Praxi"
        lede="What the assistant is allowed to do to this site, what it has asked for, and what it has done."
      />

      <p className="mb-10 text-sm text-ink-muted">
        <Link href="/admin" className="text-accent-strong hover:underline">
          Back to orders and enquiries
        </Link>
      </p>

      {/* ------------------------------ waiting ------------------------------ */}
      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight text-ink">Waiting for you</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Anything Praxi has asked to do that you set to &quot;ask me first&quot;. Nothing here has
          happened yet.
        </p>

        {pending.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="Nothing waiting.">
              <p>Requests that need your say so will appear here.</p>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {pending.map((approval) => {
              const capability = findCapability(approval.capability);
              return (
                <li
                  key={approval.id}
                  className="rounded-lg border border-accent bg-accent/5 p-5"
                >
                  <p className="font-medium text-ink">
                    {capability?.label ?? approval.capability}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {capability?.description ?? "This capability no longer exists."}
                  </p>

                  {approval.reason ? (
                    <p className="mt-3 text-sm text-ink-muted">
                      <span className="text-ink-subtle">Praxi says: </span>
                      {approval.reason}
                    </p>
                  ) : null}

                  {/* The exact arguments, because approving something you
                      cannot see is not approval. */}
                  <pre className="mt-3 overflow-x-auto rounded-sm border border-line bg-page px-3 py-2 font-mono text-xs text-ink-muted">
                    {JSON.stringify(approval.args, null, 2)}
                  </pre>

                  <p className="mt-3 text-xs text-ink-subtle">
                    Asked by {approval.requestedBy} on {formatSentAt(approval.requestedAt)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={approveAction}>
                      <input type="hidden" name="id" value={approval.id} />
                      <SubmitButton pendingLabel="Doing it...">Approve and do it</SubmitButton>
                    </form>
                    <form action={denyAction}>
                      <input type="hidden" name="id" value={approval.id} />
                      <SubmitButton pendingLabel="Refusing..." className={secondaryButtonClass}>
                        Refuse
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {recentlyDecided.length > 0 ? (
          <ul className="mt-6 space-y-2 text-sm">
            {recentlyDecided.map((approval) => (
              <li key={approval.id} className="flex flex-wrap justify-between gap-3 border-b border-line pb-2">
                <span className="text-ink-muted">
                  {findCapability(approval.capability)?.label ?? approval.capability}
                  <span className="text-ink-subtle">
                    {" "}
                    &middot; {approval.status === "approved" ? "you approved" : "you refused"}
                  </span>
                </span>
                <span className="text-ink-subtle">
                  {approval.error ?? approval.result ?? ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* ---------------------------- permissions ---------------------------- */}
      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight text-ink">What Praxi may do</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Change any of these at any time. Turning something off takes effect on the very next
          request; nothing is cached.
        </p>

        <div className="mt-8 space-y-10">
          {CATEGORY_ORDER.map((category) => {
            const inCategory = permissions.filter((p) => p.capability.category === category);
            if (inCategory.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="font-display text-lg text-ink">{CATEGORY_LABELS[category]}</h3>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {inCategory.map(({ capability, mode, customised }) => (
                    <li key={capability.id} className="py-5">
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                        <div className="min-w-64 flex-1">
                          <p className="font-medium text-ink">
                            {capability.label}
                            {customised ? (
                              <span className="ml-2 text-xs font-normal text-ink-subtle">
                                changed from the default
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                            {capability.description}
                          </p>
                          <p className="mt-1 text-xs text-ink-subtle">
                            {RISK_LABELS[capability.risk]} &middot; {MODE_HELP[mode]}
                          </p>
                        </div>

                        {/* Three buttons rather than a dropdown: the current
                            setting is readable without opening anything. */}
                        <div className="flex gap-1 rounded-md border border-line bg-surface p-1">
                          {PERMISSION_MODES.map((option) => (
                            <form key={option} action={setPermissionAction}>
                              <input type="hidden" name="capability" value={capability.id} />
                              <input type="hidden" name="mode" value={option} />
                              <button
                                type="submit"
                                aria-pressed={mode === option}
                                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                                  mode === option
                                    ? "bg-accent text-on-accent"
                                    : "text-ink-muted hover:bg-raised hover:text-ink"
                                }`}
                              >
                                {MODE_LABELS[option]}
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <form action={resetPermissionsAction} className="mt-8">
          <SubmitButton pendingLabel="Resetting..." className={secondaryButtonClass}>
            Put everything back to the defaults
          </SubmitButton>
        </form>
      </section>

      {/* ------------------------------- keys -------------------------------- */}
      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight text-ink">Keys</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Praxi presents one of these to act on the site. Revoking a key stops it immediately, and
          this is a different key from the one this site uses to report TO Praxi.
        </p>

        <div className="mt-6">
          <MintKey />
        </div>

        {activeKeys.length === 0 ? (
          <p className="mt-6 text-sm text-ink-subtle">
            No keys yet, so nothing can act on this site even where permission says it may.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm text-ink">
                    {key.label}{" "}
                    <code className="font-mono text-xs text-ink-subtle">{key.tokenPrefix}...</code>
                    {key.status === "revoked" ? (
                      <span className="ml-2 text-xs text-ink-subtle">revoked</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    Made {formatSentAt(key.createdAt)} &middot;{" "}
                    {key.lastUsedAt ? `last used ${formatSentAt(key.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                {key.status === "active" ? (
                  <form action={revokeKeyAction}>
                    <input type="hidden" name="id" value={key.id} />
                    <SubmitButton
                      pendingLabel="Revoking..."
                      className="text-sm text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
                    >
                      Revoke
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-ink-subtle">
          Reporting to Praxi is{" "}
          {praxiConfigured() ? "switched on" : "off (PRAXI_API_URL and PRAXI_SECRET_KEY are unset)"}.
          That direction is configured in the environment, not here.
        </p>
      </section>

      {/* ----------------------------- overrides ----------------------------- */}
      {overrides.length > 0 ? (
        <section className="mb-16">
          <h2 className="font-display text-2xl tracking-tight text-ink">Catalog changes</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Products currently differing from what the code says.
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line text-sm">
            {overrides.map(({ product, override }) => (
              <li key={product.slug} className="flex flex-wrap justify-between gap-3 py-3">
                <span className="text-ink">
                  {product.name}
                  <span className="text-ink-muted">
                    {product.priceOverridden
                      ? ` ${formatMoney(product.basePriceMinor)} to ${formatMoney(product.priceMinor)}`
                      : ""}
                    {product.available ? "" : " , off sale"}
                  </span>
                </span>
                <span className="text-ink-subtle">
                  {override.updatedBy}, {formatSentAt(override.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------- log -------------------------------- */}
      <section>
        <h2 className="font-display text-2xl tracking-tight text-ink">Everything Praxi tried</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Refusals included. If it asked and was told no, it is here.
        </p>

        {audit.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="Nothing yet.">
              <p>Praxi has not tried to do anything on this site.</p>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="py-3">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span className="text-ink">
                    {findCapability(entry.capability)?.label ?? entry.capability}
                    <span
                      className={
                        entry.decision === "denied" || entry.decision === "failed"
                          ? " text-accent-strong"
                          : " text-ink-subtle"
                      }
                    >
                      {" "}
                      &middot; {DECISION_LABELS[entry.decision] ?? entry.decision}
                    </span>
                  </span>
                  <span className="text-xs text-ink-subtle">{formatSentAt(entry.at)}</span>
                </div>
                <p className="mt-1 text-ink-muted">{entry.detail}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">{entry.actor}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
