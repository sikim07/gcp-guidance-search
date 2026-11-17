"use client";

import { useEffect } from "react";
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

function runAnalyticsFocus() {
  const forced = sessionStorage.getItem(FOCUS_FLAG) === "1";
  const hashId = window.location.hash.replace(/^#/, "");
  if (!forced && hashId !== TARGET_ID) return false;
  sessionStorage.removeItem(FOCUS_FLAG);

  const el = document.getElementById(TARGET_ID);
  if (!el) return false;

  const reduced = prefersReducedMotion();
  // Land at the top first, then ease to the section without overscrolling
  // past the document end (avoids a growing empty gap above the tab bar).
  window.scrollTo({ top: 0, behavior: "auto" });

  el.classList.remove("is-hash-focus");
  void el.offsetWidth;
  el.classList.add("is-hash-focus");

  window.setTimeout(
    () => {
      scrollToAnalytics(el, reduced ? "auto" : "smooth");
    },
    reduced ? 0 : 280,
  );

  window.setTimeout(
    () => {
      el.classList.remove("is-hash-focus");
    },
    reduced ? 900 : 2200,
  );

  return true;
}

/**
 * For /about#analytics (and 안내 clicks): jump to top, highlight the section,
 * then smooth-scroll into place without forcing empty space below.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/about") return;

    let startTimer = 0;

    function schedule(delayMs: number) {
      window.clearTimeout(startTimer);
      startTimer = window.setTimeout(() => {
        runAnalyticsFocus();
      }, delayMs);
    }

    // Cross-route entry: wait for page view-transition (~420ms).
    if (
      sessionStorage.getItem(FOCUS_FLAG) === "1" ||
      window.location.hash.replace(/^#/, "") === TARGET_ID
    ) {
      schedule(prefersReducedMotion() ? 0 : 480);
    }

    function onFocusEvent() {
      // Already on /about — no page transition, run promptly.
      schedule(prefersReducedMotion() ? 0 : 40);
    }

    window.addEventListener(FOCUS_EVENT, onFocusEvent);
    window.addEventListener("hashchange", onFocusEvent);
    return () => {
      window.clearTimeout(startTimer);
      window.removeEventListener(FOCUS_EVENT, onFocusEvent);
      window.removeEventListener("hashchange", onFocusEvent);
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
