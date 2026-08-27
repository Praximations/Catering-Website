import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { business } from "@/lib/business";
import { menu } from "@/lib/menu";
import { getCurrentUser } from "@/lib/session";
import { QuoteForm } from "./quote-form";

export const metadata: Metadata = {
  title: "Request a quote",
  description: "Tell us about your event and we will send a menu and a price.",
};

/**
 * Open to everyone, signed in or not. Requiring an account before somebody
 * can ask a question is how a catering business loses the job; if they do
 * happen to be signed in, their details are filled in and the enquiry is
 * attached to their account.
 */
export default async function QuotePage() {
  const user = await getCurrentUser();
  const today = new Date();
  // YYYY-MM-DD in local time. toISOString would shift the date across the
  // dateline for anyone west of UTC.
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <PageHeader
        eyebrow="Request a quote"
        title="Tell us about your event"
        lede={`We reply to every enquiry, usually within a day or two. We need about ${business.leadTimeDays} days notice and cook for ${business.minimumGuests} people or more, though it is always worth asking.`}
      />

      <QuoteForm
        packages={menu}
        minDate={minDate}
        defaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
      />
    </main>
  );
}
