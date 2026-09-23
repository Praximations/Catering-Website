import type { Metadata } from "next";
import Link from "next/link";
import { AlertIcon, ArrowRightIcon } from "@/components/icons";
import { POLICY_ICONS } from "@/components/policy-icon";
import { PolicySearch } from "@/components/policy-search";
import { Alert, Container, cx, IconTile, interactiveCardClass, nudgeClass, PageHeader, reveal } from "@/components/ui";
import { buildPolicies, policiesAreTemplate, searchIndex } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Policies",
  description: "Privacy, terms, refunds, delivery, cookies and allergens.",
};

export default function PoliciesPage() {
  const policies = buildPolicies();

  return (
    <Container size="narrow">
      <PageHeader title="Policies" lede="Plain answers about privacy, orders, refunds, delivery and allergens." />

      {policiesAreTemplate ? (
        <Alert tone="warning" icon={AlertIcon} className="mb-6">
          These pages are a starting template built from how this site works. The business will review them before relying on them.
        </Alert>
      ) : null}

      <PolicySearch entries={searchIndex(policies)} />

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {policies.map((policy, index) => {
          const PolicyIcon = POLICY_ICONS[policy.icon];
          return (
            <li key={policy.slug} {...reveal(index)}>
              <Link href={`/policies/${policy.slug}`} className={cx(interactiveCardClass, "group flex h-full flex-col p-5")}>
                <IconTile icon={PolicyIcon} />
                <h2 className="mt-4 font-semibold text-ink">{policy.title}</h2>
                <p className="mt-1 flex-1 text-sm leading-6 text-ink-muted">{policy.summary}</p>
                <span className="mt-4 flex items-center justify-between text-xs text-ink-subtle">
                  {policy.sections.length} sections
                  <ArrowRightIcon className={cx(nudgeClass, "group-hover:text-accent")} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
