"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { cn } from "@/lib/utils";

export type LiquidTabItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

type BlobBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const EMPTY_BLOB: BlobBox = { left: 0, top: 0, width: 0, height: 0 };

function tabIndex(tabs: readonly LiquidTabItem[], pathname: string): number {
  const exact = tabs.findIndex((tab) => tab.href === pathname);
  if (exact !== -1) return exact;
  let best = 0;
  tabs.forEach((tab, index) => {
    if (tab.href !== "/" && pathname.startsWith(tab.href)) best = index;
  });
  return best;
}

export function LiquidTabBar({
  tabs,
  className,
}: {
  tabs: readonly LiquidTabItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const active = tabIndex(tabs, pathname);
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [blob, setBlob] = useState<BlobBox>(EMPTY_BLOB);
  const [measured, setMeasured] = useState(false);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const tab = tabRefs.current[active];
    if (!nav || !tab) return;
    const navRect = nav.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setBlob({
      left: tabRect.left - navRect.left + 3,
      top: tabRect.top - navRect.top + 3,
      width: Math.max(0, tabRect.width - 6),
      height: Math.max(0, tabRect.height - 6),
    });
    setMeasured(true);
  }, [active]);

  useLayoutEffect(() => {
    measure();
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(nav);
    tabRefs.current.forEach((tab) => {
      if (tab) observer.observe(tab);
    });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, pathname, tabs]);

  const blobStyle = (delay: number): CSSProperties => ({
    left: blob.left,
    top: blob.top,
    width: blob.width,
    height: blob.height,
    opacity: measured && blob.width > 0 ? 1 : 0,
    transition: measured
      ? `left 420ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms, top 420ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms, width 420ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms, height 420ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms`
      : "none",
  });

  return (
    <nav
      ref={navRef}
      aria-label="주요 메뉴"
      data-testid="bottom-nav"
      className={cn("liquid-tabbar", className)}
      style={{ viewTransitionName: "site-tabbar" }}
    >
      <svg aria-hidden className="absolute h-0 w-0" focusable="false">
        <defs>
          <filter id="liquid-tab-goo" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="liquid-tabbar-blobs" aria-hidden>
        <span className="liquid-tabbar-blob liquid-tabbar-blob-trail" style={blobStyle(70)} />
        <span className="liquid-tabbar-blob liquid-tabbar-blob-main" style={blobStyle(0)} />
      </div>

      <ul className="liquid-tabbar-list">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === active;
          return (
            <li
              key={tab.href}
              className="min-w-0 flex-1"
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
            >
              <NavLink
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "liquid-tabbar-link liquid-tabbar-link-active"
                    : "liquid-tabbar-link"
                }
              >
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="liquid-tabbar-label">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
