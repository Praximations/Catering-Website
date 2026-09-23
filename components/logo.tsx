import Link from "next/link";
import { UtensilsIcon } from "./icons";
import { cx } from "./ui";

/**
 * The mark and the name. The mark is a placeholder in the same spirit as the
 * business details: an icon in the accent colour until there is a real logo,
 * at which point this is the one file to change.
 */
export function Logo({
  name,
  href = "/",
  compact,
  className,
}: {
  name: string;
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx("group inline-flex min-w-0 items-center gap-2.5 rounded-full pr-2 text-ink", className)}
      aria-label={compact ? `${name}, home` : undefined}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent shadow-xs transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-105">
        <UtensilsIcon className="size-4" />
      </span>
      {compact ? null : (
        <span className="truncate font-display text-[0.9375rem] font-semibold tracking-tight">{name}</span>
      )}
    </Link>
  );
}
