import { formatSentAt } from "./enquiry";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { formatMoney } from "@/lib/shop";
import type { OrderLine, OrderStatus } from "@/lib/store";

/** Shared order rendering, so both dashboards describe an order the same way. */

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-accent bg-accent/10 text-accent-strong",
  confirmed: "border-accent-strong bg-accent text-on-accent",
  fulfilled: "border-line bg-raised text-ink-muted",
  cancelled: "border-line bg-surface text-ink-subtle",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function OrderLines({ lines }: { lines: OrderLine[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-sm">
      {lines.map((line) => (
        <li key={line.slug} className="flex justify-between gap-4">
          <span className="text-ink-muted">
            {line.name}
            <span className="text-ink-subtle">
              {" "}
              &middot; {line.quantity} {line.unit === "person" ? "people" : "ordered"} at{" "}
              {formatMoney(line.unitPriceMinor)}
            </span>
          </span>
          <span className="shrink-0 text-ink">{formatMoney(line.lineTotalMinor)}</span>
        </li>
      ))}
    </ul>
  );
}

export { formatSentAt };
