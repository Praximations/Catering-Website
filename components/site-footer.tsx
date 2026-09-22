import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/icons";
import { business, isPlaceholderBusiness } from "@/lib/business";

export function SiteFooter() {
  const socials = [
    { label: "Instagram", href: business.social.instagram, icon: InstagramIcon },
    { label: "Facebook", href: business.social.facebook, icon: FacebookIcon },
  ];

  return (
    <footer className="mt-24 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-[90rem] rounded-[2rem] border border-line bg-raised/70 px-6 py-9 sm:px-10 lg:px-14">
        <div className="grid gap-9 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <Link href="/" className="inline-flex items-center gap-3 text-ink">
            <span className="grid size-10 place-items-center rounded-full border border-ink/15 font-display italic">{business.name.slice(0, 1)}</span>
            <span className="font-display text-xl">{business.name}</span>
          </Link>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-muted md:justify-center">
            <Link href="/menu" className="hover:text-ink">Catalog</Link>
            <Link href="/shop" className="hover:text-ink">Order</Link>
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/contact" className="hover:text-ink">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 md:justify-end">
            {socials.map((social) => {
              const Icon = social.icon;
              const style = "grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-muted transition-all";
              return social.href ? (
                <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} className={`${style} hover:-translate-y-0.5 hover:text-ink`}>
                  <Icon className="size-4" />
                </a>
              ) : (
                <span key={social.label} aria-label={`${social.label} link not configured`} title={`Add ${social.label} in lib/business.ts`} className={`${style} opacity-45`}>
                  <Icon className="size-4" />
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{business.email} · {business.phone}</p>
          {isPlaceholderBusiness ? <p>Business details are placeholders.</p> : <p>{business.serviceArea}</p>}
        </div>
      </div>
    </footer>
  );
}
