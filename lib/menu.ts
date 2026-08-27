/**
 * The menu, as data rather than markup, so the menu page is a loop and
 * adding a dish is a one-line edit here.
 *
 * SAMPLE CONTENT. These packages and dishes are stand-ins to give the page
 * a real shape; nobody has decided what this kitchen actually cooks.
 * Prices are per person, in whole dollars, and deliberately round so they
 * read as examples rather than as a quoted rate.
 */

export interface MenuItem {
  name: string;
  description: string;
  /** Shown as a small tag. Keep to things people actually need to know. */
  tags?: string[];
}

export interface MenuPackage {
  slug: string;
  name: string;
  /** Per person, whole dollars. Null means "quoted per event". */
  pricePerPerson: number | null;
  summary: string;
  items: MenuItem[];
}

export const menu: MenuPackage[] = [
  {
    slug: "buffet",
    name: "Buffet",
    pricePerPerson: 32,
    summary:
      "Everything laid out at once, people help themselves and go back for more. The easiest way to feed a room.",
    items: [
      {
        name: "Roast chicken, lemon and thyme",
        description: "Cooked on the bone, rested, carved just before service.",
      },
      {
        name: "Slow braised beef",
        description: "Six hours in red wine and stock, falls apart on the spoon.",
      },
      {
        name: "Baked squash and lentils",
        description: "Charred squash, brown lentils, herb oil.",
        tags: ["vegan"],
      },
      {
        name: "Potatoes, three ways",
        description: "Roasted, crushed with butter, or cold in a mustard dressing.",
        tags: ["vegetarian"],
      },
      {
        name: "The green salad",
        description: "Whatever is actually good that week, dressed simply.",
        tags: ["vegan", "gluten free"],
      },
    ],
  },
  {
    slug: "plated",
    name: "Plated dinner",
    pricePerPerson: 58,
    summary:
      "Three courses, brought to the table. Needs a firm guest count and a room with seating.",
    items: [
      {
        name: "Soup of the season",
        description: "Served with bread from the bakery down the road.",
        tags: ["vegetarian"],
      },
      {
        name: "Fish of the day",
        description: "Whatever came in fresh, with brown butter and capers.",
      },
      {
        name: "Short rib",
        description: "Braised, glazed, with root vegetables and horseradish.",
      },
      {
        name: "Mushroom and barley",
        description: "Slow cooked barley, roasted mushrooms, aged cheese or none.",
        tags: ["vegetarian"],
      },
      {
        name: "Something with cream",
        description: "The dessert changes constantly. It is always worth it.",
      },
    ],
  },
  {
    slug: "canapes",
    name: "Canapes and drinks",
    pricePerPerson: 24,
    summary:
      "Passed bites for a standing event, usually an hour or two. Good before a dinner, or instead of one.",
    items: [
      {
        name: "Smoked trout on rye",
        description: "With creme fraiche and dill.",
      },
      {
        name: "Fried artichoke",
        description: "Crisp, salted, with aioli.",
        tags: ["vegan"],
      },
      {
        name: "Beef and horseradish",
        description: "Rare beef, horseradish cream, on a crouton.",
      },
      {
        name: "Whipped feta and honey",
        description: "On toast, with black pepper.",
        tags: ["vegetarian"],
      },
    ],
  },
  {
    slug: "office",
    name: "Office lunch",
    pricePerPerson: 18,
    summary:
      "Dropped off, set up, and cleared away. No staff stay on. Ordered by the tray.",
    items: [
      {
        name: "Sandwich platters",
        description: "Real bread, generous filling, cut properly.",
      },
      {
        name: "Two salads",
        description: "One grain, one green. Both keep for a few hours.",
        tags: ["vegetarian"],
      },
      {
        name: "Fruit and something sweet",
        description: "Cut fruit and a tray of whatever was baked that morning.",
        tags: ["vegetarian"],
      },
    ],
  },
];

export function findPackage(slug: string): MenuPackage | undefined {
  return menu.find((p) => p.slug === slug);
}
