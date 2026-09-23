"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CART_ADDED_EVENT } from "./add-to-cart";
import { BagIcon, BookIcon, ChatIcon, RepeatIcon, ReceiptIcon, SparklesIcon, XIcon, type Icon } from "./icons";
import { button, cx } from "./ui";

/**
 * Two gentle moments, coordinated so they never compete:
 *
 *   WELCOME, once per browser: a small card with the three useful things to
 *   do here. Not a tour, not a modal: it sits in a corner, never takes focus,
 *   and is gone for good the moment it is dismissed or used.
 *
 *   SIGN UP, for people who are not signed in, only after they have shown
 *   intent (added something to the basket, or looked at a few pages), never
 *   during checkout or on an order page (which has its own prompt), and never
 *   again for a month after "Not now". It says what an account is actually
 *   for, instead of pushing a button on every page.
 *
 * Both are remembered in this browser's localStorage and nowhere else. If
 * storage is unavailable, neither shows, which is the polite failure.
 */

const WELCOME_KEY = "catering:welcome";
const NUDGE_KEY = "catering:signup-nudge";
const VIEWS_KEY = "catering:page-views";
const NUDGE_QUIET_DAYS = 30;

type Showing = "none" | "welcome" | "nudge";

function read(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return "unavailable";
  }
}

function write(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Nothing to do: it will simply not be remembered.
  }
}

function nudgeAllowed(): boolean {
  const last = read("local", NUDGE_KEY);
  if (last === "unavailable") return false;
  if (!last) return true;
  return Date.now() - Number(last) > NUDGE_QUIET_DAYS * 86_400_000;
}

/** Pages where neither card should appear. */
function quietPath(pathname: string): boolean {
  return pathname.startsWith("/cart") || pathname.startsWith("/orders/") || pathname.startsWith("/account");
}

/**
 * Below xl the order page already floats its basket bar above the dock, and a
 * third layer on a phone screen is clutter, not help. The prompt waits for a
 * page with room; the order confirmation page has its own anyway.
 */
function crowded(pathname: string): boolean {
  return pathname.startsWith("/shop") && !window.matchMedia("(min-width: 80rem)").matches;
}

export function Onboarding({ signedIn, businessName }: { signedIn: boolean; businessName: string }) {
  const pathname = usePathname();
  const [showing, setShowing] = useState<Showing>("none");
  const [leaving, setLeaving] = useState(false);
  // Timers read the latest value through this, not a stale closure.
  const showingRef = useRef<Showing>("none");
  useEffect(() => {
    showingRef.current = showing;
  }, [showing]);

  // The welcome: first visit only, after the page has settled.
  useEffect(() => {
    if (signedIn || quietPath(pathname)) return;
    if (read("local", WELCOME_KEY) !== null) return;
    const timer = window.setTimeout(() => {
      if (showingRef.current === "none") setShowing("welcome");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [signedIn, pathname]);

  // Count pages seen this visit; a few of them is intent.
  useEffect(() => {
    if (signedIn) return;
    const views = Number(read("session", VIEWS_KEY) ?? 0) + 1;
    write("session", VIEWS_KEY, String(views));
    if (views < 4 || quietPath(pathname) || !nudgeAllowed() || read("local", WELCOME_KEY) === null) return;
    const timer = window.setTimeout(() => {
      if (showingRef.current === "none" && !crowded(pathname)) setShowing("nudge");
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [signedIn, pathname]);

  // Adding to the basket is the clearest intent there is.
  useEffect(() => {
    if (signedIn) return;
    const onAdded = () => {
      if (!nudgeAllowed() || read("local", WELCOME_KEY) === null) return;
      window.setTimeout(() => {
        const path = window.location.pathname;
        if (showingRef.current === "none" && !quietPath(path) && !crowded(path)) setShowing("nudge");
      }, 1400);
    };
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(CART_ADDED_EVENT, onAdded);
  }, [signedIn]);

  // Escape dismisses whichever is showing.
  useEffect(() => {
    if (showing === "none") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function dismiss() {
    const current = showingRef.current;
    if (current === "welcome") write("local", WELCOME_KEY, "done");
    if (current === "nudge") write("local", NUDGE_KEY, String(Date.now()));
    setLeaving(true);
    window.setTimeout(() => {
      setShowing("none");
      setLeaving(false);
    }, 200);
  }

  if (showing === "none") return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="onboarding-title"
      className={cx(
        "fixed inset-x-3 z-40 mx-auto max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-lg transition-[opacity,transform] duration-200 sm:right-auto sm:left-5 sm:mx-0 lg:bottom-5",
        // Clear of the dock on a phone, and of the basket pill on the order page.
        pathname.startsWith("/shop") ? "bottom-[9.5rem] xl:bottom-5" : "bottom-[5.75rem]",
        leaving ? "translate-y-2 opacity-0" : "animate-fade-up"
      )}
    >
      <button type="button" onClick={dismiss} aria-label="Close" className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-ink/5 hover:text-ink">
        <XIcon className="size-4" />
      </button>
      {showing === "welcome" ? (
        <Welcome businessName={businessName} onDone={dismiss} />
      ) : (
        <Nudge onDone={dismiss} />
      )}
    </aside>
  );
}

function Welcome({ businessName, onDone }: { businessName: string; onDone: () => void }) {
  const actions: { href: string; label: string; icon: Icon }[] = [
    { href: "/shop", label: "Order a lunch", icon: BagIcon },
    { href: "/quote", label: "Plan an event", icon: SparklesIcon },
    { href: "/menu", label: "Menus", icon: BookIcon },
  ];
  return (
    <>
      <p id="onboarding-title" className="pr-8 font-display text-lg font-semibold tracking-tight">
        Welcome to {businessName}
      </p>
      <p className="mt-1 text-sm text-ink-muted">Catering, delivered ready to serve. No account needed to order.</p>
      <ul className="mt-4 grid grid-cols-3 gap-2" aria-label="Where to start">
        {actions.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              onClick={onDone}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-line px-2 py-2.5 text-center text-xs font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft"
            >
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:scale-105">
                <action.icon className="size-4" />
              </span>
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Nudge({ onDone }: { onDone: () => void }) {
  const benefits: { text: string; icon: Icon }[] = [
    { text: "Follow every order", icon: ReceiptIcon },
    { text: "Reorder in one tap", icon: RepeatIcon },
    { text: "Message us about an order", icon: ChatIcon },
  ];
  return (
    <>
      <p id="onboarding-title" className="pr-8 font-display text-lg font-semibold tracking-tight">
        Save your details for next time
      </p>
      <p className="mt-1 text-sm text-ink-muted">A free account makes the next order quicker. You can still order without one.</p>
      <ul className="mt-3 space-y-1.5">
        {benefits.map((benefit) => (
          <li key={benefit.text} className="flex items-center gap-2 text-sm text-ink">
            <benefit.icon className="size-4 text-accent" />
            {benefit.text}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <Link href="/signup" onClick={onDone} className={cx(button("primary", "sm"), "flex-1")}>
          Create account
        </Link>
        <button type="button" onClick={onDone} className={button("ghost", "sm")}>
          Not now
        </button>
      </div>
    </>
  );
}
