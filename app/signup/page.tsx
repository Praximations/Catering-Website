import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { hasOwner } from "@/lib/users";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "owner" ? "/admin" : "/account");
  const ownerExists = await hasOwner();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-sm lg:grid-cols-[1.02fr_0.98fr]">
        <div className="relative hidden min-h-[48rem] bg-raised lg:block">
          <Image
            src="/images/gathered-table-hero.png"
            alt="A bright catered table prepared for sharing"
            fill
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-on-accent">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-accent/65">Plan with confidence</p>
            <p className="mt-3 max-w-md font-display text-3xl leading-tight">One quiet place for orders, dates, and every detail that matters.</p>
            <ul className="mt-6 grid gap-2 text-sm text-on-accent/75">
              <li>✓ Follow order progress</li>
              <li>✓ Keep enquiries together</li>
              <li>✓ Return to event details any time</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center p-7 sm:p-12 lg:p-16">
          <div className="w-full max-w-md">
            <p className="eyebrow">Create an account</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.98] tracking-[-0.04em] text-ink">Keep the details close.</h1>
            <p className="mt-5 text-base leading-7 text-ink-muted">
              See your orders and enquiries in one place. You can still browse and order without an account.
            </p>

            {!ownerExists ? (
              <div className="mt-7">
                <Alert tone="info" title="This will be the owner account.">
                  <p>
                    The first account becomes the site owner and can see every enquiry. Set OWNER_EMAIL before launch to choose the correct address.
                  </p>
                </Alert>
              </div>
            ) : null}

            <div className="mt-8">
              <SignupForm />
            </div>

            <p className="mt-7 border-t border-line pt-6 text-sm text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent hover:text-accent-strong">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
