"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navIndex } from "@/lib/nav";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const index = navIndex(pathname);
  const previous = useRef<number | null>(null);
  const direction =
    previous.current === null || previous.current === index
      ? "none"
      : index > previous.current
        ? "right"
        : "left";

  useEffect(() => {
    previous.current = index;
  }, [index]);

  return (
    <div className="page-transition-frame">
      <div key={pathname} className={`page-transition-pane page-transition-${direction}`}>
        {children}
      </div>
    </div>
  );
}
