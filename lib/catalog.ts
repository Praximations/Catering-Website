import { db } from "./db";
import type { ProductOverrideRecord } from "./db/types";
import { products as baseProducts, type Product } from "./shop";

/**
 * The live catalog: what lib/shop.ts declares, plus whatever the owner or
 * Praxi has changed since.
 *
 * The FILE stays the source of truth for what exists. This layer can only
 * change a price or take something off sale; it can never invent a product
 * or delete one. That asymmetry is on purpose: it means an automated
 * change is always visible as a deviation from the file, and clearing the
 * override puts things back exactly as written.
 */

export interface ResolvedProduct extends Product {
  available: boolean;
  /** True when the price differs from what lib/shop.ts declares. */
  priceOverridden: boolean;
  basePriceMinor: number;
}

/**
 * Guardrails on an automated price change, applied even when permission
 * says yes. Permission answers "may you"; these answer "how far", and a
 * fat fingered or hallucinated price is the failure they exist for. A
 * deliberate repricing outside these bounds is a job for the file.
 */
export const PRICE_FLOOR_MINOR = 100;
export const PRICE_CEILING_MINOR = 1_000_000;
export const MAX_PRICE_MULTIPLE = 3;

function resolve(
  product: Product,
  override: ProductOverrideRecord | undefined
): ResolvedProduct {
  const priceMinor = override?.priceMinor ?? product.priceMinor;
  return {
    ...product,
    priceMinor,
    basePriceMinor: product.priceMinor,
    priceOverridden: priceMinor !== product.priceMinor,
    available: override?.available ?? true,
  };
}

async function overridesBySlug(): Promise<Map<string, ProductOverrideRecord>> {
  const rows = await db.productOverrides.find();
  return new Map(rows.map((row) => [row.slug, row]));
}

/** Every product, including ones taken off sale. For the owner and Praxi. */
export async function getAllProducts(): Promise<ResolvedProduct[]> {
  const overrides = await overridesBySlug();
  return baseProducts.map((product) => resolve(product, overrides.get(product.slug)));
}

/** What a customer may see and buy. */
export async function getAvailableProducts(): Promise<ResolvedProduct[]> {
  return (await getAllProducts()).filter((product) => product.available);
}

export async function getProduct(slug: string): Promise<ResolvedProduct | null> {
  const product = baseProducts.find((candidate) => candidate.slug === slug);
  if (!product) return null;
  const override = await db.productOverrides.findOne({ all: { slug } });
  return resolve(product, override ?? undefined);
}

/**
 * Several products in one query, for pricing a whole cart.
 *
 * The cart reads every line on every render, and one lookup per line made
 * that one database round trip per line.
 */
export async function getProducts(slugs: readonly string[]): Promise<Map<string, ResolvedProduct>> {
  const wanted = baseProducts.filter((product) => slugs.includes(product.slug));
  if (wanted.length === 0) return new Map();

  const rows = await db.productOverrides.find({
    all: { slug: { in: wanted.map((product) => product.slug) } },
  });
  const overrides = new Map(rows.map((row) => [row.slug, row]));

  return new Map(
    wanted.map((product) => [product.slug, resolve(product, overrides.get(product.slug))])
  );
}

/**
 * Change ONE column of a product's override row, leaving the others alone.
 *
 * An upsert sets every column in its payload, so the naive
 * read-the-row-and-write-it-all-back shape silently reverts whatever else
 * changed in between. Insert the row if it is missing, otherwise patch only
 * what the caller named.
 */
async function writeOverride(
  slug: string,
  patch: { priceMinor?: number; available?: boolean },
  by: string
): Promise<void> {
  const now = new Date().toISOString();
  const updated = await db.productOverrides.update(
    { all: { slug } },
    { ...patch, updatedAt: now, updatedBy: by }
  );
  if (updated.length > 0) return;

  // No row yet. A concurrent caller may be inserting the same one, so a
  // collision here means theirs landed first and the patch is applied to it.
  const created = await db.productOverrides.insertIfAbsent({
    slug,
    priceMinor: patch.priceMinor ?? null,
    available: patch.available ?? null,
    updatedAt: now,
    updatedBy: by,
  });
  if (!created) {
    await db.productOverrides.update(
      { all: { slug } },
      { ...patch, updatedAt: now, updatedBy: by }
    );
  }
}

export interface PriceChangeResult {
  ok: boolean;
  detail: string;
  from?: number;
  to?: number;
}

export async function setProductPrice(
  slug: string,
  priceMinor: number,
  by: string
): Promise<PriceChangeResult> {
  const product = baseProducts.find((candidate) => candidate.slug === slug);
  if (!product) return { ok: false, detail: `No product called ${slug}.` };

  if (!Number.isInteger(priceMinor)) {
    return { ok: false, detail: "A price must be a whole number of cents." };
  }
  if (priceMinor < PRICE_FLOOR_MINOR || priceMinor > PRICE_CEILING_MINOR) {
    return {
      ok: false,
      detail: `A price must be between ${PRICE_FLOOR_MINOR} and ${PRICE_CEILING_MINOR} cents.`,
    };
  }
  const highest = product.priceMinor * MAX_PRICE_MULTIPLE;
  const lowest = Math.floor(product.priceMinor / MAX_PRICE_MULTIPLE);
  if (priceMinor > highest || priceMinor < lowest) {
    return {
      ok: false,
      detail: `That is more than ${MAX_PRICE_MULTIPLE}x away from the listed price of ${product.priceMinor} cents. Change it in lib/shop.ts if it is deliberate.`,
    };
  }

  const existing = await db.productOverrides.findOne({ all: { slug } });
  const from = existing?.priceMinor ?? product.priceMinor;

  // Only the price column. Reading `available` and writing it back would undo
  // a concurrent change to it: the owner takes something off sale while this
  // reprices it, and the row goes back on sale at the new price because this
  // read happened before that write.
  await writeOverride(slug, { priceMinor }, by);

  return {
    ok: true,
    detail: `${product.name} moved from ${from} to ${priceMinor} cents.`,
    from,
    to: priceMinor,
  };
}

export async function setProductAvailability(
  slug: string,
  available: boolean,
  by: string
): Promise<{ ok: boolean; detail: string }> {
  const product = baseProducts.find((candidate) => candidate.slug === slug);
  if (!product) return { ok: false, detail: `No product called ${slug}.` };

  // Same reasoning as setProductPrice: this touches `available` and nothing
  // else, so a concurrent repricing survives it.
  await writeOverride(slug, { available }, by);

  return {
    ok: true,
    detail: `${product.name} is now ${available ? "on sale" : "off sale"}.`,
  };
}

/** Put a product back to exactly what the file says. */
export async function clearProductOverride(slug: string): Promise<boolean> {
  return (await db.productOverrides.remove({ all: { slug } })) > 0;
}

/** Everything currently deviating from the file, for the owner to review. */
export async function listOverrides(): Promise<
  { product: ResolvedProduct; override: ProductOverrideRecord }[]
> {
  const overrides = await overridesBySlug();
  const out: { product: ResolvedProduct; override: ProductOverrideRecord }[] = [];
  for (const product of baseProducts) {
    const override = overrides.get(product.slug);
    if (override) out.push({ product: resolve(product, override), override });
  }
  return out;
}
