"use client";

import { BookOpen, CircleHelp, FileText, Search } from "lucide-react";
import { LiquidTabBar, type LiquidTabItem } from "@/components/LiquidTabBar";
import { NAV_ITEMS } from "@/lib/nav";

const ICONS = {
  "/": Search,
  "/updates": BookOpen,
  "/documents": FileText,
  "/about": CircleHelp,
} as const;

const TABS: LiquidTabItem[] = NAV_ITEMS.map((item) => ({
  href: item.href,
  label: item.label,
  icon: ICONS[item.href],
}));

export function SiteBottomNav() {
  return <LiquidTabBar tabs={TABS} />;
}
