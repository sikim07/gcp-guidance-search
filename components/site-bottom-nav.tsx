"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, FileText, Search } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";

const ICONS = {
  "/": Search,
  "/updates": BookOpen,
  "/documents": FileText,
  "/about": CircleHelp,
} as const;

export function SiteBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-rule/70 bg-paper/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md md:hidden"
      data-testid="bottom-nav"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICONS[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  active
                    ? "text-ink flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium"
                    : "text-ink/45 flex flex-col items-center gap-0.5 py-1.5 text-[11px]"
                }
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
