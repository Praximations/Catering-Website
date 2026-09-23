import type { ReactNode } from "react";
import { AnnouncementBanner } from "@/components/announcement";
import { RevealOnScroll } from "@/components/motion";
import { Onboarding } from "@/components/onboarding";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { business } from "@/lib/business";
import { getCurrentUser } from "@/lib/session";

/**
 * The public site and the customer's account: the floating navbar, the page,
 * the rounded footer.
 *
 * The bottom padding on a phone keeps the last of the page clear of the dock.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <AnnouncementBanner />
      <SiteNav />
      <main id="main" className="flex flex-1 flex-col pt-6 sm:pt-10">
        {children}
      </main>
      <SiteFooter />
      <RevealOnScroll />
      <Onboarding signedIn={Boolean(user)} businessName={business.name} />
    </>
  );
}
