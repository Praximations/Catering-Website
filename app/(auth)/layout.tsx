import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { business } from "@/lib/business";

/**
 * Sign in and sign up: focused. No navbar, no footer, no dock, nothing that
 * leads away from the form except one quiet way back to the site.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Logo name={business.name} />
        <Link
          href="/"
          className="group inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to site
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
