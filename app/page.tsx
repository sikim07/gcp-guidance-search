import { SearchPanel } from "@/components/search-panel";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
      <SearchPanel />
      <aside className="space-y-4 text-sm leading-6 text-ink/75">
        <h2 className="font-display text-xl text-ink">이 도구가 하는 일</h2>
        <p>
          검색창은 조회용입니다. 본체는 FDA ICH, FDA 가이던스, 식약처 민원인안내서, KGCP
          별표 4의 개정을 매일 대조하는 파이프라인입니다.
        </p>
        <p>
          답변은 적재된 조항에만 근거합니다. 현장 판단이나 공식 유권해석을 대체하지 않습니다.
        </p>
        <p>
          오늘 무엇이 바뀌었는지는{" "}
          <a className="underline" href="/updates">
            개정 피드
          </a>
          를 먼저 보십시오.
        </p>
      </aside>
    </div>
  );
}
