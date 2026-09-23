import type { ReactNode, SVGProps } from "react";

/**
 * The icon set. One stroke weight, one 24px grid, drawn inline so there is no
 * icon package and nothing to download at runtime.
 *
 * Decorative by default (aria-hidden). An icon that carries meaning on its own,
 * such as an icon-only button, gets its name from the button's aria-label or a
 * Tooltip, never from the SVG.
 */

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => ReactNode;

function icon(name: string, children: ReactNode, strokeWidth = 1.75): Icon {
  function Glyph(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
      >
        {children}
      </svg>
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

/* --------------------------------- places --------------------------------- */

export const HomeIcon = icon(
  "HomeIcon",
  <path d="M4 10.4 12 4l8 6.4V19a1 1 0 0 1-1 1h-4.25v-5.5h-5.5V20H5a1 1 0 0 1-1-1v-8.6Z" />
);

/** A carrier bag. Reads as "your order" rather than a shop trolley. */
export const BagIcon = icon(
  "BagIcon",
  <>
    <path d="M5.2 8h13.6l-1 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5.2 8Z" />
    <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
  </>
);

export const BookIcon = icon(
  "BookIcon",
  <>
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14.5H7.5A2.5 2.5 0 0 0 5 20V5.5Z" />
    <path d="M5 20a1.5 1.5 0 0 0 1.5 1H19v-3.5" />
    <path d="M9 7.5h6" />
  </>
);

export const UtensilsIcon = icon(
  "UtensilsIcon",
  <>
    <path d="M7 3v8M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11" />
    <path d="M17 21V3c-2.4 1.6-3.5 4.4-3.5 7.2V13H17" />
  </>
);

export const CalendarIcon = icon(
  "CalendarIcon",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </>
);

export const SparklesIcon = icon(
  "SparklesIcon",
  <>
    <path d="M11 3.5 12.6 8l4.4 1.6-4.4 1.6L11 15.6l-1.6-4.4L5 9.6 9.4 8 11 3.5Z" />
    <path d="M18 14.5l.7 1.8 1.8.7-1.8.7L18 19.5l-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </>
);

export const InfoIcon = icon(
  "InfoIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.75h.01" />
  </>
);

export const ChatIcon = icon(
  "ChatIcon",
  <path d="M20 11.5a7.5 7.5 0 0 1-11 6.63L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5Z" />
);

export const InboxIcon = icon(
  "InboxIcon",
  <>
    <path d="M4 13.5 6.3 5.7A1 1 0 0 1 7.3 5h9.4a1 1 0 0 1 1 .7l2.3 7.8V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-4.5Z" />
    <path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" />
  </>
);

export const PhoneIcon = icon(
  "PhoneIcon",
  <path d="M5.2 4h3l1.8 4.6-2.3 1.4a11 11 0 0 0 6.3 6.3l1.4-2.3L20 15.8v3a1.2 1.2 0 0 1-1.2 1.2A15.8 15.8 0 0 1 4 5.2 1.2 1.2 0 0 1 5.2 4Z" />
);

export const MailIcon = icon(
  "MailIcon",
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </>
);

export const MapPinIcon = icon(
  "MapPinIcon",
  <>
    <path d="M12 21s-6.5-5.4-6.5-10.8a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.2" r="2.4" />
  </>
);

export const TruckIcon = icon(
  "TruckIcon",
  <>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h9A1.5 1.5 0 0 1 15 6.5V16H3V6.5Z" />
    <path d="M15 9h3.2l2.8 3.4V16h-6" />
    <circle cx="7" cy="17" r="1.8" />
    <circle cx="17.5" cy="17" r="1.8" />
  </>
);

export const StoreIcon = icon(
  "StoreIcon",
  <>
    <path d="M4 10v9.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V10" />
    <path d="M3 10 5 4.5h14L21 10a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
    <path d="M10 20v-5h4v5" />
  </>
);

export const GlobeIcon = icon(
  "GlobeIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5Z" />
  </>
);

/* ---------------------------------- people --------------------------------- */

export const UserIcon = icon(
  "UserIcon",
  <>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>
);

export const UsersIcon = icon(
  "UsersIcon",
  <>
    <circle cx="9.5" cy="8.5" r="3.2" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14a6 6 0 0 1 3 5.5" />
  </>
);

/* ---------------------------------- things --------------------------------- */

export const ReceiptIcon = icon(
  "ReceiptIcon",
  <>
    <path d="M6 3.5h12V21l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.3V3.5Z" transform="translate(0 -0.5)" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </>
);

export const TagIcon = icon(
  "TagIcon",
  <>
    <path d="M3.5 12.1V4.5a1 1 0 0 1 1-1h7.6l8.4 8.4a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0L3.5 12.1Z" />
    <circle cx="8.2" cy="8.2" r="1.4" />
  </>
);

export const PackageIcon = icon(
  "PackageIcon",
  <>
    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9M8 5.2l8 4.5" />
  </>
);

export const CreditCardIcon = icon(
  "CreditCardIcon",
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h3" />
  </>
);

export const FileTextIcon = icon(
  "FileTextIcon",
  <>
    <path d="M6.5 3h7.5l4.5 4.5V20a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4.5h4.5M9 12h6M9 15.5h6M9 8.5h2" />
  </>
);

export const ShieldIcon = icon(
  "ShieldIcon",
  <path d="M12 3.2 19 6v5.4c0 4.4-2.9 7.9-7 9.4-4.1-1.5-7-5-7-9.4V6l7-2.8Z" />
);

export const LockIcon = icon(
  "LockIcon",
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </>
);

export const CookieIcon = icon(
  "CookieIcon",
  <>
    <path d="M20.5 12.3A8.5 8.5 0 1 1 11.7 3.5a3 3 0 0 0 3.8 3.8 3 3 0 0 0 5 5Z" />
    <path d="M8.5 9.5h.01M9 15h.01M14 14.5h.01M12 11.5h.01" strokeWidth={2.4} />
  </>
);

export const LeafIcon = icon(
  "LeafIcon",
  <>
    <path d="M5 19c0-8 5-13.5 15-14-.3 9.7-5.7 15-14 15" />
    <path d="M5 19c3-4 6-6.5 9.5-8.5" />
  </>
);

export const GridIcon = icon(
  "GridIcon",
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </>
);

export const SlidersIcon = icon(
  "SlidersIcon",
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>
);

export const BellIcon = icon(
  "BellIcon",
  <>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </>
);

export const ChartIcon = icon(
  "ChartIcon",
  <>
    <path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" />
    <path d="m7.5 15 3.5-4 3 2.5 5-6" />
  </>
);

export const KeyIcon = icon(
  "KeyIcon",
  <>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.7-8.7M16.5 6.5l2.5 2.5M14 9l2 2" />
  </>
);

/* --------------------------------- actions --------------------------------- */

export const SearchIcon = icon(
  "SearchIcon",
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </>
);

export const SendIcon = icon(
  "SendIcon",
  <path d="M20.5 3.5 10.8 13.2M20.5 3.5 14.4 20.5l-3.6-7.3-7.3-3.6 17-6.1Z" />
);

export const PlusIcon = icon("PlusIcon", <path d="M12 5v14M5 12h14" />, 2);
export const MinusIcon = icon("MinusIcon", <path d="M5 12h14" />, 2);
export const XIcon = icon("XIcon", <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />, 2);
export const MenuIcon = icon("MenuIcon", <path d="M4 7h16M4 12h16M4 17h11" />, 2);

export const CheckIcon = icon("CheckIcon", <path d="m5 12.5 4.5 4.5L19 7.5" />, 2);

export const CheckCircleIcon = icon(
  "CheckCircleIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.3 12.3 2.6 2.6 5-5.2" />
  </>
);

export const ClockIcon = icon(
  "ClockIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
);

export const AlertIcon = icon(
  "AlertIcon",
  <>
    <path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.1 12.4a2 2 0 0 1-1.7 3H4.9a2 2 0 0 1-1.7-3l7.1-12.4Z" />
    <path d="M12 9.5v4M12 16.7h.01" />
  </>
);

export const BanIcon = icon(
  "BanIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m6 6 12 12" />
  </>
);

export const RepeatIcon = icon(
  "RepeatIcon",
  <>
    <path d="M17 2.5 20.5 6 17 9.5" />
    <path d="M3.5 11.5V10a4 4 0 0 1 4-4h13" />
    <path d="M7 21.5 3.5 18 7 14.5" />
    <path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13" />
  </>
);

export const CopyIcon = icon(
  "CopyIcon",
  <>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
  </>
);

export const ExternalIcon = icon(
  "ExternalIcon",
  <>
    <path d="M13.5 4H20v6.5M20 4l-8.5 8.5" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </>
);

export const LogOutIcon = icon(
  "LogOutIcon",
  <>
    <path d="M9.5 20H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 4h3.5" />
    <path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" />
  </>
);

export const EditIcon = icon(
  "EditIcon",
  <>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m13.5 8.5 3 3" />
  </>
);

export const ArrowRightIcon = icon("ArrowRightIcon", <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />);
export const ArrowLeftIcon = icon("ArrowLeftIcon", <path d="M19 12H5M10.5 6.5 5 12l5.5 5.5" />);
export const ChevronDownIcon = icon("ChevronDownIcon", <path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = icon("ChevronRightIcon", <path d="m9 6 6 6-6 6" />);
export const ChevronLeftIcon = icon("ChevronLeftIcon", <path d="m15 6-6 6 6 6" />);

/** Kept under its old name: the pages that point at a next step use it. */
export const ArrowIcon = ArrowRightIcon;

/* ---------------------------------- social --------------------------------- */

export const InstagramIcon = icon(
  "InstagramIcon",
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </>
);

export const FacebookIcon = icon(
  "FacebookIcon",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 8.5h-1.2c-1 0-1.8.8-1.8 1.8V20.5M8.5 13h7" />
  </>
);
