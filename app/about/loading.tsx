export default function Loading() {
  return (
    <article
      className="max-w-2xl space-y-4 text-sm leading-7"
      aria-busy="true"
      aria-label="불러오는 중"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">안내와 면책</h1>
      <p>
        이 사이트는 필드 검증·감사추적 근거를 찾기 위해 만든 비공식 도구입니다. CRA/RA
        실무 참고용으로 공개할 예정이며, 규제 당국의 공식 창구가 아닙니다.
      </p>
      <h2 className="text-xl font-semibold">
        <span className="bg-muted/25 inline-block h-[1em] w-28 animate-pulse rounded-lg align-middle" />
      </h2>
      <p>
        <span className="bg-muted/20 inline-block h-[1em] w-full animate-pulse rounded-lg align-middle" />
        <span className="bg-muted/20 mt-2 inline-block h-[1em] w-5/6 animate-pulse rounded-lg align-middle" />
      </p>
      <h2 className="text-xl font-semibold">
        <span className="bg-muted/25 inline-block h-[1em] w-16 animate-pulse rounded-lg align-middle" />
      </h2>
      <p>
        <span className="bg-muted/20 inline-block h-[1em] w-full animate-pulse rounded-lg align-middle" />
        <span className="bg-muted/20 mt-2 inline-block h-[1em] w-4/5 animate-pulse rounded-lg align-middle" />
      </p>
    </article>
  );
}
