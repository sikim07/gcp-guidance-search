import Link from "next/link";

/** Off-screen for people, still in HTML for crawlers. Do not use display:none. */
export const PRESET_INDEX_CLASS = "sr-only";

export function PresetIndex({
  summaries,
}: {
  summaries: Array<{
    id: string;
    question: string;
    title: string;
    section: string;
    snippet: string;
    href: string;
    kind: "guideline" | "statute";
  }>;
}) {
  return (
    <section className={PRESET_INDEX_CLASS} aria-label="자주 찾는 질문의 근거 조항">
      <h2>자주 찾는 질문의 근거 조항</h2>
      <p>
        CRA가 반복해서 여는 조항 원문입니다. 공식 해석이 아니므로 링크의 원문을 함께
        확인하세요.
      </p>
      <dl>
        {summaries.map((row) => (
          <div key={row.id}>
            <dt>{row.question}</dt>
            <dd>
              {row.snippet ? (
                <>
                  <p>{row.snippet}</p>
                  <p>
                    {row.kind === "statute" ? "법령" : "가이드라인"} · {row.title} ·{" "}
                    {row.section}
                  </p>
                  <Link href={row.href}>{row.section} 원문 보기</Link>
                </>
              ) : (
                <p>아직 적재된 조항에서 이 질문의 근거를 찾지 못했습니다.</p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
