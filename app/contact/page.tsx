import type { Metadata } from "next";
import Link from "next/link";
import { ContactIcon } from "@/components/icons";
import { business } from "@/lib/business";
import { getCurrentUser } from "@/lib/session";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${business.name} about catering and events.`,
};

export default async function ContactPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 font-display text-5xl leading-none tracking-[-0.04em] text-ink sm:text-6xl">Let&apos;s talk.</h1>
        <p className="mt-5 text-lg text-ink-muted">Questions, custom events, or help with an order.</p>
      </header>

      <div className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <section className="p-6 sm:p-10 lg:p-12" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="font-display text-2xl text-ink">Send a message</h2>
          <div className="mt-7">
            <ContactForm defaults={{ name: user?.name ?? "", email: user?.email ?? "" }} />
          </div>
        </section>

        <aside className="flex flex-col justify-between bg-raised p-7 sm:p-10 lg:p-12">
          <div>
            <div className="grid size-12 place-items-center rounded-full bg-surface text-accent shadow-sm">
              <ContactIcon className="size-5" />
            </div>
            <h2 className="mt-8 font-display text-3xl text-ink">Direct contact</h2>
            <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
              <div className="py-5">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Email</dt>
                <dd className="mt-2"><a href={`mailto:${business.email}`} className="font-semibold text-ink hover:text-accent">{business.email}</a></dd>
              </div>
              <div className="py-5">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Phone</dt>
                <dd className="mt-2"><a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-ink hover:text-accent">{business.phone}</a></dd>
              </div>
              <div className="py-5">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">Service area</dt>
                <dd className="mt-2 leading-6 text-ink-muted">{business.serviceArea}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-10 text-sm text-ink-muted">
            Ready to order? <Link href="/shop" className="font-semibold text-accent">Open the catalog</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
