import { business, isPlaceholderBusiness } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap justify-between gap-6 text-sm">
          <div>
            <p className="font-display text-base text-ink">{business.name}</p>
            <p className="mt-1 text-ink-muted">{business.serviceArea}</p>
          </div>
          <div className="text-ink-muted">
            <p>
              <a href={`mailto:${business.email}`} className="transition-colors hover:text-ink">
                {business.email}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                className="transition-colors hover:text-ink"
              >
                {business.phone}
              </a>
            </p>
          </div>
        </div>

        {/* Honesty over polish: while the contact details are still the
            shipped placeholders, say so rather than let someone email a
            fake address. Editing lib/business.ts removes this. */}
        {isPlaceholderBusiness ? (
          <p className="mt-8 border-t border-line pt-6 text-xs text-ink-subtle">
            The name and contact details above are placeholders. Set the real ones in
            lib/business.ts.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
