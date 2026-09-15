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
      <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 py-3 md:max-w-5xl md:flex-row md:items-center md:justify-between md:py-4">
        <Link
          href="/"
          className="font-display text-ink flex items-center gap-2 text-base tracking-tight whitespace-nowrap sm:text-lg"
        >
          <span
            aria-hidden
            className="border-seal text-seal inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] leading-none"
          >
            規
          </span>
          GCP 가이드라인 검색기
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm md:w-auto md:justify-end">
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
