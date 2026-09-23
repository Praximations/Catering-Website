import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatIcon, CheckIcon, InfoIcon, RepeatIcon, ReceiptIcon } from "@/components/icons";
import { Alert, cardClass, cx } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { hasOwner } from "@/lib/users";
import { LIMITS, safeNextPath } from "@/lib/validation";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "owner" ? "/admin" : "/account");
  const [ownerExists, params] = await Promise.all([hasOwner(), searchParams]);
  const next = safeNextPath(params.next) ?? "";
  const email = typeof params.email === "string" ? params.email.slice(0, LIMITS.email) : "";

  // What the account actually does, and nothing it does not.
  const benefits = [
    { icon: ReceiptIcon, text: "Every order and where it is up to" },
    { icon: RepeatIcon, text: "Reorder in one tap" },
    { icon: ChatIcon, text: "Message us with the order attached" },
  ];

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-ink-muted">Not needed to order, but it makes the next one quicker.</p>
      </div>

      <div className={cx(cardClass, "p-6 shadow-md sm:p-8")}>
        {!ownerExists ? (
          <Alert tone="info" icon={InfoIcon} title="This will be the owner account" className="mb-5">
            The first account runs the site and sees every order. Set OWNER_EMAIL to choose which address.
          </Alert>
        ) : null}
        <SignupForm next={next} initialEmail={email} />
      </div>

      <ul className="mt-6 space-y-2 px-2">
        {benefits.map((benefit) => (
          <li key={benefit.text} className="flex items-center gap-2.5 text-sm text-ink-muted">
            <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent">
              <benefit.icon className="size-3.5" />
            </span>
            {benefit.text}
          </li>
        ))}
        <li className="flex items-center gap-2.5 text-sm text-ink-muted">
          <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent">
            <CheckIcon className="size-3.5" />
          </span>
          Ordered as a guest? Same email, and they appear.
        </li>
      </ul>
    </div>
  );
}
