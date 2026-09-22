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
  /** Leave blank until the real profile URLs are ready. Icons still appear as placeholders. */
  social: {
    instagram: "",
    facebook: "",
  },
  /** How much notice you need. Shown on the quote form so nobody is surprised. */
  leadTimeDays: 14,
  /** Smallest booking you take. Shown honestly rather than discovered later. */
  minimumGuests: 20,
} as const;

/**
 * True while the business details above are still the shipped placeholders.
 * The site uses this to show an honest "this is a work in progress" note
 * instead of presenting invented details as though they were real.
 */
export const isPlaceholderBusiness = business.email === "hello@example.com";
