"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-rule/70 bg-paper/80 sticky top-0 z-20 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 md:max-w-5xl md:py-3.5">
        <Link
          href="/"
          className="text-ink flex items-center gap-2.5 text-base font-semibold tracking-tight whitespace-nowrap sm:text-lg"
        >
          <img
            src="/favicon.svg"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-md"
          />
          GCP 가이드라인 검색기
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "bg-accent/10 text-ink inline-flex h-8 items-center rounded-full px-3 text-sm"
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink inline-flex h-8 items-center rounded-full px-3 text-sm"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
