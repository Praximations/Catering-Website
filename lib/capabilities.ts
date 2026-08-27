import {
  clearProductOverride,
  getAllProducts,
  setProductAvailability,
  setProductPrice,
} from "./catalog";
import { ENQUIRY_STATUSES, listAllEnquiries, updateEnquiry } from "./enquiries";
import { ORDER_STATUSES, listAllOrders, updateOrder } from "./orders";
import { praxiOrderUpdated } from "./praxi";
import { formatMoney } from "./shop";
import { readData, updateData, type EnquiryStatus, type OrderStatus, type PermissionMode } from "./store";

/**
 * WHAT PRAXI CAN BE GIVEN. One entry per thing it could do to this site.
 *
 * This registry is the whole surface: the control endpoint can invoke
 * nothing that is not declared here, so "what could Praxi possibly do to
 * my website" is answered by reading one file. Adding a capability is a
 * deliberate act, and it arrives at its declared default rather than
 * inheriting somebody's old setting.
 *
 * Each entry carries the words the OWNER reads in the dashboard, not
 * developer shorthand. A permission screen nobody understands is a
 * permission screen nobody uses.
 */

export type CapabilityCategory = "orders" | "enquiries" | "customers" | "catalog" | "site";

export type Risk = "read" | "low" | "high";

export interface CapabilityContext {
  /** Which control key is acting, for the audit trail. */
  actor: string;
}

export interface CapabilityResult {
  ok: boolean;
  /** One line, owner facing. Ends up in the audit log. */
  detail: string;
  data?: unknown;
}

export interface Capability {
  id: string;
  label: string;
  /** Owner facing, plain language, says what it actually does. */
  description: string;
  category: CapabilityCategory;
  risk: Risk;
  defaultMode: PermissionMode;
  /** Null when the arguments are fine, otherwise the reason they are not. */
  validate(args: Record<string, unknown>): string | null;
  run(args: Record<string, unknown>, ctx: CapabilityContext): Promise<CapabilityResult>;
}

/* -------------------------------- helpers --------------------------------- */

const str = (args: Record<string, unknown>, key: string): string =>
  typeof args[key] === "string" ? (args[key] as string).trim() : "";

const num = (args: Record<string, unknown>, key: string): number | null => {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const bool = (args: Record<string, unknown>, key: string): boolean | null => {
  const value = args[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

/** Reads are capped so one call cannot pull the whole database. */
const READ_LIMIT = 50;
const limitOf = (args: Record<string, unknown>): number => {
  const raw = num(args, "limit");
  if (raw === null) return 20;
  return Math.min(Math.max(Math.trunc(raw), 1), READ_LIMIT);
};

const MAX_NOTE = 500;
const MAX_ANNOUNCEMENT = 200;

/* ------------------------------ the registry ------------------------------ */

export const CAPABILITIES: Capability[] = [
  /* -------------------------------- orders -------------------------------- */
  {
    id: "orders.read",
    label: "See orders",
    description:
      "Read recent orders: what was ordered, for when, by whom, and the total. Praxi already receives these as they happen.",
    category: "orders",
    risk: "read",
    defaultMode: "on",
    validate: () => null,
    run: async (args) => {
      const orders = (await listAllOrders()).slice(0, limitOf(args));
      return {
        ok: true,
        detail: `Read ${orders.length} order${orders.length === 1 ? "" : "s"}.`,
        // Deliberately shaped, not the raw row: the owner's private notes
        // are not part of what Praxi gets back.
        data: orders.map((order) => ({
          id: order.id,
          reference: order.reference,
          status: order.status,
          event_date: order.eventDate,
          guests: order.guests,
          total_minor: order.subtotalMinor,
          customer: { name: order.name, email: order.email, phone: order.phone },
          lines: order.lines.map((line) => ({
            product: line.slug,
            quantity: line.quantity,
            unit_price_minor: line.unitPriceMinor,
          })),
          notes: order.notes,
          placed_at: order.createdAt,
        })),
      };
    },
  },
  {
    id: "orders.update_status",
    label: "Move an order along",
    description:
      "Change an order between pending, confirmed, delivered, and cancelled. Cancelling is included, so this is worth thinking about.",
    category: "orders",
    risk: "low",
    defaultMode: "ask",
    validate: (args) => {
      if (!str(args, "order_id") && !str(args, "reference")) {
        return "Name the order by order_id or reference.";
      }
      const status = str(args, "status") as OrderStatus;
      if (!ORDER_STATUSES.includes(status)) {
        return `status must be one of: ${ORDER_STATUSES.join(", ")}.`;
      }
      return null;
    },
    run: async (args, ctx) => {
      const orders = await listAllOrders();
      const wanted = str(args, "order_id");
      const reference = str(args, "reference");
      const order = orders.find((o) => (wanted ? o.id === wanted : o.reference === reference));
      if (!order) return { ok: false, detail: "No order matches that id or reference." };

      const status = str(args, "status") as OrderStatus;
      if (order.status === status) {
        return { ok: true, detail: `Order ${order.reference} was already ${status}.` };
      }

      const updated = await updateOrder(order.id, { status });
      if (!updated) return { ok: false, detail: "That order disappeared before it could change." };

      // Praxi's copy stays in step, and the note says who did it.
      await praxiOrderUpdated(updated);
      return {
        ok: true,
        detail: `Order ${order.reference} moved from ${order.status} to ${status} by ${ctx.actor}.`,
      };
    },
  },
  {
    id: "orders.add_note",
    label: "Add a private note to an order",
    description:
      "Write on an order in the dashboard. Customers never see these notes.",
    category: "orders",
    risk: "low",
    defaultMode: "ask",
    validate: (args) => {
      if (!str(args, "order_id") && !str(args, "reference")) {
        return "Name the order by order_id or reference.";
      }
      if (!str(args, "note")) return "note is required.";
      return null;
    },
    run: async (args, ctx) => {
      const orders = await listAllOrders();
      const wanted = str(args, "order_id");
      const reference = str(args, "reference");
      const order = orders.find((o) => (wanted ? o.id === wanted : o.reference === reference));
      if (!order) return { ok: false, detail: "No order matches that id or reference." };

      // Appended, never replaced: an assistant must not be able to erase
      // what the owner wrote about a job.
      const addition = `${str(args, "note").slice(0, MAX_NOTE)} (${ctx.actor})`;
      const note = order.ownerNotes ? `${order.ownerNotes} | ${addition}` : addition;
      const updated = await updateOrder(order.id, { ownerNotes: note });
      if (!updated) return { ok: false, detail: "That order disappeared before it could change." };
      return { ok: true, detail: `Noted on order ${order.reference}.` };
    },
  },

  /* ------------------------------ enquiries ------------------------------- */
  {
    id: "enquiries.read",
    label: "See enquiries",
    description: "Read quote requests: the date, the head count, and what they asked for.",
    category: "enquiries",
    risk: "read",
    defaultMode: "on",
    validate: () => null,
    run: async (args) => {
      const enquiries = (await listAllEnquiries()).slice(0, limitOf(args));
      return {
        ok: true,
        detail: `Read ${enquiries.length} enquir${enquiries.length === 1 ? "y" : "ies"}.`,
        data: enquiries.map((enquiry) => ({
          id: enquiry.id,
          status: enquiry.status,
          event_date: enquiry.eventDate,
          guests: enquiry.guests,
          package: enquiry.packageSlug,
          customer: { name: enquiry.name, email: enquiry.email, phone: enquiry.phone },
          notes: enquiry.notes,
          sent_at: enquiry.createdAt,
        })),
      };
    },
  },
  {
    id: "enquiries.update_status",
    label: "Move an enquiry along",
    description:
      "Mark an enquiry as contacted, confirmed, or declined. Declining is included.",
    category: "enquiries",
    risk: "low",
    defaultMode: "ask",
    validate: (args) => {
      if (!str(args, "enquiry_id")) return "enquiry_id is required.";
      const status = str(args, "status") as EnquiryStatus;
      if (!ENQUIRY_STATUSES.includes(status)) {
        return `status must be one of: ${ENQUIRY_STATUSES.join(", ")}.`;
      }
      return null;
    },
    run: async (args, ctx) => {
      const status = str(args, "status") as EnquiryStatus;
      const changed = await updateEnquiry(str(args, "enquiry_id"), { status });
      if (!changed) return { ok: false, detail: "No enquiry matches that id." };
      return { ok: true, detail: `Enquiry marked ${status} by ${ctx.actor}.` };
    },
  },
  {
    id: "enquiries.add_note",
    label: "Add a private note to an enquiry",
    description: "Write on an enquiry in the dashboard. Customers never see these notes.",
    category: "enquiries",
    risk: "low",
    defaultMode: "ask",
    validate: (args) => {
      if (!str(args, "enquiry_id")) return "enquiry_id is required.";
      if (!str(args, "note")) return "note is required.";
      return null;
    },
    run: async (args, ctx) => {
      const enquiries = await listAllEnquiries();
      const enquiry = enquiries.find((e) => e.id === str(args, "enquiry_id"));
      if (!enquiry) return { ok: false, detail: "No enquiry matches that id." };

      const addition = `${str(args, "note").slice(0, MAX_NOTE)} (${ctx.actor})`;
      const note = enquiry.ownerNotes ? `${enquiry.ownerNotes} | ${addition}` : addition;
      await updateEnquiry(enquiry.id, { ownerNotes: note });
      return { ok: true, detail: "Noted on the enquiry." };
    },
  },

  /* ------------------------------ customers ------------------------------- */
  {
    id: "customers.read",
    label: "See customers",
    description:
      "Read the list of people with accounts: name, email, and when they joined. Never passwords.",
    category: "customers",
    risk: "read",
    defaultMode: "on",
    validate: () => null,
    run: async (args) => {
      const data = await readData();
      const users = data.users.slice(0, limitOf(args));
      return {
        ok: true,
        detail: `Read ${users.length} customer${users.length === 1 ? "" : "s"}.`,
        // Shaped by hand. A password hash must never leave the database,
        // and spreading the row would send one the moment nobody looked.
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          joined_at: user.createdAt,
        })),
      };
    },
  },

  /* ------------------------------- catalog -------------------------------- */
  {
    id: "catalog.read",
    label: "See the catalog",
    description: "Read what is on sale and what it costs, including anything currently off sale.",
    category: "catalog",
    risk: "read",
    defaultMode: "on",
    validate: () => null,
    run: async () => {
      const catalog = await getAllProducts();
      return {
        ok: true,
        detail: `Read ${catalog.length} products.`,
        data: catalog.map((product) => ({
          slug: product.slug,
          name: product.name,
          price_minor: product.priceMinor,
          base_price_minor: product.basePriceMinor,
          price_overridden: product.priceOverridden,
          unit: product.unit,
          available: product.available,
          min_quantity: product.minQuantity,
        })),
      };
    },
  },
  {
    id: "catalog.set_price",
    label: "Change a price",
    description:
      "Set what a product costs. Customers pay this immediately, including anyone with it already in their cart.",
    category: "catalog",
    risk: "high",
    defaultMode: "off",
    validate: (args) => {
      if (!str(args, "slug")) return "slug is required.";
      const price = num(args, "price_minor");
      if (price === null) return "price_minor is required, in whole cents.";
      if (!Number.isInteger(price)) return "price_minor must be a whole number of cents.";
      return null;
    },
    run: async (args, ctx) => {
      const result = await setProductPrice(
        str(args, "slug"),
        num(args, "price_minor") as number,
        ctx.actor
      );
      return { ok: result.ok, detail: result.detail };
    },
  },
  {
    id: "catalog.set_availability",
    label: "Take something on or off sale",
    description:
      "Hide a product from the shop, or put it back. Anything hidden also drops out of open carts.",
    category: "catalog",
    risk: "high",
    defaultMode: "off",
    validate: (args) => {
      if (!str(args, "slug")) return "slug is required.";
      if (bool(args, "available") === null) return "available must be true or false.";
      return null;
    },
    run: async (args, ctx) => {
      const result = await setProductAvailability(
        str(args, "slug"),
        bool(args, "available") as boolean,
        ctx.actor
      );
      return { ok: result.ok, detail: result.detail };
    },
  },
  {
    id: "catalog.reset_product",
    label: "Undo a catalog change",
    description: "Put a product back to the price and availability written in the code.",
    category: "catalog",
    risk: "low",
    defaultMode: "ask",
    validate: (args) => (str(args, "slug") ? null : "slug is required."),
    run: async (args) => {
      const cleared = await clearProductOverride(str(args, "slug"));
      return {
        ok: true,
        detail: cleared ? "Put back to the listed price and availability." : "Nothing to undo.",
      };
    },
  },

  /* --------------------------------- site --------------------------------- */
  {
    id: "site.set_announcement",
    label: "Put a notice on the site",
    description:
      "Show a line across the top of every page, for example that a date is fully booked. Every visitor sees it.",
    category: "site",
    risk: "high",
    defaultMode: "off",
    validate: (args) => {
      const message = str(args, "message");
      if (!message) return "message is required.";
      if (message.length > MAX_ANNOUNCEMENT) {
        return `message must be ${MAX_ANNOUNCEMENT} characters or fewer.`;
      }
      return null;
    },
    run: async (args, ctx) => {
      const message = str(args, "message").slice(0, MAX_ANNOUNCEMENT);
      await updateData((data) => {
        data.announcement = { message, setBy: ctx.actor, setAt: new Date().toISOString() };
      });
      return { ok: true, detail: `Notice put up: "${message}"` };
    },
  },
  {
    id: "site.clear_announcement",
    label: "Take the notice down",
    description: "Remove the line across the top of the site.",
    category: "site",
    risk: "low",
    defaultMode: "ask",
    validate: () => null,
    run: async () => {
      const had = await updateData((data) => {
        const existed = data.announcement !== null;
        data.announcement = null;
        return existed;
      });
      return { ok: true, detail: had ? "Notice taken down." : "There was no notice up." };
    },
  },
];

const BY_ID = new Map(CAPABILITIES.map((capability) => [capability.id, capability]));

export function findCapability(id: string): Capability | undefined {
  return BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  orders: "Orders",
  enquiries: "Enquiries",
  customers: "Customers",
  catalog: "Menu and prices",
  site: "The website itself",
};

export const RISK_LABELS: Record<Risk, string> = {
  read: "Reads only",
  low: "Changes your dashboard",
  high: "Customers see this",
};

/** Money for an owner facing line, so capability results read properly. */
export { formatMoney };
