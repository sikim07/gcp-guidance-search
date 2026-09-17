import Link from "next/link";
import { clauseHref } from "@/lib/seo";
import { prettySectionLabel } from "@/lib/text/change-copy";
import { clipAtSentence, readableText } from "@/lib/text/readable";

export function tocLinkLabel(section: string): string {
  const pretty = prettySectionLabel(section);
  const first = pretty.trim().split(/\n/)[0] ?? pretty;
  const law = first.match(/^(제\s*\d+\s*조(?:의\s*\d+)?(?:\s*\([^)]+\))?)/);
  if (law) return law[1].replace(/\s+/g, "");
  return first.length <= 64 ? first : clipAtSentence(first, 64);
}

export function ClauseToc({
  entityId,
  clauses,
}: {
  entityId: string;
  clauses: Array<{ section: string; text: string }>;
}) {
  if (clauses.length === 0) {
    return <p className="text-muted text-sm">현재 적재된 조항이 없습니다.</p>;
  }
  return (
    <section className="space-y-3" aria-labelledby="clause-toc-heading">
      <h2 id="clause-toc-heading" className="text-lg font-semibold">
        조항 원문
      </h2>
      <ol className="space-y-3">
        {clauses.map((clause, index) => (
          <li
            key={`${clause.section}-${index}`}
            className="border-ink/10 border-b pb-3 last:border-b-0"
          >
            <Link
              href={clauseHref(entityId, clause.section)}
              className="block space-y-1"
            >
              <span className="text-fda inline-flex max-w-full items-baseline gap-1.5 font-medium underline underline-offset-4">
                <span className="min-w-0 break-words">{tocLinkLabel(clause.section)}</span>
                <span className="text-fda/70 shrink-0 text-xs no-underline">보기</span>
              </span>
              <p className="text-ink/70 text-sm leading-6">
                {clipAtSentence(readableText(clause.text), 180)}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
