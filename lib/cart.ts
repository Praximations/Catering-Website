import { cookies } from "next/headers";
import { getProduct, getProducts, type ResolvedProduct } from "./catalog";

/**
 * The cart, kept in a cookie.
 *
 * THE COOKIE HOLDS SLUGS AND QUANTITIES, NEVER PRICES. A cookie is
 * client-side data and a customer can edit it, so a price that came out of
 * one would be a price the customer chose. Every total on this site is
 * computed here, server side, from the catalog.
 *
 * No signing, because there is nothing to forge: the worst a tampered
 * cookie can do is put a different real product in the cart, which is the
 * same thing the add button does.
 */

const COOKIE = "catering_cart";
/** Small enough to stay far inside the 4KB cookie ceiling. */
const MAX_LINES = 20;
const MAX_QUANTITY = 2000;

/** What is stored: s = slug, q = quantity. Short keys, small cookie. */
interface StoredLine {
  s: string;
  q: number;
}

export interface CartLine {
  /** Resolved, so a price the owner or Praxi changed is the price charged. */
  product: ResolvedProduct;
  quantity: number;
  lineTotalMinor: number;
}

export interface Cart {
  lines: CartLine[];
  subtotalMinor: number;
  /** Total distinct products, which is what the header badge shows. */
  count: number;
}

export const EMPTY_CART: Cart = { lines: [], subtotalMinor: 0, count: 0 };

function parse(raw: string | undefined): StoredLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((line): line is StoredLine => {
        if (!line || typeof line !== "object") return false;
        const candidate = line as Partial<StoredLine>;
        return typeof candidate.s === "string" && typeof candidate.q === "number";
      })
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

/**
 * Stored lines to a priced cart, at CURRENT prices.
 *
 * Unknown slugs are dropped rather than guessed at, and anything taken off
 * sale disappears from the cart rather than being sold anyway: a product
 * must not linger in somebody's cart at a price or a state that no longer
 * exists. Re-pricing happens on every read, so a price change reaches an
 * abandoned cart too.
 */
async function build(stored: StoredLine[]): Promise<Cart> {
  if (stored.length === 0) return { lines: [], subtotalMinor: 0, count: 0 };

  // One lookup for every line, not one per line. The cart is rebuilt on
  // every render of every page that shows the header badge, so a per-line
  // query here was a database round trip per item on every request.
  const products = await getProducts(stored.map((line) => line.s));

  const lines: CartLine[] = [];
  for (const line of stored) {
    const product = products.get(line.s);
    if (!product || !product.available) continue;
    const quantity = Math.min(Math.max(Math.trunc(line.q), 1), MAX_QUANTITY);
    lines.push({
      product,
      quantity,
      lineTotalMinor: product.priceMinor * quantity,
    });
  }
  return {
    lines,
    subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0),
    count: lines.length,
  };
}

/** Readable anywhere on the server. */
export async function getCart(): Promise<Cart> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return build(parse(raw));
}

/**
 * Write the cart. SERVER ACTIONS AND ROUTE HANDLERS ONLY, because cookies
 * cannot be set once a Server Component has started rendering.
 */
async function writeCart(stored: StoredLine[]): Promise<void> {
  const store = await cookies();
  if (stored.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(stored), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function readStored(): Promise<StoredLine[]> {
  return parse((await cookies()).get(COOKIE)?.value);
}

export async function addToCart(slug: string, quantity: number): Promise<void> {
  const product = await getProduct(slug);
  // Off sale means off sale, whichever page still shows a button for it.
  if (!product || !product.available) return;

  const wanted = Math.min(Math.max(Math.trunc(quantity), 1), MAX_QUANTITY);
  const stored = await readStored();
  const existing = stored.find((line) => line.s === slug);

  if (existing) {
    existing.q = Math.min(existing.q + wanted, MAX_QUANTITY);
  } else {
    if (stored.length >= MAX_LINES) return;
    stored.push({ s: slug, q: wanted });
  }
  await writeCart(stored);
}

export async function setCartQuantity(slug: string, quantity: number): Promise<void> {
  const stored = await readStored();
  const wanted = Math.trunc(quantity);

  if (wanted < 1) {
    await writeCart(stored.filter((line) => line.s !== slug));
    return;
  }
  const existing = stored.find((line) => line.s === slug);
  if (!existing) return;
  existing.q = Math.min(wanted, MAX_QUANTITY);
  await writeCart(stored);
}

export async function removeFromCart(slug: string): Promise<void> {
  await writeCart((await readStored()).filter((line) => line.s !== slug));
}

export async function clearCart(): Promise<void> {
  await writeCart([]);
}

/**
 * Lines that are under their product's minimum. Checkout reports these
 * rather than silently rounding a quantity up, because a customer who
 * asked for eight and was charged for twenty would be right to be cross.
 */
export function belowMinimum(cart: Cart): CartLine[] {
  return cart.lines.filter((line) => line.quantity < line.product.minQuantity);
}
