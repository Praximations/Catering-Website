import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/icons";
import { business, isPlaceholderBusiness } from "@/lib/business";
import { phoneHref } from "@/lib/facts";

/**
 * A footer that answers the questions people scroll down for: how do I reach
 * you, where do you deliver, and where do I order.
 *
 * Social links appear only once they are set in lib/business.ts. A greyed out
 * icon that goes nowhere looks like a broken link to a visitor, and the owner
 * already sees the gap in that file.
 */
export function SiteFooter() {
  const socials = [
    { label: "Instagram", href: business.social.instagram, icon: InstagramIcon },
    { label: "Facebook", href: business.social.facebook, icon: FacebookIcon },
  ].filter((social) => social.href);

  const columns = [
    {
      title: "Order",
      links: [
        { href: "/shop", label: "Order online" },
        { href: "/menu", label: "Event menus" },
        { href: "/cart", label: "Your order" },
      ],
    },
    {
      title: "About",
      links: [
        { href: "/about", label: "How it works" },
        { href: "/contact", label: "Contact" },
        { href: "/login", label: "Sign in" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-raised">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="font-display text-xl text-ink">
            {business.name}
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-muted">{business.tagline}.</p>
          {socials.length > 0 ? (
            <div className="mt-5 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="grid size-9 place-items-center rounded-sm border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
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

        <div>
          <h2 className="text-sm font-semibold text-ink">Get in touch</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={phoneHref} className="text-ink-muted transition-colors hover:text-ink">
                {business.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${business.email}`} className="text-ink-muted transition-colors hover:text-ink">
                {business.email}
              </a>
            </li>
            <li className="leading-6 text-ink-muted">Delivering to {business.serviceArea}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-ink-subtle sm:flex-row sm:justify-between sm:px-8">
          <p>
            &copy; {new Date().getFullYear()} {business.name}
          </p>
          {/* Said out loud, so nobody emails a placeholder address expecting a reply. */}
          {isPlaceholderBusiness ? (
            <p>The business name and contact details on this site are placeholders.</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
