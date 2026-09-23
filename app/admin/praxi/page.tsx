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
import { CheckCircleIcon, KeyIcon, ShieldIcon, TagIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { button, cardClass, cx, Disclosure, EmptyState, PageHeader, Pill, Section } from "@/components/ui";
import { CATEGORY_LABELS, RISK_LABELS, findCapability } from "@/lib/capabilities";
import type { CapabilityCategory } from "@/lib/capabilities";
import { listOverrides } from "@/lib/catalog";
import { listApprovals } from "@/lib/control";
import { listControlKeys } from "@/lib/controlKeys";
import { MODE_HELP, MODE_LABELS, PERMISSION_MODES, listAudit, listPermissions } from "@/lib/permissions";
import { praxiConfigured } from "@/lib/praxi";
import { requireOwner } from "@/lib/session";
import { MintKey } from "./mint-key";

export const metadata: Metadata = {
  title: "Assistant",
};

const CATEGORY_ORDER: CapabilityCategory[] = ["orders", "enquiries", "customers", "catalog", "site"];

const DECISION: Record<string, { label: string; tone: "accent" | "warning" | "danger" | "neutral" | "info" }> = {
  allowed: { label: "Allowed", tone: "accent" },
  denied: { label: "Refused", tone: "danger" },
  queued: { label: "Waiting for you", tone: "warning" },
  executed: { label: "Done", tone: "accent" },
  failed: { label: "Failed", tone: "danger" },
};

/**
 * What Praxi, the assistant, may do to this business. The answer to "what can
 * it do" is visible in the owner's own words and changeable in one press;
 * everything else here (the waiting requests, the keys, the log) exists to
 * make that answer trustworthy. A setting nobody can audit is a promise, not
 * a control.
 */
export default async function AssistantPage() {
  await requireOwner();
  const [permissions, keys, pending, decided, audit, overrides] = await Promise.all([
    listPermissions(),
    listControlKeys(),
    listApprovals("pending"),
    listApprovals(),
    listAudit(25),
    listOverrides(),
  ]);

  const recentlyDecided = decided.filter((approval) => approval.status !== "pending").slice(0, 5);
  const activeKeys = keys.filter((key) => key.status === "active");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Assistant"
        lede="What Praxi may do on this site, what it is waiting on you for, and everything it has tried."
      />

      {/* ------------------------------ waiting ------------------------------ */}
      <Section title="Waiting for you" description="Requests for things you set to ask first. None of them has happened.">
        {pending.length === 0 ? (
          <div className={cx(cardClass, "flex items-center gap-3 p-5")}>
            <CheckCircleIcon className="size-5 text-accent" />
            <p className="text-sm text-ink">Nothing is waiting.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((approval) => {
              const capability = findCapability(approval.capability);
              return (
                <li key={approval.id} className={cx(cardClass, "border-warning/30 p-5")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{capability?.label ?? approval.capability}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{capability?.description ?? "This capability no longer exists."}</p>
                    </div>
                    <Pill tone="warning" live>
                      Waiting
                    </Pill>
                  </div>
                  {approval.reason ? (
                    <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-sm text-ink">
                      <span className="text-ink-subtle">Praxi says: </span>
                      {approval.reason}
                    </p>
                  ) : null}
                  {/* The exact arguments, because approving something you cannot see is not approval. */}
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-page px-3 py-2 font-mono text-xs text-ink-muted">
                    {JSON.stringify(approval.args, null, 2)}
                  </pre>
                  <p className="mt-2 text-xs text-ink-subtle">
                    Asked by {approval.requestedBy} on {formatSentAt(approval.requestedAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={approveAction}>
                      <input type="hidden" name="id" value={approval.id} />
                      <SubmitButton pendingLabel="Doing it" className={button("primary", "sm")}>
                        Approve and do it
                      </SubmitButton>
                    </form>
                    <form action={denyAction}>
                      <input type="hidden" name="id" value={approval.id} />
                      <SubmitButton pendingLabel="Refusing" className={button("secondary", "sm")}>
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
          <ul className="mt-3 space-y-1.5 text-sm">
            {recentlyDecided.map((approval) => (
              <li key={approval.id} className="flex flex-wrap justify-between gap-3 px-1 text-ink-muted">
                <span>
                  {findCapability(approval.capability)?.label ?? approval.capability}
                  <span className="text-ink-subtle"> · {approval.status === "approved" ? "you approved" : "you refused"}</span>
                </span>
                <span className="text-ink-subtle">{approval.error ?? approval.result ?? ""}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* ---------------------------- permissions ---------------------------- */}
      <Section
        title="What Praxi may do"
        description="Changes take effect on the very next request."
        action={
          <form action={resetPermissionsAction}>
            <SubmitButton pendingLabel="Resetting" className={button("ghost", "sm")}>
              Reset to defaults
            </SubmitButton>
          </form>
        }
      >
        <div className="space-y-3">
          {CATEGORY_ORDER.map((category) => {
            const inCategory = permissions.filter((permission) => permission.capability.category === category);
            if (inCategory.length === 0) return null;
            return (
              <Disclosure
                key={category}
                defaultOpen={category === "orders"}
                summary={CATEGORY_LABELS[category]}
                meta={<span className="text-xs">{inCategory.length}</span>}
              >
                <ul className="divide-y divide-line">
                  {inCategory.map(({ capability, mode, customised }) => (
                    <li key={capability.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0">
                      <div className="min-w-60 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                          {capability.label}
                          {customised ? <Pill tone="info" className="h-5 text-[0.6875rem]">Changed</Pill> : null}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-muted">{capability.description}</p>
                        <p className="mt-1 text-xs text-ink-subtle">
                          {RISK_LABELS[capability.risk]} · {MODE_HELP[mode]}
                        </p>
                      </div>
                      {/* Three buttons, not a dropdown: the setting is readable without opening anything. */}
                      <div className="flex gap-0.5 rounded-full border border-line bg-surface p-0.5 shadow-xs">
                        {PERMISSION_MODES.map((option) => (
                          <form key={option} action={setPermissionAction}>
                            <input type="hidden" name="capability" value={capability.id} />
                            <input type="hidden" name="mode" value={option} />
                            <button
                              type="submit"
                              aria-pressed={mode === option}
                              className={cx(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                mode === option ? "bg-ink text-on-accent" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
                              )}
                            >
                              {MODE_LABELS[option]}
                            </button>
                          </form>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------- keys -------------------------------- */}
      <Section title="Keys" description="Praxi presents one of these to act here. Revoking one stops it at once.">
        <div className={cx(cardClass, "p-5")}>
          <MintKey />
          {activeKeys.length === 0 ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-muted">
              <ShieldIcon className="size-4" />
              No keys, so nothing can act on this site even where permission says it may.
            </p>
          ) : null}
          {keys.length > 0 ? (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {keys.map((key) => (
                <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <KeyIcon className={cx("size-4", key.status === "active" ? "text-accent" : "text-ink-subtle")} />
                    <div>
                      <p className="text-sm text-ink">
                        {key.label} <code className="font-mono text-xs text-ink-subtle">{key.tokenPrefix}...</code>
                      </p>
                      <p className="text-xs text-ink-subtle">
                        Made {formatSentAt(key.createdAt)} · {key.lastUsedAt ? `last used ${formatSentAt(key.lastUsedAt)}` : "never used"}
                      </p>
                    </div>
                  </div>
                  {key.status === "active" ? (
                    <form action={revokeKeyAction}>
                      <input type="hidden" name="id" value={key.id} />
                      <SubmitButton pendingLabel="Revoking" className={button("danger", "sm")}>
                        Revoke
                      </SubmitButton>
                    </form>
                  ) : (
                    <Pill tone="muted">Revoked</Pill>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-xs text-ink-subtle">
            Reporting to Praxi is {praxiConfigured() ? "on" : "off"}. That direction is set in the environment and uses a different key.
          </p>
        </div>
      </Section>

      {overrides.length > 0 ? (
        <Section title="Catalog changes" description="Products currently different from the listed catalog.">
          <Link href="/admin/catalog" className={cx(cardClass, "flex items-center gap-3 p-4 text-sm transition-colors hover:bg-raised/60")}>
            <TagIcon className="size-4 text-ink-subtle" />
            <span className="flex-1">
              {overrides.length} {overrides.length === 1 ? "product has" : "products have"} a changed price or availability.
            </span>
            <span className="font-medium text-accent">Review</span>
          </Link>
        </Section>
      ) : null}

      {/* -------------------------------- log -------------------------------- */}
      <Section title="Everything Praxi tried" description="Refusals included. If it asked and was told no, it is here.">
        {audit.length === 0 ? (
          <EmptyState icon={ShieldIcon} title="Nothing yet" className="bg-surface">
            Praxi has not tried to do anything on this site.
          </EmptyState>
        ) : (
          <ul className={cx(cardClass, "divide-y divide-line overflow-hidden")}>
            {audit.map((entry) => {
              const decision = DECISION[entry.decision] ?? { label: entry.decision, tone: "neutral" as const };
              return (
                <li key={entry.id} className="px-4 py-3 text-sm sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink">{findCapability(entry.capability)?.label ?? entry.capability}</span>
                    <span className="flex items-center gap-2">
                      <Pill tone={decision.tone}>{decision.label}</Pill>
                      <span className="text-xs text-ink-subtle">{formatSentAt(entry.at)}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">{entry.detail}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{entry.actor}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
