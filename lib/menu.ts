/**
 * The public catering menu, kept as data so the page and home page stay in
 * sync. The structure is adapted from the supplied restaurant reference,
 * with concise original wording for this brand.
 */

export interface MenuItem {
  name: string;
  description: string;
  price?: string;
  tags?: string[];
}

export interface MenuPackage {
  slug: string;
  name: string;
  /** Starting per-person price. Null means the individual items carry prices. */
  pricePerPerson: number | null;
  summary: string;
  items: MenuItem[];
}

export const menu: MenuPackage[] = [
  {
    slug: "lunch-platters",
    name: "Lunch platters",
    pricePerPerson: 21.99,
    summary:
      "Complete lunch selections with sandwiches, fresh accompaniments, condiments, and something sweet.",
    items: [
      {
        name: "Corporate lunch",
        description: "Assorted sandwiches and wraps with two sides, a condiment tray, cookies, and brownies.",
        price: "$21.99 per guest",
      },
      {
        name: "Executive lunch",
        description: "Flatbreads and pressed panini with two sides, condiments, cookies, and brownies.",
        price: "$23.99 per guest",
      },
      {
        name: "Signature lunch",
        description: "House specialty sandwiches with two upgraded sides, condiments, and a chef-selected dessert spread.",
        price: "$25.99 per guest",
      },
      {
        name: "Deli board",
        description: "Hand-carved turkey, corned beef, roast beef, cheeses, artisan breads, condiments, and two sides.",
        price: "$21.99 per guest",
      },
      {
        name: "Italian deli board",
        description: "Prosciutto, soppressata, capicola, mozzarella, provolone, baguette, ciabatta, and two sides.",
        price: "$23.99 per guest",
      },
    ],
  },
  {
    slug: "hot-buffet",
    name: "Hot buffet",
    pricePerPerson: 23.99,
    summary:
      "A flexible hot lunch built from your choice of entrées, a seasonal salad, a side, and dessert.",
    items: [
      {
        name: "Original buffet",
        description: "Choose two hot entrées, one salad, one side, plus a cookie and brownie platter.",
        price: "$23.99 per guest",
      },
      {
        name: "Classic buffet",
        description: "Choose three hot entrées, one salad, one side, plus a cookie and brownie platter.",
        price: "$26.99 per guest",
      },
      {
        name: "Finest buffet",
        description: "Choose four hot entrées, one salad, one side, and a chef-selected dessert spread.",
        price: "$32.99 per guest",
      },
      {
        name: "Popular entrée choices",
        description: "Chicken piccata, steak tips, glazed salmon, chicken marsala, eggplant parmesan, or pan-seared tofu.",
      },
      {
        name: "Popular side choices",
        description: "Rosemary potatoes, rice pilaf, grilled vegetables, Mediterranean couscous, or seasonal roasted vegetables.",
        tags: ["vegetarian options"],
      },
    ],
  },
  {
    slug: "entree-trays",
    name: "Entrée trays",
    pricePerPerson: null,
    summary:
      "Half and full pans for building your own buffet or adding a warm centerpiece to lunch.",
    items: [
      {
        name: "Chicken kabob",
        description: "Grilled marinated chicken with peppers and onions.",
        price: "$65 half / $130 full",
      },
      {
        name: "Marinated steak tips",
        description: "Tender steak tips finished with a savory house marinade.",
        price: "$95 half / $190 full",
      },
      {
        name: "Lemon balsamic salmon",
        description: "Grilled salmon with a bright lemon and balsamic glaze.",
        price: "$95 half / $190 full",
      },
      {
        name: "Chicken piccata",
        description: "Chicken breast with lemon, capers, butter, and white wine.",
        price: "$65 half / $130 full",
      },
      {
        name: "Chicken marsala",
        description: "Chicken breast with mushrooms and a rich marsala pan sauce.",
        price: "$85 half / $165 full",
      },
      {
        name: "Eggplant parmesan",
        description: "Breaded eggplant layered with tomato sauce and melted cheese.",
        price: "$65 half / $130 full",
        tags: ["vegetarian"],
      },
      {
        name: "Pasta marinara",
        description: "Penne with slow-cooked tomato sauce and fresh herbs.",
        price: "$55 half / $110 full",
        tags: ["vegetarian"],
      },
      {
        name: "Sweet chili tofu",
        description: "Pan-seared tofu and vegetables with a sweet chili glaze.",
        price: "$65 half / $130 full",
        tags: ["vegan"],
      },
    ],
  },
  {
    slug: "soups-salads-sides",
    name: "Soups, salads & sides",
    pricePerPerson: null,
    summary:
      "The finishing pieces for a generous table, available by the gallon or priced for each guest.",
    items: [
      {
        name: "Soup by the gallon",
        description: "Chicken noodle, minestrone, hearty lentil, avgolemono, or roasted squash.",
        price: "From $50 per gallon",
      },
      {
        name: "Classic salads",
        description: "House, Caesar, Greek, caprese, or horiatiki, prepared fresh for the guest count.",
        price: "From $4 per guest",
      },
      {
        name: "Seasonal salads",
        description: "Strawberry and arugula, cranberry citrus, kale and avocado, or beet and goat cheese.",
        price: "From $6 per guest",
        tags: ["vegetarian"],
      },
      {
        name: "Potatoes",
        description: "Roasted wedges, garlic mash, or rosemary potatoes with olive oil.",
        price: "From $4 per guest",
        tags: ["vegetarian"],
      },
      {
        name: "Grains",
        description: "Rice pilaf, spinach basmati, cranberry fig quinoa, or Mediterranean couscous.",
        price: "From $4 per guest",
        tags: ["vegan options"],
      },
      {
        name: "Vegetables",
        description: "Grilled seasonal vegetables, glazed carrots, green beans, asparagus, or broccoli.",
        price: "From $4 per guest",
        tags: ["vegan options"],
      },
    ],
  },
];

export function findPackage(slug: string): MenuPackage | undefined {
  return menu.find((pkg) => pkg.slug === slug);
}
