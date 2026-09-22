import { business } from "./business";
import { menu } from "./menu";
import { formatMoney, products } from "./shop";

/**
 * The handful of numbers a catering customer looks for first, DERIVED rather
 * than typed into the copy.
 *
 * "From $18 a head" and "orders from 8 people" appear on several pages. Written
 * by hand, they drift the moment somebody edits lib/shop.ts, and a price on the
 * home page that disagrees with the price in the basket reads as a bait and
 * switch. Computed here, they cannot disagree.
 */

const perGuest = products.filter((product) => product.unit === "person");
const sandwiches = products.filter((product) => product.unit === "sandwich");

/** The smallest head count anything can be ordered online for. */
export const smallestOnlineOrder = Math.min(...perGuest.map((product) => product.minQuantity));

/** The cheapest per-guest price online, formatted. */
export const lowestPricePerGuest = formatMoney(
  Math.min(...perGuest.map((product) => product.priceMinor))
);

/** The minimum on a sandwich platter, if every platter shares one. */
export const sandwichMinimum = Math.min(...sandwiches.map((product) => product.minQuantity));

/** The cheapest per-guest starting price on the event menus. */
const menuPrices = menu
  .map((pkg) => pkg.pricePerPerson)
  .filter((price): price is number => price !== null);
export const lowestMenuPricePerGuest =
  menuPrices.length > 0 ? formatMoney(Math.round(Math.min(...menuPrices) * 100)) : null;

export const leadTimeDays = business.leadTimeDays;
export const minimumEventGuests = business.minimumGuests;
export const serviceArea = business.serviceArea;

/** A tel: link, from whatever punctuation the phone number is written with. */
export const phoneHref = `tel:${business.phone.replace(/[^\d+]/g, "")}`;
