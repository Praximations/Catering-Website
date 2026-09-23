/**
 * WHO THIS BUSINESS IS, in one file.
 *
 * Every one of these values is a PLACEHOLDER, in the same spirit as the
 * palette in globals.css and the two typefaces in layout.tsx: quiet,
 * obviously provisional, and changed here rather than hunted through
 * markup. No page hard-codes a name, a phone number, or a service area.
 *
 * Replace the values, keep the keys, and the whole site follows.
 */
export const business = {
  name: "Your Catering Co.",
  /** One line, used under the name and in metadata. */
  tagline: "Generous food, made for gathering",
  /** Two or three sentences, used on the home page and About. */
  blurb:
    "Fresh, thoughtful catering for office lunches, celebrations, and the days that bring people together. Choose a ready-to-order spread or ask us to shape something around your event.",
  email: "hello@example.com",
  phone: "(555) 010-0000",
  serviceArea: "Placeholder County and about an hour around it",
  /** Leave blank until the real profile URLs are ready. The footer shows only the ones that are set. */
  social: {
    instagram: "",
    facebook: "",
  },
  /**
   * The currency everything is priced and charged in.
   *
   * ISO 4217, lower case, which is the spelling payment providers use.
   * Changing this changes what new orders are charged in; existing orders
   * keep the currency stored on them, so nothing already paid is
   * reinterpreted. Prices in lib/shop.ts are minor units of THIS currency,
   * so changing it without repricing means charging the same numbers in a
   * different currency.
   */
  currency: "usd",
  /** Where the price is rendered. Must match the currency above. */
  locale: "en-US",
  /** How much notice you need. Shown on the quote form so nobody is surprised. */
  leadTimeDays: 14,
  /** Smallest booking you take. Shown honestly rather than discovered later. */
  minimumGuests: 20,
  /**
   * Where the kitchen is, for the map on the contact page and the Owner
   * Portal. Null until it is real: a map pin on a made-up address would be
   * worse than no map. Latitude and longitude from any map site.
   */
  location: null as { label: string; lat: number; lon: number } | null,
  /**
   * ISO 3166 country codes that addresses are looked up in, lower case,
   * comma separated. Keeps "Springfield" from resolving to the wrong one.
   */
  countryCodes: "us",
  /**
   * THE BUSINESS'S OWN POLICIES, which the policy pages and FAQ state ONLY once
   * they are set here. Null means "not decided yet", and the pages say that we
   * confirm it with each customer, rather than inventing a promise.
   */
  policies: {
    /** Shown as "Last updated" on every policy page. ISO date, or blank. */
    lastUpdated: "",
    /** How many hours before delivery an order can be cancelled for a full refund. */
    cancellationNoticeHours: null as number | null,
    /** Within how many days an approved refund is sent back. */
    refundDays: null as number | null,
    /** One sentence on what delivery costs, e.g. "Free within 10 miles". */
    deliveryFee: null as string | null,
    /** The latest you can change head count, in hours before delivery. */
    changeNoticeHours: null as number | null,
    /** The jurisdiction whose law governs the terms, e.g. "the State of Oregon". */
    governingLaw: null as string | null,
  },
} as const;

/**
 * True while the business details above are still the shipped placeholders.
 * The site uses this to show an honest "this is a work in progress" note
 * instead of presenting invented details as though they were real.
 */
export const isPlaceholderBusiness = business.email === "hello@example.com";
