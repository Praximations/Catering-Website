/**
 * Dietary labels, one vocabulary for the menu and the shop.
 *
 * A caterer is asked "what can the vegetarians eat" more than almost anything
 * else, so these render as a mark beside the dish and a legend at the top of
 * every page that shows them, rather than as a tag buried under a description.
 *
 * A dish is only marked with what it actually is. "Options" means the dish can
 * be made that way on request, which is a different promise from the dish
 * being that way already, and the two render differently.
 */

export type DietaryTag = "vegetarian" | "vegan" | "vegetarian options" | "vegan options";

interface DietaryLabel {
  /** Short enough to sit beside a dish name. */
  mark: string;
  /** What the mark means, for the legend and for screen readers. */
  label: string;
  /** True for "can be made this way", false for "is this way". */
  onRequest: boolean;
}

export const DIETARY: Record<DietaryTag, DietaryLabel> = {
  vegetarian: { mark: "V", label: "Vegetarian", onRequest: false },
  vegan: { mark: "VG", label: "Vegan", onRequest: false },
  "vegetarian options": { mark: "V", label: "Vegetarian on request", onRequest: true },
  "vegan options": { mark: "VG", label: "Vegan on request", onRequest: true },
};

/** The legend, in the order a reader scans it. */
export const DIETARY_LEGEND: { mark: string; label: string }[] = [
  { mark: "V", label: "Vegetarian" },
  { mark: "VG", label: "Vegan" },
];
