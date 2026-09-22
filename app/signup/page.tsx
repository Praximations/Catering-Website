import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckIcon } from "@/components/icons";
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
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            Create an account
          </h1>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            You do not need one to order, but it makes the next order quicker.
          </p>

          {!ownerExists ? (
            <div className="mt-6">
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

          <p className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* What the account page actually does, and nothing it does not. */}
        <aside className="self-start rounded-md bg-raised p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink">With an account you can</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-ink">
            {[
              "See every order and where it is, from received to delivered",
              "Reorder a past order in one step",
              "Send us a change request with the order attached",
              "Save your venues, addresses and dietary needs for next time",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon className="mt-1 size-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            Ordered before as a guest? Use the same email and those orders appear too.
          </p>
        </aside>
      </div>
    </main>
  );
}
