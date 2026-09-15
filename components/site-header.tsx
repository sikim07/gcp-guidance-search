import Link from "next/link";

const LINKS = [
  { href: "/", label: "검색" },
  { href: "/updates", label: "개정 피드" },
  { href: "/documents", label: "문서" },
  { href: "/about", label: "안내" },
];

export function SiteHeader() {
  return (
    <header className="border-rule/80 bg-paper border-b">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:max-w-5xl sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <Link
          href="/"
          className="font-display text-ink flex items-center gap-2 text-base tracking-tight sm:text-lg"
        >
          <span
            aria-hidden
            className="border-seal text-seal inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] leading-none"
          >
            規
          </span>
          GCP 가이드라인 검색기
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink/70 hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
