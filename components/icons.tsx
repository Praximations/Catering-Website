import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const shared = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.7,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function MenuIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M7 3v8M4.5 3v4.5A3.5 3.5 0 0 0 8 11M7 11v10M17 3v18M17 3c-2.8 2-3.6 5.1-2.2 8H17" />
    </svg>
  );
}

export function OrderIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

export function AboutIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.25h.01" />
    </svg>
  );
}

export function ContactIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M4 5h16v12H8l-4 3V5Z" />
      <path d="m5 6 7 6 7-6" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5h-1.2c-1 0-1.8.8-1.8 1.8V21M8.5 13h7" />
    </svg>
  );
}
