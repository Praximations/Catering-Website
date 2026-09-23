import { CheckIcon } from "./icons";
import { cx } from "./ui";

/**
 * Where somebody is in a short flow. Done steps get a check, the current one
 * is filled, and the connecting line fills up to it, so progress is obvious at
 * a glance without reading the labels.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  /** Index of the current step. Everything before it is done. */
  current: number;
  className?: string;
}) {
  return (
    <ol aria-label="Progress" className={cx("flex items-center gap-2 sm:gap-3", className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 last:flex-none">
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-accent text-on-accent",
                  active && "bg-ink text-on-accent ring-4 ring-ink/10",
                  !done && !active && "bg-raised text-ink-subtle"
                )}
              >
                {done ? <CheckIcon className="size-3.5 animate-pop" /> : index + 1}
              </span>
              <span className={cx("hidden text-sm font-medium sm:inline", active || done ? "text-ink" : "text-ink-subtle")}>
                {label}
              </span>
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden className="relative h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className={cx(
                    "absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-500 ease-soft",
                    done ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
