import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-sm lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex items-center p-7 sm:p-12 lg:p-16">
          <div className="w-full max-w-md">
            <p className="eyebrow">Your account</p>
            <h1 className="mt-5 font-display text-5xl leading-none tracking-[-0.04em] text-ink">Welcome back.</h1>
            <p className="mt-5 text-base leading-7 text-ink-muted">
              Sign in to manage orders and event details.
            </p>

            {user ? (
              <div className="mt-6 rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink-muted">
                Signed in as <span className="font-semibold text-ink">{user.email}</span>.{" "}
                <Link href={user.role === "owner" ? "/admin" : "/account"} className="font-semibold text-accent">
                  Open your dashboard
                </Link>
              </div>
            ) : null}

            <div className="mt-9">
              {oauth ? (
                <div className="mb-5">
                  <Alert tone="error">
                    {oauth === "not-configured"
                      ? "Google sign-in needs the Supabase Auth settings listed in the project setup."
                      : "Google sign-in could not be completed. Please try again."}
                  </Alert>
                </div>
              ) : null}

              {isGoogleAuthConfigured ? (
                <Link
                  href="/auth/google"
                  className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-line bg-surface px-5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-raised"
                >
                  <span aria-hidden className="grid size-6 place-items-center rounded-full border border-line font-bold text-[#4285f4]">G</span>
                  Continue with Google
                </Link>
              ) : (
                <span className="mb-5 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-md border border-line bg-raised px-5 text-sm font-semibold text-ink-subtle" title="Configure Supabase Google Auth to enable this button">
                  <span aria-hidden className="grid size-6 place-items-center rounded-full border border-line font-bold">G</span>
                  Continue with Google
                </span>
              )}

              <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-ink-subtle">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
              </div>
              <LoginForm />
            </div>

            <div className="mt-7 border-t border-line pt-6 text-sm">
              <p className="text-ink-muted">
                New here?{" "}
                <Link href="/signup" className="font-semibold text-accent hover:text-accent-strong">
                  Create an account
                </Link>
              </p>
              <p className="mt-2 text-ink-subtle">
                Just browsing?{" "}
                <Link href="/menu" className="font-medium hover:text-ink">Open the catalog</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[43rem] bg-raised lg:block">
          <Image
            src="/images/catering-sandwich-spread.png"
            alt="A generous catered spread ready for guests"
            fill
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-on-accent">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-on-accent/65">Good to see you</p>
            <p className="mt-3 max-w-md font-display text-3xl leading-tight">Your next gathering starts right where you left it.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
