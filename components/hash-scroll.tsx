"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const FOCUS_FLAG = "gcp-focus-analytics";
const FOCUS_EVENT = "gcp-focus-analytics";
const TARGET_ID = "analytics";
/** Sticky header clearance when scrolling the analytics section into view. */
const HEADER_OFFSET_PX = 88;
const TOP_EPSILON_PX = 12;

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

/** Rough duration so we can chain smooth scrolls without a hard cut. */
function smoothScrollMs(distancePx: number) {
  return Math.min(850, Math.max(220, Math.abs(distancePx) * 0.45 + 160));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function scrollToY(top: number, behavior: ScrollBehavior) {
  window.scrollTo({ top, behavior });
}

async function smoothScrollToY(top: number, reduced: boolean) {
  const from = window.scrollY;
  const distance = Math.abs(from - top);
  if (distance <= TOP_EPSILON_PX) {
    scrollToY(top, "auto");
    return;
  }
  if (reduced) {
    scrollToY(top, "auto");
    return;
  }

  scrollToY(top, "smooth");

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("scrollend", finish);
      resolve();
    };
    window.addEventListener("scrollend", finish, { once: true });
    window.setTimeout(finish, smoothScrollMs(distance));
  });
}

/**
 * For /about#analytics (and 안내 clicks):
 * page settle → (if needed) smooth to top → highlight → smooth to section.
 * No instant jump / dead freeze between the two scrolls.
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

    async function runAnalyticsFocus() {
      const forced = sessionStorage.getItem(FOCUS_FLAG) === "1";
      const hashId = window.location.hash.replace(/^#/, "");
      if (!forced && hashId !== TARGET_ID) return;
      sessionStorage.removeItem(FOCUS_FLAG);

      const el = document.getElementById(TARGET_ID);
      if (!el) return;

      const runId = ++runIdRef.current;
      clearTimers();
      const reduced = prefersReducedMotion();

      el.classList.remove("is-hash-focus");

      // 1) Reach the top smoothly when we are scrolled down — never hard-cut.
      if (window.scrollY > TOP_EPSILON_PX) {
        await smoothScrollToY(0, reduced);
        if (runId !== runIdRef.current) return;
        // Tiny beat so the eye registers the top before the section move.
        if (!reduced) await wait(90);
        if (runId !== runIdRef.current) return;
      }

      // 2) Highlight as the section scroll begins (not during a pause at top).
      void el.offsetWidth;
      el.classList.add("is-hash-focus");
      await smoothScrollToY(sectionScrollTop(el), reduced);
      if (runId !== runIdRef.current) return;

      timersRef.current.push(
        window.setTimeout(
          () => {
            if (runId !== runIdRef.current) return;
            el.classList.remove("is-hash-focus");
          },
          reduced ? 700 : 1600,
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
        void runAnalyticsFocus().finally(() => {
          timersRef.current.push(
            window.setTimeout(() => {
              focusing = false;
            }, 400),
          );
        });
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
      runIdRef.current += 1;
      schedule(prefersReducedMotion() ? 0 : 40);
    }

    // Ignore native hash updates after NavLink — they re-trigger focus and
    // cause a second end-of-page scroll on mobile.
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
