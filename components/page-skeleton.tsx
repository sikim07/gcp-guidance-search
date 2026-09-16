import type { ReactNode } from "react";
import { DEFAULT_IP_DAILY } from "@/lib/cost/limits";
import { PRESET_QUERIES } from "@/lib/search/presets";

function PulseFill() {
  return (
    <span
      aria-hidden
      className="bg-muted/25 pointer-events-none absolute inset-0 animate-pulse rounded-[inherit]"
    />
  );
}

function SizedPulse({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`relative ${className}`}>
      <span className="invisible">{children}</span>
      <PulseFill />
    </span>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="불러오는 중">
      <section className="space-y-2">
        <h1 className="text-ink text-[1.65rem] leading-tight font-semibold tracking-tight sm:text-4xl">
          임상시험 규정을 검색
        </h1>
        <p className="text-muted text-sm leading-6">
          가이드라인과 법령에서 근거 조항을 찾습니다. 공식 해석이 아닙니다.
        </p>
      </section>

      <div className="card card--default search-sheet w-full shadow-none">
        <div className="card__content space-y-4 p-4 sm:p-6">
          <div className="space-y-4">
            <div className="textfield textfield--full-width">
              <div
                aria-hidden
                className="textarea textarea--full-width bg-muted/20 min-h-28 animate-pulse sm:min-h-32"
              />
            </div>
            <div>
              <p className="text-muted mb-3 text-xs tracking-wide">자주 찾는 질문</p>
              <div className="flex flex-wrap gap-3">
                {PRESET_QUERIES.map((preset) => (
                  <SizedPulse
                    key={preset.id}
                    className="button button--sm button--secondary preset-chip"
                  >
                    {preset.label}
                  </SizedPulse>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <SizedPulse className="button search-submit w-full justify-center sm:w-auto">
                검색
              </SizedPulse>
              <p className="text-muted text-xs">
                하루 {DEFAULT_IP_DAILY}건의 새 검색이 가능합니다. 같은 질문은 한도에
                들어가지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListPageSkeleton({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted mt-2 text-sm leading-6">{description}</p>
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="card card--default w-full shadow-none">
            <div className="card__content space-y-2">
              <div className="flex gap-2">
                <div className="bg-muted/25 h-6 w-16 animate-pulse rounded-full" />
                <div className="bg-muted/20 h-4 w-12 animate-pulse self-center rounded-lg" />
              </div>
              <div className="bg-muted/25 h-6 w-2/3 animate-pulse rounded-lg" />
              <div className="bg-muted/20 h-4 w-5/6 animate-pulse rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div>
        <div className="bg-muted/25 h-6 w-16 animate-pulse rounded-full" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="bg-muted/25 inline-block h-[1em] w-[min(18rem,100%)] animate-pulse rounded-lg align-middle" />
        </h1>
        <p className="text-fda mt-2 text-sm underline">
          <span className="bg-muted/20 inline-block h-[1em] w-16 animate-pulse rounded-lg align-middle" />
        </p>
      </div>
      <div className="card card--default w-full shadow-none">
        <div className="card__content space-y-2">
          <div className="bg-muted/25 h-5 w-40 animate-pulse rounded-lg" />
          <div className="bg-muted/20 h-6 w-full animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant,
}: {
  variant: "search" | "feed" | "catalog" | "detail";
}) {
  if (variant === "feed") {
    return (
      <ListPageSkeleton
        title="개정 피드"
        description="가이드라인은 발행일과 파일 내용으로, 법령은 공포·시행일과 법령번호로 개정을 남깁니다."
      />
    );
  }

  if (variant === "catalog") {
    return (
      <ListPageSkeleton
        title="문서 카탈로그"
        description="가이드라인은 발행일·해시, 법령은 MST·공포일·시행일로 현행을 표시합니다."
      />
    );
  }

  if (variant === "detail") {
    return <DetailSkeleton />;
  }

  return <SearchSkeleton />;
}
