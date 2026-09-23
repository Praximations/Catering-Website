import Link from "next/link";
import { DIETARY, DIETARY_LEGEND, type DietaryTag } from "@/lib/dietary";

/**
 * The marks beside a dish, and the legend that explains them.
 *
 * `title` and a screen-reader label on every mark, because "VG" on its own is
 * a guess for anybody who has not seen the legend.
 */
export function DietaryMarks({ tags }: { tags?: readonly DietaryTag[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {tags.map((tag) => {
        const { mark, label, onRequest } = DIETARY[tag];
        // `relative` holds the sr-only label, which is absolutely positioned.
        // Without it, inside the home page's sideways carousel the label
        // escaped the scroller's clip and widened the whole page on a phone.
        return (
          <abbr
            key={tag}
            title={label}
            className={`relative inline-flex h-5 min-w-5 cursor-help items-center justify-center rounded-full px-1.5 font-sans text-[0.6875rem] font-semibold no-underline ${
              onRequest
                ? "border border-accent/40 text-accent"
                : "bg-accent/10 text-accent-strong"
            }`}
          >
            <span aria-hidden>{onRequest ? `${mark}*` : mark}</span>
            <span className="sr-only">{label}</span>
          </abbr>
        );
      })}
    </span>
  );
}

export function DietaryLegend({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted ${className}`}>
      {DIETARY_LEGEND.map((entry) => (
        <span key={entry.mark} className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/10 px-1.5 text-[0.6875rem] font-semibold text-accent-strong">
            {entry.mark}
          </span>
          {entry.label}
        </span>
      ))}
      <span>* On request</span>
      <span>
        Allergies? Add them at checkout.{" "}
        <Link href="/policies/allergens" className="underline underline-offset-2 hover:text-ink">
          Allergen notice
        </Link>
      </span>
    </p>
  );
}
