import { business, isPlaceholderBusiness } from "./business";
import { activeGeocoder } from "./geo";
import { activeProvider } from "./payments";
import { praxiConfigured } from "./praxi";
import { activeSmsProvider } from "./sms";
import { isGoogleAuthConfigured } from "./supabase-auth";

/**
 * The policy pages, as data.
 *
 * THE SAME RULE AS THE FAQ: a policy states only what the site and the
 * business actually do. Anything the business has not decided (a
 * cancellation window, a delivery fee, a refund timescale) is read from
 * business.policies in lib/business.ts, and while it is unset the page says
 * it is confirmed with each customer rather than inventing a promise. Which
 * third parties are named depends on which are actually switched on.
 *
 * Data rather than markup so the pages can be searched, and so the Owner
 * Portal can tell the owner what is still unset.
 *
 * NOT LEGAL ADVICE. While the business details are placeholders every page
 * says so, and the owner should have the finished text checked.
 */

export type PolicyBlock = { type: "p"; text: string } | { type: "list"; items: string[] };

export interface PolicySection {
  id: string;
  heading: string;
  blocks: PolicyBlock[];
}

export interface Policy {
  slug: string;
  title: string;
  /** One line for the index card. */
  summary: string;
  icon: "shield" | "file" | "repeat" | "truck" | "cookie" | "leaf";
  sections: PolicySection[];
  /** Old or alternative addresses that should land here. */
  aliases?: string[];
}

const p = (text: string): PolicyBlock => ({ type: "p", text });
const list = (...items: string[]): PolicyBlock => ({ type: "list", items });

const contactLine = `Email ${business.email} or call ${business.phone}.`;

function hours(value: number): string {
  return value % 24 === 0 ? `${value / 24} ${value === 24 ? "day" : "days"}` : `${value} hours`;
}

export function buildPolicies(): Policy[] {
  const payment = activeProvider();
  const sms = activeSmsProvider();
  const geocoder = activeGeocoder();
  const praxi = praxiConfigured();
  const rules = business.policies;

  const processors: string[] = [
    "Our hosting and database providers, who store the site and its data on our behalf.",
    ...(payment
      ? [`${payment.label}, if you pay online. Your card details go straight to ${payment.label} and never reach this site.`]
      : []),
    ...(sms ? [`${sms.label}, if we text you or you text us, to carry the messages.`] : []),
    ...(geocoder
      ? [
          `${geocoder.label}, when you type an address, so we can show it on a map. Only the address text is sent, from our server rather than your browser. The map itself loads from ${geocoder.label}.`,
        ]
      : []),
    ...(praxi ? ["Praxi, the software we use to run the business, which receives customer, order and quote details."] : []),
  ];

  return [
    {
      slug: "privacy",
      title: "Privacy policy",
      summary: "What we collect, why, who else sees it, and how to ask us to change or delete it.",
      icon: "shield",
      sections: [
        {
          id: "who",
          heading: "Who we are",
          blocks: [p(`${business.name} provides catering in ${business.serviceArea}. We are responsible for the information you give us on this site. ${contactLine}`)],
        },
        {
          id: "collect",
          heading: "What we collect",
          blocks: [
            list(
              "Your name, email address and phone number, when you order, ask for a quote, send a message or create an account.",
              "Event details: the date, number of guests, delivery or venue address, and any notes, including dietary needs you tell us about.",
              "What you ordered and what you paid. We never see or store card numbers.",
              "Messages you send us through the site, and texts if you text us.",
              "If you have an account: a securely scrambled version of your password (never the password itself) and any details you save for next time."
            ),
          ],
        },
        {
          id: "why",
          heading: "Why we use it",
          blocks: [
            list(
              "To prepare, confirm and deliver your order or event.",
              "To reply to your questions and keep you updated about your order.",
              "To keep the site secure, for example limiting repeated sign in attempts. We store a scrambled fingerprint for this, not your address or IP."
            ),
            p("We do not sell your information, and we do not use it for advertising."),
          ],
        },
        { id: "sharing", heading: "Who else sees it", blocks: [list(...processors)] },
        {
          id: "cookies",
          heading: "Cookies",
          blocks: [p("We use a small number of cookies that the site needs to work, and no advertising or tracking cookies. The cookie policy lists each one.")],
        },
        {
          id: "keeping",
          heading: "How long we keep it",
          blocks: [
            p("Orders and their messages are kept as business records. Security records of sign in attempts are deleted after a day."),
            p("If you ask us to delete your account, we do, and keep only what we need for orders already placed."),
          ],
        },
        {
          id: "rights",
          heading: "Your choices",
          blocks: [p(`You can ask to see, correct or delete the information we hold about you. ${contactLine} Signed in, you can edit your saved details and sign out of every device from your account.`)],
        },
        {
          id: "changes",
          heading: "Changes",
          blocks: [p("If we change how we use your information, we will update this page and the date at the top.")],
        },
      ],
    },
    {
      slug: "terms",
      title: "Terms of service",
      summary: "How ordering, pricing, payment and changes work when you book with us.",
      icon: "file",
      sections: [
        {
          id: "orders",
          heading: "Orders",
          blocks: [
            p("Placing an order online sends us a request. It becomes a booking once we have confirmed the date and details with you, which your order page shows."),
            p(`Event menus are quoted individually. A quote is not a booking until you accept it and we confirm your date.`),
          ],
        },
        {
          id: "prices",
          heading: "Prices",
          blocks: [
            p(`Prices are in ${business.currency.toUpperCase()} and are shown before tax and any delivery charge, which we confirm with you before you pay. The price of an order is fixed when you place it; later price changes do not affect it.`),
          ],
        },
        {
          id: "payment",
          heading: "Payment",
          blocks: [
            p(
              payment
                ? `Nothing is charged when you order. Once we have confirmed, you can pay securely online through ${payment.label} from your order page, or settle with us directly.`
                : "Nothing is charged when you order. Once we have confirmed, we arrange payment with you directly."
            ),
          ],
        },
        {
          id: "changes",
          heading: "Changes and cancellations",
          blocks: [
            p(
              rules.changeNoticeHours
                ? `You can change guest numbers up to ${hours(rules.changeNoticeHours)} before delivery.`
                : "Tell us about changes as early as you can. We confirm what is possible for your order."
            ),
            p("Cancellations and refunds are covered by the refund policy."),
          ],
        },
        {
          id: "dietary",
          heading: "Dietary needs and allergies",
          blocks: [p("Tell us about allergies and dietary needs when you order. The allergen notice explains what we can and cannot guarantee.")],
        },
        {
          id: "accounts",
          heading: "Accounts",
          blocks: [p("You do not need an account to order. If you make one, keep your password to yourself, and use Sign out everywhere if you have signed in on a shared computer.")],
        },
        {
          id: "law",
          heading: "The law that applies",
          blocks: [
            p(
              rules.governingLaw
                ? `These terms are governed by the laws of ${rules.governingLaw}.`
                : "These terms are governed by the laws of the place where we trade."
            ),
          ],
        },
      ],
    },
    {
      slug: "refunds",
      title: "Refunds and cancellations",
      summary: "Cancelling an order, what happens to a payment, and what to do if something is wrong.",
      icon: "repeat",
      sections: [
        {
          id: "cancelling",
          heading: "Cancelling an order",
          blocks: [
            p(
              rules.cancellationNoticeHours
                ? `Cancel at least ${hours(rules.cancellationNoticeHours)} before delivery for a full refund. Later than that, we will do what we can, depending on what has already been prepared.`
                : "To cancel, message us from your order page or call us as early as you can. What we can refund depends on how close it is to your date and what has already been prepared, and we confirm that with you."
            ),
          ],
        },
        {
          id: "refunds",
          heading: "How refunds are paid",
          blocks: [
            p(
              `Refunds go back to the way you paid${payment ? `: to your card, through ${payment.label}, for online payments` : ""}.${rules.refundDays ? ` We send them within ${rules.refundDays} days of agreeing them.` : ""}`
            ),
          ],
        },
        {
          id: "problems",
          heading: "If something is not right",
          blocks: [p(`Tell us on the day, with a photo if you can, and we will put it right. ${contactLine}`)],
        },
      ],
    },
    {
      slug: "delivery",
      title: "Delivery policy",
      summary: "Where we deliver, when, what it costs, and what to expect on the day.",
      icon: "truck",
      aliases: ["shipping"],
      sections: [
        {
          id: "where",
          heading: "Where we deliver",
          blocks: [p(`We deliver to ${business.serviceArea}. Not sure you are in range? Ask before you order.`)],
        },
        {
          id: "when",
          heading: "When",
          blocks: [p(`On the date you choose at checkout, once we have confirmed it. Events need about ${business.leadTimeDays} days' notice. Add a delivery time in your order notes and we confirm it with you.`)],
        },
        {
          id: "cost",
          heading: "What it costs",
          blocks: [p(rules.deliveryFee ?? "Any delivery charge is confirmed with you before you pay.")],
        },
        {
          id: "day",
          heading: "On the day",
          blocks: [
            list(
              "Food arrives on platters, labelled and ready to serve.",
              "Tell us about access in your notes: parking, a loading bay, a floor number.",
              "Someone needs to be there to receive it."
            ),
          ],
        },
        {
          id: "shipping",
          heading: "Shipping",
          blocks: [p("We deliver locally ourselves. We do not post or ship food outside our delivery area.")],
        },
      ],
    },
    {
      slug: "cookies",
      title: "Cookie policy",
      summary: "The few cookies the site needs to work, and nothing that tracks you.",
      icon: "cookie",
      sections: [
        {
          id: "used",
          heading: "The cookies we use",
          blocks: [
            list(
              "A sign in cookie, only if you sign in, so you stay signed in. It lasts up to two weeks, or until you sign out.",
              "A basket cookie, so what you have added is still there when you come back. It lasts up to 30 days.",
              ...(isGoogleAuthConfigured ? ["A few short-lived cookies during Google sign in, only if you use it."] : [])
            ),
          ],
        },
        {
          id: "storage",
          heading: "Storage in your browser",
          blocks: [
            p("The site also remembers a few things in your own browser: that you have seen the welcome note, whether you dismissed the account suggestion, and a draft of your checkout details for this visit, so a mistake does not make you type them again. None of it is sent to us."),
          ],
        },
        {
          id: "none",
          heading: "What we do not use",
          blocks: [p("No advertising cookies, no tracking across other sites, and no analytics cookies.")],
        },
      ],
    },
    {
      slug: "allergens",
      title: "Allergen notice",
      summary: "How dishes are marked, and what we can and cannot guarantee.",
      icon: "leaf",
      sections: [
        {
          id: "kitchen",
          heading: "Our kitchen",
          blocks: [p("Our kitchen handles all the common allergens, including gluten, milk, eggs, nuts, peanuts, sesame, soy, fish and shellfish. We take care, but we cannot guarantee any dish is completely free of traces.")],
        },
        {
          id: "marks",
          heading: "How dishes are marked",
          blocks: [
            p("Menus mark vegetarian and vegan dishes. A mark with an asterisk means the dish can be made that way on request, which is a different promise from a dish that always is."),
          ],
        },
        {
          id: "telling",
          heading: "Telling us",
          blocks: [p("Tell us about allergies and dietary needs in your order notes or quote request, and we plan around them and label what we send. For a severe allergy, call us before ordering so we can talk it through.")],
        },
      ],
    },
  ];
}

export function findPolicy(slug: string): { policy: Policy; canonical: boolean } | null {
  const policies = buildPolicies();
  const direct = policies.find((policy) => policy.slug === slug);
  if (direct) return { policy: direct, canonical: true };
  const alias = policies.find((policy) => policy.aliases?.includes(slug));
  return alias ? { policy: alias, canonical: false } : null;
}

/** Whether the pages should say they are a starting template. */
export const policiesAreTemplate = isPlaceholderBusiness || !business.policies.lastUpdated;

/** Every section as plain text, for search. */
export function searchIndex(policies: Policy[]) {
  return policies.flatMap((policy) =>
    policy.sections.map((section) => ({
      slug: policy.slug,
      policy: policy.title,
      id: section.id,
      heading: section.heading,
      text: section.blocks.map((block) => (block.type === "p" ? block.text : block.items.join(" "))).join(" "),
    }))
  );
}
