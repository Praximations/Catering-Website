import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
};

/** notFound() from a page on the site, such as an order link with a wrong token. */
export default function SiteNotFound() {
  return <NotFoundContent />;
}
