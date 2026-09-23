import { SkeletonPage } from "@/components/ui";

/**
 * The portal reads several tables for most screens. Without this the browser
 * sits on the previous page after a click, which reads as a dead link.
 */
export default function Loading() {
  return <SkeletonPage label="Owner Portal" rows={4} />;
}
