"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const FOCUS_FLAG = "gcp-focus-analytics";
const FOCUS_EVENT = "gcp-focus-analytics";
const TARGET_ID = "analytics";
/** Sticky header clearance when scrolling the analytics section into view. */
const HEADER_OFFSET_PX = 88;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function maxScrollTop() {
  const doc = document.documentElement;
  return Math.max(0, doc.scrollHeight - window.innerHeight);
}

function scrollToAnalytics(el: HTMLElement, behavior: ScrollBehavior) {
  const top =
    el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
  window.scrollTo({
    top: Math.min(Math.max(0, top), maxScrollTop()),
    behavior,
  });
}

/**
 * For /about#analytics (and 안내 clicks): jump to top, highlight the section,
 * then smooth-scroll into place once — never chained with native hash scrolling.
 */
export function HashScroll() {
  const pathname = usePathname();
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (pathname !== "/about") return;

    function clearTimers() {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    }

    function runAnalyticsFocus() {
      const forced = sessionStorage.getItem(FOCUS_FLAG) === "1";
      const hashId = window.location.hash.replace(/^#/, "");
      if (!forced && hashId !== TARGET_ID) return;
      sessionStorage.removeItem(FOCUS_FLAG);

      const el = document.getElementById(TARGET_ID);
      if (!el) return;

      clearTimers();
      const reduced = prefersReducedMotion();
      window.scrollTo({ top: 0, behavior: "auto" });

      el.classList.remove("is-hash-focus");
      void el.offsetWidth;
      el.classList.add("is-hash-focus");

      timersRef.current.push(
        window.setTimeout(
          () => {
            scrollToAnalytics(el, reduced ? "auto" : "smooth");
          },
          reduced ? 0 : 280,
        ),
      );

      timersRef.current.push(
        window.setTimeout(
          () => {
            el.classList.remove("is-hash-focus");
          },
          reduced ? 900 : 2200,
        ),
      );
    }

    let startTimer = 0;
    let focusing = false;

    function schedule(delayMs: number) {
      window.clearTimeout(startTimer);
      startTimer = window.setTimeout(() => {
        if (focusing) return;
        focusing = true;
        runAnalyticsFocus();
        // Allow a later explicit 안내 click after the choreography settles.
        timersRef.current.push(
          window.setTimeout(() => {
            focusing = false;
          }, 1500),
        );
      }, delayMs);
    }

    // Cross-route / deep-link entry only (flag or existing hash on mount).
    if (
      sessionStorage.getItem(FOCUS_FLAG) === "1" ||
      window.location.hash.replace(/^#/, "") === TARGET_ID
    ) {
      schedule(prefersReducedMotion() ? 0 : 480);
    }

    function onFocusEvent() {
      // Same-page 안내 click — no view transition wait.
      focusing = false;
      schedule(prefersReducedMotion() ? 0 : 40);
    }

    // Ignore native hash updates after NavLink — they re-trigger focus and
    // cause a second end-of-page scroll on mobile.
    window.addEventListener(FOCUS_EVENT, onFocusEvent);
    return () => {
      window.clearTimeout(startTimer);
      clearTimers();
      window.removeEventListener(FOCUS_EVENT, onFocusEvent);
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOCUS_EVENT));
  }
}
