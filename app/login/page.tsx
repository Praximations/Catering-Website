import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  // Already signed in: send them where they were going rather than showing
  // a form that would just replace the session they already have.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "owner" ? "/admin" : "/account");

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <PageHeader
        eyebrow="Sign in"
        title="Welcome back"
        lede="Sign in to see where your enquiries stand."
      />

      <LoginForm />

      <p className="mt-6 text-sm text-ink-muted">
        No account yet?{" "}
        <Link href="/signup" className="text-accent-strong hover:underline">
          Create one
        </Link>
        .
      </p>
      <p className="mt-2 text-sm text-ink-subtle">
        Want to look around first?{" "}
        <Link href="/menu" className="hover:underline">
          Browse the menu
        </Link>
        .
      </p>
    </main>
  );
}
