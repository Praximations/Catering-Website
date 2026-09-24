"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Leaves the footer off the customer's dashboard. The account is a working
 * screen, like the Owner Portal, and ends where its content ends; the footer's
 * links to order, the catalog and the policies are for someone browsing.
 *
 * The footer itself stays a Server Component, passed in as children, so only
 * this decision runs in the browser.
 */
export function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/account" || pathname.startsWith("/account/")) return null;
  return <>{children}</>;
}
