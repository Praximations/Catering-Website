import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  CreditCardIcon,
  FileTextIcon,
  GlobeIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  StoreIcon,
  UserIcon,
  type Icon,
} from "@/components/icons";
import { MapFrame } from "@/components/map";
import { Avatar, cardClass, cx, KeyValues, PageHeader, Pill, Section } from "@/components/ui";
import { business, isPlaceholderBusiness } from "@/lib/business";
import { db, isSupabaseConfigured } from "@/lib/db";
import { activeGeocoder, mapsEnabled } from "@/lib/geo";
import { activeProvider } from "@/lib/payments";
import { praxiConfigured } from "@/lib/praxi";
import { requireOwner } from "@/lib/session";
import { getAnnouncement } from "@/lib/settings";
import { activeSmsProvider } from "@/lib/sms";
import { isGoogleAuthConfigured } from "@/lib/supabase-auth";
import { NoticeForm } from "./notice-form";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * How the business is set up. Most of it lives in lib/business.ts and the
 * hosting environment rather than in the database, on purpose: those are
 * decisions made once and reviewed, and this page SHOWS them honestly,
 * including what is still a placeholder or not connected.
 */
export default async function OwnerSettings() {
  await requireOwner();
  const [announcement, owners] = await Promise.all([getAnnouncement(), db.users.find({ all: { role: "owner" } })]);

  const payment = activeProvider();
  const sms = activeSmsProvider();
  const geocoder = activeGeocoder();

  const integrations: { label: string; icon: Icon; on: boolean; detail: string }[] = [
    {
      label: "Database",
      icon: ShieldIcon,
      on: isSupabaseConfigured,
      detail: isSupabaseConfigured ? "Supabase" : "A local file. Fine for development, not for a live site.",
    },
    {
      label: "Online payments",
      icon: CreditCardIcon,
      on: Boolean(payment),
      detail: payment ? payment.label : "Not connected. Orders are saved and settled with you directly.",
    },
    {
      label: "Text messages",
      icon: PhoneIcon,
      on: Boolean(sms),
      detail: sms ? `${sms.label}. Replies can go out as texts, and texts back land in the inbox.` : "Not connected. Conversations stay on the site.",
    },
    {
      label: "Maps",
      icon: MapPinIcon,
      on: mapsEnabled,
      detail: geocoder ? `${geocoder.label}, for addresses at checkout and on orders.` : "Switched off.",
    },
    {
      label: "Google sign in",
      icon: UserIcon,
      on: isGoogleAuthConfigured,
      detail: isGoogleAuthConfigured ? "Offered on the sign in page." : "Off. Email and password sign in works.",
    },
    {
      label: "Praxi",
      icon: KeyIcon,
      on: praxiConfigured(),
      detail: praxiConfigured() ? "Customers, orders and quotes are shared with Praxi." : "Not connected.",
    },
  ];

  const unsetPolicies = Object.entries(business.policies)
    .filter(([key, value]) => key !== "lastUpdated" && (value === null || value === ""))
    .map(([key]) => key);

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Section id="business" title="Business" description="From lib/business.ts, the one file that says who the business is.">
          <div className={cx(cardClass, "p-5")}>
            {isPlaceholderBusiness ? (
              <p className="mb-4 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <StoreIcon className="size-4" />
                These are still the placeholder details.
              </p>
            ) : null}
            <KeyValues
              items={[
                { label: "Name", value: business.name },
                { label: "Phone", value: business.phone },
                { label: "Email", value: <span className="break-all">{business.email}</span> },
                { label: "Currency", value: business.currency.toUpperCase() },
                { label: "Event notice", value: `${business.leadTimeDays} days` },
                { label: "Smallest event", value: `${business.minimumGuests} guests` },
              ]}
            />
          </div>
        </Section>

        <Section id="location" title="Location and service area">
          <div className={cx(cardClass, "p-5")}>
            <p className="flex items-start gap-2 text-sm">
              <GlobeIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
              Delivering to {business.serviceArea}
            </p>
            {business.location && mapsEnabled ? (
              <>
                <p className="mt-3 flex items-start gap-2 text-sm">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  {business.location.label}
                </p>
                <MapFrame point={business.location} title="Map of the kitchen" className="mt-3" height="h-48" />
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Add the kitchen&apos;s location to lib/business.ts to show it on a map here and on the contact page.
              </p>
            )}
          </div>
        </Section>

        <Section id="notice" title="Site notice" description="A one-line message across the top of every page.">
          <div className={cx(cardClass, "p-5")}>
            <NoticeForm current={announcement?.message ?? null} />
          </div>
        </Section>

        <Section id="team" title="Team and access">
          <div className={cx(cardClass, "p-5")}>
            <ul className="space-y-3">
              {owners.map((owner) => (
                <li key={owner.id} className="flex items-center gap-3">
                  <Avatar name={owner.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{owner.name}</p>
                    <p className="truncate text-xs text-ink-muted">{owner.email}</p>
                  </div>
                  <Pill tone="accent">Owner</Pill>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">
              Owner accounts see this portal; customers see only their own orders.{" "}
              {process.env.OWNER_EMAIL ? "The owner is chosen by OWNER_EMAIL." : "The first account became the owner; set OWNER_EMAIL to choose."}{" "}
              What the assistant may do is set under{" "}
              <Link href="/admin/praxi" className="font-medium text-accent hover:underline">
                Assistant
              </Link>
              .
            </p>
          </div>
        </Section>

        <Section id="integrations" title="Connections" className="xl:col-span-2">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <li key={integration.label} className={cx(cardClass, "flex gap-3 p-4")}>
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", integration.on ? "bg-accent-soft text-accent" : "bg-raised text-ink-subtle")}>
                  <integration.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {integration.label}
                    {integration.on ? <CheckCircleIcon className="size-4 text-accent" /> : null}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-muted">{integration.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-subtle">Connections are set in the hosting environment. The README lists each one.</p>
        </Section>

        <Section id="policies" title="Policies" className="xl:col-span-2">
          <div className={cx(cardClass, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
            <p className="flex items-start gap-2 text-sm text-ink-muted">
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
              {unsetPolicies.length > 0
                ? `The policy pages say "confirmed with you" for ${unsetPolicies.length} things you have not set yet, such as the cancellation window. Set them in lib/business.ts.`
                : "Every policy value is set."}
            </p>
            <Link href="/policies" className="shrink-0 text-sm font-medium text-accent hover:underline">
              View policies
            </Link>
          </div>
        </Section>
      </div>
    </div>
  );
}
