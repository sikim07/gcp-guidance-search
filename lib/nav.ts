export const NAV_ITEMS = [
  { href: "/", label: "검색" },
  { href: "/updates", label: "개정 피드" },
  { href: "/documents", label: "문서" },
  { href: "/about", label: "안내" },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function navIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const match = NAV_ITEMS.findIndex(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return match === -1 ? 0 : match;
}

export function navTransitionType(
  fromPath: string,
  toPath: string,
): "nav-forward" | "nav-back" | null {
  const from = navIndex(fromPath);
  const to = navIndex(toPath);
  if (from === to) return null;
  return to > from ? "nav-forward" : "nav-back";
}
