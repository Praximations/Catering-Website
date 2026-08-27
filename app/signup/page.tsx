import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { hasOwner } from "@/lib/users";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "owner" ? "/admin" : "/account");

  // Said out loud, because a silent privilege grant nobody can see is how
  // a demo turns into a security problem. See lib/users.ts.
  const ownerExists = await hasOwner();

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <PageHeader
        eyebrow="Create an account"
        title="Keep track of your enquiries"
        lede="An account lets you see where each enquiry stands. You do not need one to ask for a quote."
      />

      {!ownerExists ? (
        <div className="mb-6">
          <Alert tone="info" title="This will be the owner account.">
            <p>
              Nobody owns this site yet, so the first account created becomes the owner and can
              see every enquiry. Set OWNER_EMAIL in .env.local to choose a different address.
            </p>
          </Alert>
        </div>
      ) : null}

      <SignupForm />

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-strong hover:underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}
