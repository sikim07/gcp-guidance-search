"use client";

import { ViewTransition, type ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { navIndex } from "@/lib/nav";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const index = navIndex(pathname);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (previous.current !== null && previous.current !== index) {
      document.documentElement.dataset.navDir =
        index > previous.current ? "forward" : "back";
    }
    previous.current = index;
  }, [index, pathname]);

  return (
    <ViewTransition
      key={pathname}
      name="page-content"
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      share={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      default="none"
    >
      <div className="page-shell">{children}</div>
    </ViewTransition>
  );
}
