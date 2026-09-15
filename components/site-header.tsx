import Link from "next/link";

const LINKS = [
  { href: "/", label: "검색" },
  { href: "/updates", label: "개정 피드" },
  { href: "/documents", label: "문서" },
  { href: "/about", label: "안내" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-rule/80 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-display text-lg tracking-tight text-ink">
          GCP 가이드라인 검색기
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
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
