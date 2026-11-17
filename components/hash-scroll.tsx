"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Scroll to `location.hash` after App Router navigations / view transitions. */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    scrollToHash();
    const t1 = window.setTimeout(scrollToHash, 120);
    const t2 = window.setTimeout(scrollToHash, 420);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
