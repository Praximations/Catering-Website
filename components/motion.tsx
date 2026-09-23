"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveals for anything marked `data-reveal=""` (see reveal() in ui.tsx).
 *
 * THE RULE THAT KEEPS THIS FROM FLICKERING: an element is only hidden if it
 * starts BELOW the fold, where nobody can see it disappear. Anything already
 * on screen when this runs is marked static and never animates. Without
 * JavaScript, or with reduced motion, nothing is ever hidden at all, so the
 * page is complete before this file has even loaded.
 *
 * One observer for the whole page rather than a component per element, so a
 * long menu does not mount a hundred client components to fade itself in.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    const arm = () => {
      const fold = window.innerHeight * 0.94;
      document.querySelectorAll<HTMLElement>('[data-reveal=""]').forEach((element) => {
        if (element.getBoundingClientRect().top < fold) {
          element.setAttribute("data-reveal", "static");
          return;
        }
        element.setAttribute("data-reveal", "pending");
        observer.observe(element);
      });
    };

    arm();

    // Streamed and client-rendered content arrives after the first pass.
    let queued = 0;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        arm();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      if (queued) cancelAnimationFrame(queued);
      // Whatever was still waiting is shown, so a fast navigation back to a
      // page never finds content stuck invisible.
      document
        .querySelectorAll<HTMLElement>('[data-reveal="pending"]')
        .forEach((element) => element.setAttribute("data-reveal", "static"));
    };
  }, [pathname]);

  return null;
}
