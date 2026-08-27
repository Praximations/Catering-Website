/**
 * THE SHOP: what someone can actually order online, as opposed to the
 * menu, which is what the kitchen can cook.
 *
 * SAMPLE CONTENT, like lib/menu.ts. Real prices are a decision nobody has
 * made yet, so these are round numbers that read as examples.
 *
 * MONEY IS ALWAYS AN INTEGER IN CENTS. Never a float, never a string.
 * 4250 is $42.50. Floating point cannot represent 0.10, and the moment a
 * price becomes a decimal somewhere in the middle, totals stop adding up.
 * formatMoney below is the only place cents turn into something readable.
 */

/** What a quantity MEANS for this product, which changes how it is priced. */
export type ProductUnit = "person" | "item";

export interface Product {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  unit: ProductUnit;
  category: "package" | "platter" | "extra";
  /** Smallest order we will take of this line. */
  minQuantity: number;
}

export const products: Product[] = [
  {
    slug: "buffet-per-head",
    name: "Buffet",
    description:
      "The full spread: two mains, potatoes, and salads, laid out for people to help themselves.",
    priceMinor: 3200,
    unit: "person",
    category: "package",
    minQuantity: 20,
  },
  {
    slug: "plated-per-head",
    name: "Plated dinner",
    description: "Three courses brought to the table. Needs seating and a firm head count.",
    priceMinor: 5800,
    unit: "person",
    category: "package",
    minQuantity: 20,
  },
  {
    slug: "canapes-per-head",
    name: "Canapes",
    description: "Six passed bites a head, for a standing event of an hour or two.",
    priceMinor: 2400,
    unit: "person",
    category: "package",
    minQuantity: 20,
  },
  {
    slug: "office-lunch-per-head",
    name: "Office lunch",
    description: "Sandwiches, two salads, fruit and something sweet. Dropped off and cleared away.",
    priceMinor: 1800,
    unit: "person",
    category: "package",
    minQuantity: 8,
  },
  {
    slug: "sandwich-platter",
    name: "Sandwich platter",
    description: "Twelve rounds on real bread, cut properly. Feeds about six.",
    priceMinor: 4800,
    unit: "item",
    category: "platter",
    minQuantity: 1,
  },
  {
    slug: "cheese-board",
    name: "Cheese board",
    description: "Four cheeses, crackers, fruit, and honey. Feeds about ten.",
    priceMinor: 6500,
    unit: "item",
    category: "platter",
    minQuantity: 1,
  },
  {
    slug: "brownie-tray",
    name: "Brownie tray",
    description: "Sixteen squares, still slightly underbaked in the middle, as they should be.",
    priceMinor: 3200,
    unit: "item",
    category: "platter",
    minQuantity: 1,
  },
  {
    slug: "staff-hour",
    name: "Service staff",
    description: "One member of staff on site, per hour, to serve and clear.",
    priceMinor: 3500,
    unit: "item",
    category: "extra",
    minQuantity: 3,
  },
];

const BY_SLUG = new Map(products.map((p) => [p.slug, p]));

export function findProduct(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

/** "12 people" or "2 platters", so a quantity never appears without meaning. */
export function quantityLabel(product: Product, quantity: number): string {
  if (product.unit === "person") {
    return `${quantity} ${quantity === 1 ? "person" : "people"}`;
  }
  return `${quantity} ${quantity === 1 ? "order" : "orders"}`;
}

export function unitLabel(product: Product): string {
  return product.unit === "person" ? "a head" : "each";
}

/**
 * Cents to something a person reads. The locale is pinned so the wording
 * cannot drift with whatever locale the server happens to boot with.
 */
export function formatMoney(minor: number): string {
  return `$${(minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CATEGORY_LABELS: Record<Product["category"], string> = {
  package: "By the head",
  platter: "Platters and trays",
  extra: "Extras",
};

export const CATEGORY_ORDER: Product["category"][] = ["package", "platter", "extra"];
