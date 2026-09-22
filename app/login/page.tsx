import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { isGoogleAuthConfigured } from "@/lib/supabase-auth";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  const user = await getCurrentUser();
  const { oauth } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
      <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">Sign in</h1>
      <p className="mt-4 text-base leading-7 text-ink-muted">
        To see your orders, reorder, or send us a change.
      </p>

      {user ? (
        <div className="mt-6 rounded-md border border-line bg-raised px-4 py-3 text-sm text-ink-muted">
          Signed in as <span className="font-semibold text-ink">{user.email}</span>.{" "}
          <Link href={user.role === "owner" ? "/admin" : "/account"} className="font-semibold text-accent">
            Go to your {user.role === "owner" ? "dashboard" : "account"}
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        {oauth ? (
          <div className="mb-5">
            <Alert tone="error">
              {oauth === "not-configured"
                ? "Google sign-in needs the Supabase Auth settings listed in the project setup."
                : "Google sign-in could not be completed. Please try again."}
            </Alert>
          </div>
        ) : null}

        {/* Only offered when it works. A disabled "Continue with Google" is a
            button that looks broken to a customer. */}
        {isGoogleAuthConfigured ? (
          <>
            <Link
              href="/auth/google"
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-sm border border-ink/15 bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:bg-raised"
            >
              <span aria-hidden className="font-bold">G</span>
              Continue with Google
            </Link>
            <div className="my-6 flex items-center gap-3 text-xs text-ink-subtle">
              <span className="h-px flex-1 bg-line" /> or with your email <span className="h-px flex-1 bg-line" />
            </div>
          </>
        ) : null}

        <LoginForm />
      </div>

      <div className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-ink-muted">
        <p>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          You can also{" "}
          <Link href="/shop" className="font-semibold text-accent underline-offset-4 hover:underline">
            order without one
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
