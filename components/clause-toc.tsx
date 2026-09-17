import Link from "next/link";
import { clauseHref } from "@/lib/seo";
import { clipAtSentence, readableText } from "@/lib/text/readable";

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
            className="border-ink/10 space-y-1 border-b pb-3 last:border-b-0"
          >
            <Link
              href={clauseHref(entityId, clause.section)}
              className="font-medium hover:underline"
            >
              {clause.section}
            </Link>
            <p className="text-ink/70 text-sm leading-6">
              {clipAtSentence(readableText(clause.text), 180)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
