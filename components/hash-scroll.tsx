"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const FOCUS_FLAG = "gcp-focus-analytics";
const TARGET_ID = "analytics";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * For /about#analytics (and 안내 clicks): jump to top, highlight the section,
 * then smooth-scroll into place.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/about") return;

    let scrollTimer = 0;
    let clearTimer = 0;

    function runFocus() {
      const forced = sessionStorage.getItem(FOCUS_FLAG) === "1";
      const hashId = window.location.hash.replace(/^#/, "");
      if (!forced && hashId !== TARGET_ID) return;
      sessionStorage.removeItem(FOCUS_FLAG);

      const el = document.getElementById(TARGET_ID);
      if (!el) return;

      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);

      const reduced = prefersReducedMotion();
      window.scrollTo({ top: 0, behavior: "auto" });

      el.classList.remove("is-hash-focus");
      // Force restart of the highlight animation.
      void el.offsetWidth;
      el.classList.add("is-hash-focus");

      scrollTimer = window.setTimeout(
        () => {
          el.scrollIntoView({
            behavior: reduced ? "auto" : "smooth",
            block: "start",
          });
        },
        reduced ? 0 : 320,
      );

      clearTimer = window.setTimeout(
        () => {
          el.classList.remove("is-hash-focus");
        },
        reduced ? 900 : 2600,
      );
    }

    // After view transitions settle.
    const start = window.setTimeout(runFocus, 40);
    window.addEventListener("hashchange", runFocus);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
      window.removeEventListener("hashchange", runFocus);
    };
  }, [pathname]);

  return null;
}

export function markAnalyticsFocus() {
  try {
    sessionStorage.setItem(FOCUS_FLAG, "1");
  } catch {
    /* private mode */
  }
}
