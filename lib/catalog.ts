import { readData, updateData, type ProductOverride } from "./store";
import { products as basePr } from "./shop";
import type { Product } from "./shop";

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

function resolve(product: Product, override: ProductOverride | undefined): ResolvedProduct {
  const priceMinor = override?.priceMinor ?? product.priceMinor;
  return {
    ...product,
    priceMinor,
    basePriceMinor: product.priceMinor,
    priceOverridden: priceMinor !== product.priceMinor,
    available: override?.available ?? true,
  };
}

/** Every product, including ones taken off sale. For the owner and Praxi. */
export async function getAllProducts(): Promise<ResolvedProduct[]> {
  const data = await readData();
  return basePr.map((product) => resolve(product, data.productOverrides[product.slug]));
}

/** What a customer may see and buy. */
export async function getAvailableProducts(): Promise<ResolvedProduct[]> {
  return (await getAllProducts()).filter((product) => product.available);
}

export async function getProduct(slug: string): Promise<ResolvedProduct | null> {
  const data = await readData();
  const product = basePr.find((p) => p.slug === slug);
  return product ? resolve(product, data.productOverrides[slug]) : null;
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
  const product = basePr.find((p) => p.slug === slug);
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

  const from = (await getProduct(slug))?.priceMinor ?? product.priceMinor;
  await updateData((data) => {
    const existing = data.productOverrides[slug];
    data.productOverrides[slug] = {
      ...existing,
      priceMinor,
      updatedAt: new Date().toISOString(),
      updatedBy: by,
    };
  });
  return { ok: true, detail: `${product.name} moved from ${from} to ${priceMinor} cents.`, from, to: priceMinor };
}

export async function setProductAvailability(
  slug: string,
  available: boolean,
  by: string
): Promise<{ ok: boolean; detail: string }> {
  const product = basePr.find((p) => p.slug === slug);
  if (!product) return { ok: false, detail: `No product called ${slug}.` };

  await updateData((data) => {
    const existing = data.productOverrides[slug];
    data.productOverrides[slug] = {
      ...existing,
      available,
      updatedAt: new Date().toISOString(),
      updatedBy: by,
    };
  });
  return {
    ok: true,
    detail: `${product.name} is now ${available ? "on sale" : "off sale"}.`,
  };
}

/** Put a product back to exactly what the file says. */
export async function clearProductOverride(slug: string): Promise<boolean> {
  return updateData((data) => {
    if (!data.productOverrides[slug]) return false;
    delete data.productOverrides[slug];
    return true;
  });
}

/** Everything currently deviating from the file, for the owner to review. */
export async function listOverrides(): Promise<
  { product: ResolvedProduct; override: ProductOverride }[]
> {
  const data = await readData();
  const out: { product: ResolvedProduct; override: ProductOverride }[] = [];
  for (const product of basePr) {
    const override = data.productOverrides[product.slug];
    if (override) out.push({ product: resolve(product, override), override });
  }
  return out;
}
