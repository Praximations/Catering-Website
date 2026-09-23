import { formatSentAt } from "./enquiry";
import {
  BanIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  RepeatIcon,
  TruckIcon,
  type Icon,
} from "./icons";
import { cx, Pill, type Tone } from "./ui";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { formatMoney } from "@/lib/shop";
import type { OrderLine, OrderStatus, PaymentStatus } from "@/lib/db/types";

/**
 * How an order is described, everywhere: the customer's pages and the Owner
 * Portal use these, so the same state never gets two names or two colours.
 *
 * Status is always a pill with an icon and a word, never colour alone.
 */

const ORDER_TONE: Record<OrderStatus, { tone: Tone; icon: Icon; live?: boolean }> = {
  pending: { tone: "warning", icon: ClockIcon, live: true },
  confirmed: { tone: "accent", icon: CheckCircleIcon },
  fulfilled: { tone: "info", icon: TruckIcon },
  cancelled: { tone: "muted", icon: BanIcon },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { tone, icon } = ORDER_TONE[status];
  return (
    <Pill tone={tone} icon={icon}>
      {ORDER_STATUS_LABELS[status]}
    </Pill>
  );
}

/**
 * Three states, not two. Refunded has to read differently from unpaid: money
 * arrived and went back, and showing it as "Unpaid" would have the owner
 * chasing a payment they refunded.
 */
const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone; icon: Icon }> = {
  paid: { label: "Paid", tone: "accent", icon: CheckIcon },
  unpaid: { label: "Unpaid", tone: "neutral", icon: CreditCardIcon },
  refunded: { label: "Refunded", tone: "highlight", icon: RepeatIcon },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { label, tone, icon } = PAYMENT[status];
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}

/** Where an order is. Cancelled replaces the tracker rather than being a stop on it. */
const STEPS: { status: OrderStatus; label: string; icon: Icon }[] = [
  { status: "pending", label: "Received", icon: ClockIcon },
  { status: "confirmed", label: "Confirmed", icon: CheckCircleIcon },
  { status: "fulfilled", label: "Delivered", icon: TruckIcon },
];

/**
 * The progress tracker. The line between steps draws itself up to the current
 * one, and the current step pulses softly while the order is waiting on the
 * business, so "where is it" is answered before a word is read.
 */
export function OrderTimeline({ status, compact }: { status: OrderStatus; compact?: boolean }) {
  const reached = STEPS.findIndex((step) => step.status === status);

  return (
    <ol aria-label="Order progress" className="relative grid grid-cols-3">
      {/* The track, then the filled part, drawn left to right. */}
      <span aria-hidden className={cx("absolute top-4 right-[16.66%] left-[16.66%] h-0.5 rounded-full bg-line", compact && "top-3")} />
      <span
        aria-hidden
        className={cx(
          "absolute top-4 left-[16.66%] h-0.5 origin-left rounded-full bg-accent motion-safe:animate-[grow-x_700ms_var(--ease-out-soft)_both]",
          compact && "top-3"
        )}
        style={{ width: `${(Math.max(reached, 0) / (STEPS.length - 1)) * 66.66}%` }}
      />
      {STEPS.map((step, index) => {
        const done = index < reached || (index === reached && status === "fulfilled");
        const current = index === reached && !done;
        const StepIcon = done ? CheckIcon : step.icon;
        return (
          <li
            key={step.status}
            aria-current={index === reached ? "step" : undefined}
            className="relative flex flex-col items-center text-center"
          >
            <span className="relative grid place-items-center">
              {current ? (
                <span aria-hidden className="absolute inset-0 rounded-full bg-accent/30 motion-safe:animate-ping-soft" />
              ) : null}
              <span
                className={cx(
                  "relative grid place-items-center rounded-full border-2 transition-colors",
                  compact ? "size-6" : "size-8",
                  done
                    ? "border-accent bg-accent text-on-accent"
                    : current
                      ? "border-accent bg-surface text-accent"
                      : "border-line bg-surface text-ink-subtle"
                )}
                style={done ? { animation: `pop 460ms var(--ease-spring) ${index * 140}ms both` } : undefined}
              >
                <StepIcon className={compact ? "size-3" : "size-4"} />
              </span>
            </span>
            <span
              className={cx(
                "mt-2 text-xs font-medium",
                index <= reached ? "text-ink" : "text-ink-subtle",
                compact && "sr-only sm:not-sr-only"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * `currency` is required rather than defaulted: these are the lines of an
 * ORDER, which carries the currency it was charged in.
 */
export function OrderLines({ lines, currency }: { lines: OrderLine[]; currency: string }) {
  return (
    <ul className="divide-y divide-line text-sm">
      {lines.map((line) => (
        <li key={line.slug} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0">
            <span className="text-ink">{line.name}</span>
            <span className="block text-xs text-ink-subtle">
              {line.quantity}{" "}
              {line.unit === "person" ? "people" : line.unit === "sandwich" ? "sandwiches" : "ordered"} ×{" "}
              {formatMoney(line.unitPriceMinor, currency)}
            </span>
          </span>
          <span className="shrink-0 font-medium text-ink tabular-nums">{formatMoney(line.lineTotalMinor, currency)}</span>
        </li>
      ))}
    </ul>
  );
}

export { formatSentAt };
