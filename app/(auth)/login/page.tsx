import type { Metadata } from "next";
import Link from "next/link";
import { AlertIcon } from "@/components/icons";
import { Alert, cardClass, cx } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { isGoogleAuthConfigured } from "@/lib/supabase-auth";
import { LIMITS, safeNextPath } from "@/lib/validation";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; next?: string; email?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const next = safeNextPath(params.next) ?? "";
  const email = typeof params.email === "string" ? params.email.slice(0, LIMITS.email) : "";

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-muted">Your orders, messages and saved details.</p>
      </div>

      <div className={cx(cardClass, "p-6 shadow-md sm:p-8")}>
        {user ? (
          <div className="mb-5 rounded-lg bg-raised px-4 py-3 text-sm text-ink-muted">
            Signed in as <span className="font-medium text-ink">{user.email}</span>.{" "}
            <Link href={user.role === "owner" ? "/admin" : "/account"} className="font-semibold text-accent hover:underline">
              Continue
            </Link>
          </div>
        ) : null}

        {params.oauth ? (
          <Alert tone="error" icon={AlertIcon} className="mb-5">
            {params.oauth === "not-configured"
              ? "Google sign in is not set up on this site yet."
              : "Google sign in could not be completed. Please try again."}
          </Alert>
        ) : null}

        {/* Only offered when it works. A disabled button looks broken. */}
        {isGoogleAuthConfigured ? (
          <>
            <Link
              href="/auth/google"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-raised"
            >
              <span aria-hidden className="font-bold text-info">
                G
              </span>
              Continue with Google
            </Link>
            <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
          </>
        ) : null}

        <LoginForm next={next} initialEmail={email} />
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No account needed to order.{" "}
        <Link href="/shop" className="font-medium text-ink hover:text-accent">
          Order as a guest
        </Link>
      </p>
    </div>
  );
}
