"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { NAV_ITEMS, isNavActive } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="border-rule/70 bg-paper sticky top-0 z-20 shrink-0 border-b"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 md:max-w-5xl md:py-3.5">
        <NavLink
          href="/"
          className="text-ink flex items-center gap-2.5 text-base font-semibold tracking-tight whitespace-nowrap sm:text-lg"
        >
          <Image
            src="/favicon.svg"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-md"
            unoptimized
          />
          GCP 가이드라인 검색기
        </NavLink>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((link) => {
            const active = isNavActive(pathname, link.href);
            return (
              <NavLink
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "bg-accent/10 text-ink inline-flex h-8 items-center rounded-full px-3 text-sm"
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink inline-flex h-8 items-center rounded-full px-3 text-sm"
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
