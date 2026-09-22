import { SkeletonPage } from "@/components/ui";

/**
 * The dashboard reads orders, enquiries, contacts, messages and customers, so
 * it is the slowest page on the site. Without this the browser sits on the
 * previous page after the click, which reads as a dead link.
 */
export default function Loading() {
  return <SkeletonPage eyebrow="Dashboard" rows={4} />;
}
