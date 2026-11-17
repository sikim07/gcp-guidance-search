"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const FOCUS_FLAG = "gcp-focus-analytics";
const FOCUS_EVENT = "gcp-focus-analytics";
const TARGET_ID = "analytics";
/** Sticky header clearance when scrolling the analytics section into view. */
const HEADER_OFFSET_PX = 88;
const NEAR_PX = 8;
/** Match page view-transition duration in globals.css (~420ms). */
const PAGE_TRANSITION_MS = 450;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function maxScrollTop() {
  const doc = document.documentElement;
  return Math.max(0, doc.scrollHeight - window.innerHeight);
}

function sectionScrollTop(el: HTMLElement) {
  return Math.min(
    Math.max(
      0,
      el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX,
    ),
    maxScrollTop(),
  );
}

function smoothScrollMs(distancePx: number) {
  return Math.min(800, Math.max(240, Math.abs(distancePx) * 0.4 + 180));
}

/**
 * After the horizontal page transition, run exactly one vertical scroll to the
 * analytics section (plus highlight). No top-detour, no chained scrolls.
 */
export function HashScroll() {
  const pathname = usePathname();
  const runIdRef = useRef(0);
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

      const runId = ++runIdRef.current;
      clearTimers();
      const reduced = prefersReducedMotion();
      const target = sectionScrollTop(el);

      // Stop any in-flight native/Next scroll so we don't stack animations.
      window.scrollTo({ top: window.scrollY, behavior: "auto" });

      el.classList.remove("is-hash-focus");
      void el.offsetWidth;
      el.classList.add("is-hash-focus");

      const distance = Math.abs(window.scrollY - target);
      if (distance <= NEAR_PX || reduced) {
        window.scrollTo({ top: target, behavior: "auto" });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }

      timersRef.current.push(
        window.setTimeout(
          () => {
            if (runId !== runIdRef.current) return;
            el.classList.remove("is-hash-focus");
          },
          reduced ? 800 : Math.max(1600, smoothScrollMs(distance) + 900),
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
        timersRef.current.push(
          window.setTimeout(() => {
            focusing = false;
          }, 1200),
        );
      }, delayMs);
    }

    // Cross-route / deep-link: wait for horizontal page transition, then one scroll.
    if (
      sessionStorage.getItem(FOCUS_FLAG) === "1" ||
      window.location.hash.replace(/^#/, "") === TARGET_ID
    ) {
      schedule(prefersReducedMotion() ? 0 : PAGE_TRANSITION_MS);
    }

    function onFocusEvent() {
      focusing = false;
      runIdRef.current += 1;
      // Same-page: no page transition — scroll once immediately.
      schedule(prefersReducedMotion() ? 0 : 30);
    }

    window.addEventListener(FOCUS_EVENT, onFocusEvent);
    return () => {
      runIdRef.current += 1;
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
