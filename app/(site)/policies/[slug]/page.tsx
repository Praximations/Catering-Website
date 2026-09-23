import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { formatSentAt } from "@/components/enquiry";
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, ChatIcon } from "@/components/icons";
import { POLICY_ICONS } from "@/components/policy-icon";
import { SectionFilter } from "@/components/policy-search";
import { Alert, cardClass, Container, cx, Disclosure, IconTile, nudgeClass } from "@/components/ui";
import { business } from "@/lib/business";
import { buildPolicies, findPolicy, policiesAreTemplate } from "@/lib/policies";

export function generateStaticParams() {
  return buildPolicies().flatMap((policy) => [{ slug: policy.slug }, ...(policy.aliases ?? []).map((slug) => ({ slug }))]);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = findPolicy((await params).slug);
  return found ? { title: found.policy.title, description: found.policy.summary } : {};
}

/**
 * One policy: a contents list that stays beside the text on a wide screen,
 * short sections with plain headings, and a filter for finding one thing.
 * Styled like the rest of the site rather than as a wall of legal text.
 */
export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findPolicy(slug);
  if (!found) notFound();
  if (!found.canonical) permanentRedirect(`/policies/${found.policy.slug}`);

  const { policy } = found;
  const policies = buildPolicies();
  const index = policies.findIndex((candidate) => candidate.slug === policy.slug);
  const previous = policies[index - 1];
  const next = policies[index + 1];
  const PolicyIcon = POLICY_ICONS[policy.icon];

  const contents = (
    <ol className="space-y-0.5 text-sm">
      {policy.sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className="block rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink">
            {section.heading}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <Container>
      <Link href="/policies" className="group inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Policies
      </Link>

      <header className="mt-4 mb-8 flex items-start gap-4">
        <IconTile icon={PolicyIcon} className="size-12" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{policy.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {business.policies.lastUpdated ? `Last updated ${formatSentAt(business.policies.lastUpdated)}` : policy.summary}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SectionFilter />
          <div className="hidden lg:block">
            <p className="mb-2 px-3 text-xs font-medium text-ink-subtle">On this page</p>
            {contents}
          </div>
          <div className="lg:hidden">
            <Disclosure summary="On this page">{contents}</Disclosure>
          </div>
        </aside>

        <article className="min-w-0 max-w-2xl">
          {policiesAreTemplate ? (
            <Alert tone="warning" icon={AlertIcon} className="mb-6">
              A starting template, built from how this site works. The business will review it before relying on it.
            </Alert>
          ) : null}

          <div className="space-y-4">
            {policy.sections.map((section) => (
              <section key={section.id} id={section.id} data-policy-section className={cx(cardClass, "p-5 sm:p-7")}>
                <h2 className="font-display text-lg font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-3 space-y-3 text-[0.9375rem] leading-7 text-ink-muted">
                  {section.blocks.map((block, blockIndex) =>
                    block.type === "p" ? (
                      <p key={blockIndex}>{block.text}</p>
                    ) : (
                      <ul key={blockIndex} className="space-y-2">
                        {block.items.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent/60" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-accent-soft px-5 py-4 text-sm text-accent-strong">
            <ChatIcon className="size-4 shrink-0" />
            <p>
              A question about this?{" "}
              <Link href="/contact" className="font-semibold underline-offset-4 hover:underline">
                Ask us
              </Link>
              .
            </p>
          </div>

          <nav aria-label="More policies" className="mt-8 flex flex-wrap justify-between gap-3">
            {previous ? (
              <Link href={`/policies/${previous.slug}`} className="group inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
                <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
                {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/policies/${next.slug}`} className="group inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
                {next.title}
                <ArrowRightIcon className={nudgeClass} />
              </Link>
            ) : null}
          </nav>
        </article>
      </div>
    </Container>
  );
}
