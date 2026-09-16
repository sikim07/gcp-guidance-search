export const NAV_ITEMS = [
  { href: "/", label: "검색" },
  { href: "/updates", label: "개정 피드" },
  { href: "/documents", label: "문서" },
  { href: "/about", label: "안내" },
] as const;

export function navIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const match = NAV_ITEMS.findIndex(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return match === -1 ? 0 : match;
}
