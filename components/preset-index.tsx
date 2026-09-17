import Link from "next/link";

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
    <section
      className="border-ink/10 mt-10 space-y-4 border-t pt-8"
      aria-labelledby="preset-index-heading"
    >
      <div>
        <h2 id="preset-index-heading" className="text-xl font-semibold tracking-tight">
          자주 찾는 질문의 근거 조항
        </h2>
        <p className="text-muted mt-2 text-sm leading-6">
          검색창을 쓰지 않아도, CRA가 반복해서 여는 조항 원문을 이 페이지에서 바로 읽을 수
          있습니다. 공식 해석이 아니므로 링크의 원문을 함께 확인하세요.
        </p>
      </div>
      <dl className="space-y-5">
        {summaries.map((row) => (
          <div key={row.id} className="space-y-2">
            <dt className="font-medium">{row.question}</dt>
            <dd className="text-ink/80 text-sm leading-6">
              {row.snippet ? (
                <>
                  <p>{row.snippet}</p>
                  <p className="text-ink/50 mt-1 text-xs">
                    {row.kind === "statute" ? "법령" : "가이드라인"} · {row.title} ·{" "}
                    {row.section}
                  </p>
                  <Link
                    href={row.href}
                    className="text-fda mt-2 inline-block text-sm underline"
                  >
                    {row.section} 원문 보기
                  </Link>
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
