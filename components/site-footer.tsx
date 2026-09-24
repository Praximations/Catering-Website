import Link from "next/link";
import { FacebookIcon, InstagramIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { business, isPlaceholderBusiness } from "@/lib/business";
import { phoneHref } from "@/lib/facts";

/**
 * The footer: a sheet as wide as the navbar, rounded at the top and running
 * into the bottom of the window, so the page ends on it rather than on a card
 * floating above a gap. It holds the three things people scroll down for: how
 * to reach you, where to order, and the policies.
 *
 * Not rendered on sign in and sign up (app/(auth) has its own layout), where
 * anything that leads away from the form is a distraction.
 *
 * Social links appear only once they are set in lib/business.ts. An icon that
 * goes nowhere looks like a broken link.
 */
const columns = [
  {
    title: "Order",
    links: [
      { href: "/shop", label: "Order online" },
      { href: "/catalog", label: "Catalog" },
      { href: "/quote", label: "Plan an event" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "How it works" },
      { href: "/contact", label: "Contact" },
      { href: "/account", label: "Your account" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/policies/privacy", label: "Privacy" },
      { href: "/policies/terms", label: "Terms" },
      { href: "/policies/refunds", label: "Refunds" },
      { href: "/policies/delivery", label: "Delivery" },
    ],
  },
];

export function SiteFooter() {
  const socials = [
    { label: "Instagram", href: business.social.instagram, icon: InstagramIcon },
    { label: "Facebook", href: business.social.facebook, icon: FacebookIcon },
  ].filter((social) => social.href);

  return (
    <footer className="mt-20 px-3 lg:px-4">
      <div className="rounded-t-2xl border border-b-0 border-line bg-surface shadow-up">
        <div className="mx-auto grid max-w-page grid-cols-1 gap-8 px-6 pt-12 pb-10 sm:px-10 md:grid-cols-[1.3fr_3fr] md:gap-10 lg:px-12 lg:pt-16 lg:pb-12">
          <div className="max-w-xs">
            <Logo name={business.name} />
            <p className="mt-4 text-sm leading-6 text-ink-muted">{business.tagline}.</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href={phoneHref} className="group inline-flex items-center gap-2 text-ink transition-colors hover:text-accent">
                  <PhoneIcon className="size-4 text-ink-subtle transition-colors group-hover:text-accent" />
                  {business.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${business.email}`} className="group inline-flex items-center gap-2 text-ink transition-colors hover:text-accent">
                  <MailIcon className="size-4 text-ink-subtle transition-colors group-hover:text-accent" />
                  {business.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-ink-muted">
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                {business.serviceArea}
              </li>
            </ul>
            {socials.length > 0 ? (
              <div className="mt-5 flex gap-1.5">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                  >
                    <social.icon className="size-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Three across even on a phone, where stacked they made the footer
              longer than most of the pages above it. */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-xs font-semibold text-ink-subtle">{column.title}</h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-ink-muted transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom padding clears the phone's dock, which floats over this. The
            rule sits inside the padding so it lines up with the columns above. */}
        <div className="mx-auto max-w-page px-6 pb-28 sm:px-10 lg:px-12 lg:pb-6">
          <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {business.name}
            </p>
            {/* Said out loud, so nobody emails a placeholder address expecting a reply. */}
            {isPlaceholderBusiness ? <p>The business details on this site are placeholders.</p> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
