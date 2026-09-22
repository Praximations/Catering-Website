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

import { business } from "./business";
import type { DietaryTag } from "./dietary";

/** What a quantity MEANS for this product, which changes how it is priced. */
export type ProductUnit = "person" | "item" | "sandwich";

export interface Product {
  slug: string;
  name: string;
  description: string;
  image?: string;
  imageAlt?: string;
  priceMinor: number;
  unit: ProductUnit;
  category: "sandwich" | "package" | "platter" | "extra";
  /** Smallest order we will take of this line. */
  minQuantity: number;
  /**
   * How much to order, in the words a caterer would use on the phone. The
   * question every customer has at this point is "how many do I need", and a
   * price alone does not answer it.
   */
  serves?: string;
  dietary?: DietaryTag[];
}

export const products: Product[] = [
  {
    slug: "classic-sandwich-assortment",
    name: "Classic sandwich assortment",
    description:
      "Turkey and herb mayo, roast beef and horseradish, lemon chicken, mature cheddar, and hummus with crisp vegetables.",
    image: "/images/classic-sandwich-assortment.png",
    imageAlt: "Classic sandwich assortment with turkey, roast beef, chicken, cheese, and vegetable fillings",
    priceMinor: 1050,
    unit: "sandwich",
    category: "sandwich",
    minQuantity: 50,
    serves: "Allow one and a half to two per guest",
    dietary: ["vegetarian options"],
  },
  {
    slug: "vegetarian-sandwich-assortment",
    name: "Vegetarian sandwich assortment",
    description:
      "Mature cheddar and chutney, smashed chickpea, roasted vegetables, egg and watercress, and cucumber with herbed cream cheese.",
    image: "/images/vegetarian-sandwich-assortment.png",
    imageAlt: "Vegetarian sandwich assortment with fresh vegetables, cheese, and herb fillings",
    priceMinor: 950,
    unit: "sandwich",
    category: "sandwich",
    minQuantity: 50,
    serves: "Allow one and a half to two per guest",
    dietary: ["vegetarian"],
  },
  {
    slug: "premium-sandwich-assortment",
    name: "Premium sandwich assortment",
    description:
      "Prosciutto and mozzarella, smoked salmon, roast chicken pesto, brie and apple, and grilled portobello on bakery bread.",
    image: "/images/premium-sandwich-assortment.png",
    imageAlt: "Premium sandwich assortment with salmon, prosciutto, roast chicken, brie, and bakery bread",
    priceMinor: 1350,
    unit: "sandwich",
    category: "sandwich",
    minQuantity: 50,
    serves: "Allow one and a half to two per guest",
  },
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
    name: "Canapés",
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
    slug: "cheese-board",
    name: "Cheese board",
    description: "Four cheeses, crackers, fruit, and honey.",
    priceMinor: 6500,
    unit: "item",
    category: "platter",
    minQuantity: 1,
    serves: "Feeds about ten",
    dietary: ["vegetarian"],
  },
  {
    slug: "brownie-tray",
    name: "Brownie tray",
    description: "Still slightly underbaked in the middle, as they should be.",
    priceMinor: 3200,
    unit: "item",
    category: "platter",
    minQuantity: 1,
    serves: "Sixteen squares",
    dietary: ["vegetarian"],
  },
  {
    slug: "staff-hour",
    name: "Service staff",
    description: "One member of staff on site to serve and clear.",
    priceMinor: 3500,
    unit: "item",
    category: "extra",
    minQuantity: 3,
    serves: "Priced per member of staff, per hour",
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
  if (product.unit === "sandwich") {
    return `${quantity} sandwiches`;
  }
  return `${quantity} ${quantity === 1 ? "order" : "orders"}`;
}

export function unitLabel(product: Product): string {
  if (product.unit === "person") return "a head";
  if (product.unit === "sandwich") return "per sandwich";
  return "each";
}

export function quantityInputLabel(product: Product): string {
  if (product.unit === "person") return "People";
  if (product.unit === "sandwich") return "Sandwiches";
  return "Quantity";
}

/**
 * Cents to something a person reads. The locale is pinned so the wording
 * cannot drift with whatever locale the server happens to boot with.
 */
/**
 * The only place minor units become readable text.
 *
 * Intl does the symbol and the separators, so this reads correctly in
 * whatever currency lib/business.ts names rather than assuming a dollar
 * sign. `currency` is a parameter because an ORDER carries its own: one
 * placed before a currency change must still display in the currency it was
 * charged in.
 */
export function formatMoney(minor: number, currency: string = business.currency): string {
  return new Intl.NumberFormat(business.locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}

export const CATEGORY_LABELS: Record<Product["category"], string> = {
  sandwich: "Sandwich platters",
  package: "Priced per guest",
  platter: "Sharing platters and desserts",
  extra: "Staff and service",
};

export const CATEGORY_DESCRIPTIONS: Record<Product["category"], string> = {
  sandwich: "Made the morning of your order and delivered on platters, ready to put out.",
  package: "Complete menus with everything included. Tell us the head count and we plan the quantities.",
  platter: "Add to a lunch or order on their own for a meeting.",
  extra: "Someone on site to set out the food, serve, and clear away afterwards.",
};

export const CATEGORY_ORDER: Product["category"][] = ["sandwich", "package", "platter", "extra"];
