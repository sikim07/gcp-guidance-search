# 비용 한도와 실무 검색 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 월 검색 API 최댓값을 약 $4.5 수준으로 묶고, CRA/RA가 모니터링 리포트에 붙일 조항이 서문·각주가 아니라 실제 조항이 되게 한다.

**Architecture:** 검색 후보는 `TOP_K = 6`으로 유지하고 LLM/발췌에 넣는 청크만 `ANSWER_K = 3`으로 줄인다. IP당 새 검색 5건·전역 50건. 정규화 질문 캐시 적중은 한도와 임베딩을 건너뛴다. 상위 3개 컷은 지금 프로덕션 랭킹(서문 1위)을 고친 뒤에야 안전하므로, 비용 패치와 검색 품질을 한 계획의 연속 단계로 둔다.

**Tech Stack:** Next.js App Router, Vitest, Anthropic Haiku, OpenAI embeddings, Supabase, Vercel env.

## Global Constraints

- 한국어 UI·에러 문구. 공식 해석이 아님을 유지한다.
- 벡터DB/pgvector를 추가하지 않는다.
- 답변은 청크 근거만. 출처(문서, 조항, URL)를 붙인다.
- `npm run verify`(lint + unit test + `next build`)가 통과해야 푸시한다.
- 프로덕션 Vercel 환경변수에 한도가 이미 있으면 **코드 기본값보다 대시보드 값이 이긴다.** 배포 후 Vercel의 `RATE_LIMIT_IP_DAILY` / `RATE_LIMIT_GLOBAL_DAILY`를 반드시 맞춘다.
- 잘못된 답을 7일 캐시에 남기지 않도록, 답변 생성 입력이 바뀌면 `CACHE_GEN`을 올린다.

## 비용 목표 (한도 안을 꽉 채웠을 때)

| 설정 | 월 최댓값 |
| --- | ---: |
| 현재 (전역 200, 청크 6, 출력 800) | 약 $21 |
| **채택: IP 5 + 전역 50 + 청크 3 + 출력 400** | 약 $4.5 |
| 더 줄일 때: 전역 30 (코드 변경 없이 env) | 약 $2.7 |

IP 5는 한 사람·봇이 전역 50을 혼자 소진하지 못하게 한다. 방문일에 같은 프리셋을 다시 여는 것은 캐시라 한도에 넣지 않는다.

## 파일 역할

- `lib/cost/rate-limit.ts` — IP/전역 기본값.
- `lib/retrieval/search.ts` — `TOP_K` vs `ANSWER_K`, 정확 캐시 우선, 캐시 세대.
- `lib/llm/answer.ts` — `ANSWER_MAX_TOKENS = 400`.
- `app/api/search/route.ts` — 캐시 적중은 한도 증가 없음.
- `lib/search/errors.ts`, `components/search-panel.tsx`, `components/page-skeleton.tsx`, `.env.example`, `README.md` — 한도 문구.
- `tests/rate-limit.test.ts`, `tests/search-edges.test.ts`, `tests/search-errors.test.ts` — 회귀.
- 이후 단계: `lib/retrieval/search.ts` 랭킹, `lib/pipeline/chunk.ts`, 시드 코퍼스, 검색 UI.

---

## Phase A — 코드 조금으로 비용을 묶는다

상위 3개 컷은 **랭킹이 맞다는 전제**에서만 정확도가 유지된다. 지금 프로덕션은 감사추적 프리셋 1·2위가 Part 11 BACKGROUND/INTRODUCTION이다. Phase A를 먼저 올려 지출을 막고, 같은 주기에 Phase B를 이어서 한다. A만 배포하고 B를 미루면 답이 더 짧아질 뿐 아니라 더 틀린 조항만 모델에 들어간다.

### Task 1: 한도 기본값을 IP 5 / 전역 50으로 낮춘다

**Files:**
- Modify: `lib/cost/rate-limit.ts`
- Modify: `tests/rate-limit.test.ts`
- Modify: `lib/search/errors.ts`
- Modify: `tests/search-errors.test.ts`
- Modify: `components/search-panel.tsx` (한도 안내 문구)
- Modify: `components/page-skeleton.tsx` (같은 문구, 전환 점프 방지)
- Modify: `.env.example`
- Modify: `README.md` (한도 설명 한 줄)

**Interfaces:**
- Consumes: `process.env.RATE_LIMIT_IP_DAILY`, `RATE_LIMIT_GLOBAL_DAILY`
- Produces: `DEFAULT_IP_DAILY = 5`, `DEFAULT_GLOBAL_DAILY = 50`, `rateLimitConfig()`

- [ ] **Step 1: 실패하는 한도 테스트를 20 → 5 기준으로 바꾼다**

`tests/rate-limit.test.ts`를 아래처럼 교체한다. 기본값이 아직 20이면 “6번째가 막힌다”는 테스트가 실패한다.

```ts
import { describe, expect, it } from "vitest";
import { RateLimitError, enforceRateLimit } from "@/lib/cost/rate-limit";
import type { AppStore } from "@/lib/db/types";

function fakeStore(): AppStore {
  const counts = new Map<string, number>();
  return {
    incrementRateLimit: async (bucket, day) => {
      const key = `${bucket}:${day}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
  } as AppStore;
}

describe("rate limit", () => {
  it("blocks the 6th new request from the same IP when the daily cap is 5", async () => {
    delete process.env.RATE_LIMIT_IP_DAILY;
    delete process.env.RATE_LIMIT_GLOBAL_DAILY;
    const store = fakeStore();
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(store, "203.0.113.10");
    }
    await expect(enforceRateLimit(store, "203.0.113.10")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("still allows another IP after one IP is exhausted", async () => {
    delete process.env.RATE_LIMIT_IP_DAILY;
    process.env.RATE_LIMIT_GLOBAL_DAILY = "50";
    const store = fakeStore();
    for (let i = 0; i < 5; i += 1) {
      await enforceRateLimit(store, "203.0.113.10");
    }
    await expect(enforceRateLimit(store, "203.0.113.11")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npx vitest run tests/rate-limit.test.ts`

Expected: FAIL (6번째가 아직 통과하거나, 기대 문구/횟수가 안 맞음)

- [ ] **Step 3: 기본값을 바꾼다**

`lib/cost/rate-limit.ts`:

```ts
export const DEFAULT_IP_DAILY = 5;
export const DEFAULT_GLOBAL_DAILY = 50;

export function rateLimitConfig() {
  return {
    ipDaily: Number(process.env.RATE_LIMIT_IP_DAILY ?? DEFAULT_IP_DAILY),
    globalDaily: Number(process.env.RATE_LIMIT_GLOBAL_DAILY ?? DEFAULT_GLOBAL_DAILY),
  };
}
```

`enforceRateLimit` 메시지 형식은 그대로 둔다. `IP당 일일 한도(${ipDaily}건)`이 자동으로 5를 쓴다.

`lib/search/errors.ts`의 limit 상세는 숫자를 하드코딩하지 않는다:

```ts
import { DEFAULT_IP_DAILY } from "@/lib/cost/rate-limit";
// ...
detail:
  fallback ??
  `내일 다시 열어 주세요. 한도는 IP당 하루 ${DEFAULT_IP_DAILY}건입니다. 같은 질문은 다시 열 수 있습니다.`,
```

검색 폼·스켈레톤 문구:

```tsx
하루 {DEFAULT_IP_DAILY}건의 새 검색이 가능합니다. 같은 질문은 한도에 들어가지 않습니다.
```

`.env.example`:

```
RATE_LIMIT_IP_DAILY=5
RATE_LIMIT_GLOBAL_DAILY=50
```

- [ ] **Step 4: 테스트를 다시 돌린다**

Run: `npx vitest run tests/rate-limit.test.ts tests/search-errors.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cost/rate-limit.ts tests/rate-limit.test.ts lib/search/errors.ts tests/search-errors.test.ts components/search-panel.tsx components/page-skeleton.tsx .env.example README.md
git commit -m "IP당 새 검색 한도를 5건으로 낮춘다"
```

---

### Task 2: 정확 캐시는 한도와 임베딩을 건너뛴다

IP를 5로 낮춘 뒤에도 프리셋·재검색이 막히면 실무 도구가 아니다. 지금은 `app/api/search/route.ts`가 **검색 전에** 한도를 올리고, `searchGuidelines`는 **캐시 조회 전에** `embedTexts`를 호출한다. 같은 질문 재검색도 한도와 임베딩 비용을 쓴다.

**Files:**
- Modify: `lib/retrieval/search.ts`
- Modify: `app/api/search/route.ts`
- Test: `tests/search-cache.test.ts` (신규)

**Interfaces:**
- Consumes: `store.getCachedAnswer(normalized)` , `CACHE_GEN`
- Produces: `peekExactSearchCache(store, query)` → `SearchResponse | null` (로그/searchLogId는 peek 시점에 쓰지 않거나, 캐시 히트 전용 헬퍼가 로그를 남긴다)

권장 흐름:

1. 라우트가 정규화 키로 정확 캐시만 본다. 맞으면 `cacheHit: true`로 반환하고 `enforceRateLimit`를 호출하지 않는다. 검색 로그는 남겨도 된다.
2. 없으면 `enforceRateLimit` 후 기존 `searchGuidelines`(임베딩 + 유사 캐시 + 생성).

- [ ] **Step 1: 캐시 히트가 한도를 올리지 않는 테스트를 먼저 적는다**

`tests/search-cache.test.ts` — 스토어 스텁으로 `peek`가 히트면 라우트 순서를 단위로 재현하기 어렵다면, `search.ts`에서 아래 순수 함수를 테스트한다.

```ts
export function shouldCountTowardRateLimit(cacheHit: boolean): boolean {
  return !cacheHit;
}
```

그리고 `peekExactSearchCache`가 만료되지 않은 exact row만 돌려주는지 테스트한다. 만료(`expiresAt` 과거)는 miss.

추가로 `tests/rate-limit.test.ts`에 “캐시 히트 경로에서는 increment를 호출하지 않는다”는 시나리오는 라우트 추출 함수로 검증한다:

```ts
export async function gateSearch(opts: {
  cacheHit: boolean;
  limit: () => Promise<void>;
}): Promise<void> {
  if (!opts.cacheHit) await opts.limit();
}
```

```ts
it("does not increment when the exact cache already has the answer", async () => {
  let calls = 0;
  await gateSearch({
    cacheHit: true,
    limit: async () => {
      calls += 1;
    },
  });
  expect(calls).toBe(0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/search-cache.test.ts`

Expected: FAIL (모듈/함수 없음)

- [ ] **Step 3: 구현**

`CACHE_GEN`은 Task 3에서 `v4:`로 올린다. 이 태스크에서는 exact peek만 넣는다.

`lib/retrieval/search.ts`에 정규화+세대 키를 한곳으로:

```ts
export function searchCacheKey(normalizedQuery: string): string {
  return `${CACHE_GEN}${normalizedQuery}`;
}
```

라우트 골격:

```ts
const store = await getStore();
const ip = clientIp(request.headers);
const cached = await peekExactSearchCache(store, query);
if (cached) {
  return Response.json(await withSearchLog(store, query, hashIp(ip), cached));
}
await enforceRateLimit(store, ip);
const result = await searchGuidelines(store, query, hashIp(ip));
return Response.json(result);
```

`searchGuidelines` 안의 정확 캐시 분기는 중복이 되므로 peek와 공유한다. 유사도 캐시(`CACHE_SIMILARITY = 0.97`)는 임베딩이 필요하므로 한도 **이후**에 둔다.

- [ ] **Step 4: 테스트 PASS**

Run: `npx vitest run tests/search-cache.test.ts tests/rate-limit.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/retrieval/search.ts app/api/search/route.ts tests/search-cache.test.ts
git commit -m "같은 질문 캐시는 일일 한도와 임베딩을 쓰지 않게 한다"
```

---

### Task 3: 검색 후보 6개, 답변 청크 3개, 출력 400토큰

**Files:**
- Modify: `lib/retrieval/search.ts`
- Modify: `lib/llm/answer.ts`
- Modify: `tests/search-edges.test.ts`

**Interfaces:**
- Consumes: `ranked` 길이 6
- Produces: `ANSWER_K = 3`, `ANSWER_MAX_TOKENS = 400`, `chunksForAnswer(retrieved)`, `CACHE_GEN = "v4:"`

동작:

- `slice(0, TOP_K)` 후보는 그대로 6. `원문` 탭 `passages`와 `topChunkIds`는 6을 유지한다. 랭킹이 아직 흔들릴 때 사용자가 4~6위에서 맞는 조항을 볼 수 있다.
- `generateAnswer(query, chunksForAnswer(retrieved))`만 상위 3개를 받는다. `sources`(답변 아래 출처)는 모델이 본 3개다.
- `extractiveAnswer`는 이미 `slice(0, 3)`이다. 호출부가 3개만 넘기면 중복 슬라이스여도 결과는 같다. 매직넘버 3을 `ANSWER_K`로 맞춘다.
- `isGrounded`는 **답변에 넣는 3개**만 본다. 그래서 Phase B 전에 서문이 1위이면 오답이 더 짧아진다.

- [ ] **Step 1: 실패하는 테스트를 적는다**

```ts
import { ANSWER_MAX_TOKENS } from "@/lib/llm/answer";
import { ANSWER_K, TOP_K, chunksForAnswer } from "@/lib/retrieval/search";

it("keeps six retrieval candidates but sends three to the answer", () => {
  expect(TOP_K).toBe(6);
  expect(ANSWER_K).toBe(3);
  const six = [0, 1, 2, 3, 4, 5];
  expect(chunksForAnswer(six)).toEqual([0, 1, 2]);
});

it("caps completion tokens at 400", () => {
  expect(ANSWER_MAX_TOKENS).toBe(400);
});
```

`TOP_K` / `ANSWER_K` / `chunksForAnswer`를 `search.ts`에서 export 한다. 지금은 없으면 FAIL.

- [ ] **Step 2: FAIL 확인**

Run: `npx vitest run tests/search-edges.test.ts`

Expected: FAIL

- [ ] **Step 3: 구현**

`lib/retrieval/search.ts`:

```ts
export const TOP_K = 6;
export const ANSWER_K = 3;
const CACHE_GEN = "v4:";

export function chunksForAnswer<T>(retrieved: T[], answerK = ANSWER_K): T[] {
  return retrieved.slice(0, answerK);
}
```

생성 호출:

```ts
const retrieved = ranked.map((r) => r.item);
const { answer, sources } = await generateAnswer(query, chunksForAnswer(retrieved));
const passages = isUngroundedAnswer(answer) ? [] : toPassages(retrieved);
```

`lib/llm/answer.ts`:

```ts
export const ANSWER_MAX_TOKENS = 400;
// messages.create({ max_tokens: ANSWER_MAX_TOKENS, ... })
```

`extractiveAnswer`:

```ts
import { ANSWER_K } from "@/lib/retrieval/search";
```

순환 import가 생기면 `ANSWER_K`를 `lib/retrieval/limits.ts`로 빼서 `search.ts`와 `answer.ts`가 둘 다 import 한다. 순환이 없으면 그대로 둬도 된다.

SYSTEM_PROMPT에 한 줄 추가(출력 상한과 맞춤):

```
6. 답은 두세 문장과 출처만 남긴다. 청크를 반복하지 않는다.
```

- [ ] **Step 4: PASS**

Run: `npx vitest run tests/search-edges.test.ts`

Expected: PASS

- [ ] **Step 5: `npm run verify` 후 Commit**

```bash
git add lib/retrieval/search.ts lib/llm/answer.ts tests/search-edges.test.ts lib/retrieval/limits.ts
git commit -m "답변에는 상위 3청크와 400토큰만 쓰고 검색 후보는 6개로 둔다"
```

- [ ] **Step 6: 프로덕션 env를 맞춘다**

Vercel 프로젝트 Environment Variables:

- `RATE_LIMIT_IP_DAILY=5`
- `RATE_LIMIT_GLOBAL_DAILY=50`

코드만 바꾸고 대시보드에 옛 20/200이 남아 있으면 한도는 안 내려간다. 배포 후 `npx vercel --prod --yes`와 대시보드 값을 함께 확인한다.

---

## Phase B — 상위 3개가 맞는 조항이 되게 한다

실무에서 의미 있게 쓰려면 **답이 짧은 것**보다 **1위 청크가 그 질문의 조항**이어야 한다. 비용 컷과 같이 가지 않으면 IP 5짜리 오답 생성기가 된다.

### Task 4: 골든 질문 평가를 고정한다

**Files:**
- Create: `tests/retrieval-gold.test.ts`
- Create: `lib/retrieval/gold.ts` (질문 → 기대 섹션 부분문자열)

프로덕션에서 이미 깨진 질문으로 시작한다. 시드/픽스처 청크 풀에서 `search` 랭킹 함수를 직접 돌릴 수 없으면, 점수 함수(`lexicalScore` / `phraseBoost` / 섹션 패널티)를 export 해서 동일 풀에 대해 1위 `section`만 검증한다.

최소 세트:

| 질문 | 1위에 있어야 할 것 | 1위에 있으면 실패 |
| --- | --- | --- |
| 전자기록 감사추적은 어떤 항목을 남겨야 하나? | `Q8` 또는 `Q12` 또는 `5.5.3` 또는 별표 4 감사추적 | `BACKGROUND`, `INTRODUCTION`, `I`, `II` |
| 시험대상자 서면 동의는 어떻게 받나? | `4.8` / 별표 4 시험대상자 동의 | 문서 제목 통째 청크 |
| 임상시험 모니터링 범위는 어떻게 정하나? | `5.18` / 별표 4 모니터링 / Risk-Based Monitoring 본문 절 | `5.7`, `.docx`, 각주 URL |
| 필수문서는 무엇을 보관하나? | essential documents / 별표 4 자료 보관 | 식약처 안내서 제1장 목적 |
| SAE는 며칠 안에 보고하나? | 코퍼스에 없으면 빈 답(현재) — Phase C에서 문서 추가 후 기한 조항 | 무관한 서문 |

- [ ] 골든 테스트를 적고, 현재 구현에서 FAIL 하는 것을 확인한다.
- [ ] Commit: `검색 골든 질문으로 1위 조항을 고정한다`

### Task 5: 서문·각주·파일명 청크를 깎는다

**Files:**
- Modify: `lib/retrieval/search.ts` (`phraseBoost` 옆 `qualityPenalty`)
- Modify: `lib/pipeline/chunk.ts` (가능하면 저장 시점에 쓰레기 청크를 안 만든다)
- Modify: `tests/retrieval-gold.test.ts`가 PASS 할 때까지

패널티 규칙 (구현에 그대로 넣을 것):

```ts
export function qualityPenalty(section: string, text: string): number {
  const head = `${section}\n${text}`.slice(0, 200);
  let n = 0;
  if (/^(I|II|III|IV|BACKGROUND|INTRODUCTION)\b/i.test(section.trim())) n += 0.35;
  if (/\.docx\b/i.test(text) || /https?:\/\/www\.fda\.gov\/ICECI/i.test(text)) n += 0.4;
  if (text.trim().length < 80) n += 0.2;
  if (/^.{0,40}$/.test(section) && /Good Clinical Practice: Integrated Addendum/i.test(section))
    n += 0.3;
  if (/제1장\s*목적/.test(head) && !/목적/.test(/* 질문은 호출부에서 */ "")) n += 0;
  return n;
}
```

질문과 무관한 “제1장 목적” 감쇠는 `phraseBoost`처럼 query를 받는 함수로 둔다. 점수식:

```
0.5 * cosine + 0.5 * lexical + phraseBoost - qualityPenalty
```

골든 4문항의 1위가 기대 섹션을 포함하면 PASS.

재적재 없이 이미 저장된 쓰레기 청크에도 패널티가 먹히므로 **검색 쪽 패널티를 먼저** 하고, 청커 수정은 다음 크론/재적재부터 적용한다.

캐시: `CACHE_GEN`을 `v5:`로 올려 옛 BACKGROUND 답을 버린다. `store.invalidateCache()`를 배포 직후 한 번 호출하는 스크립트 또는 크론 watch 성공 시 무효화.

- [ ] 골든 PASS
- [ ] `npm run verify`
- [ ] Commit: `서문과 각주 청크가 답변 1위가 되지 않게 깎는다`
- [ ] 프로덕션 캐시 무효화 후 프리셋 3개를 curl로 확인한다. 1위 섹션이 골든과 같아야 한다.

---

## Phase C — 코퍼스를 실무 질문에 맞게 채운다

UI를 더 만들기 전에 문서가 있어야 한다.

### Task 6: E6(R2) 조항 단위 전문 + E6(R3) 적재

**Files:**
- Modify: `lib/pipeline/seed/corpus.ts` 또는 파이프라인이 PDF를 조항(`1.24`, `5.5.3`, `ADDENDUM 5.18.6`)으로 자르게 `chunk.ts`의 `SECTION_PATTERNS`를 보강
- Create: R3 시드 또는 FDA ICH 카탈로그에서 E6(R3) 우선 수집 (`PRIORITY_TITLE_NEEDLES`에 `e6(r3)`는 이미 있음 — 수집이 안 되는 원인을 `watchSources` / PDF 추출에서 찾는다)
- `parseStatus: "needs_ocr"`를 실제 빈 텍스트에 기록한다. 지금은 항상 `"ok"`다.

완료 조건: 골든에 `ICH E6 R3 품질관리`를 추가하고, 식약처 제1장 목적이 아니라 R3 quality/risk 절이 1위.

### Task 7: 이상반응 보고 시계 문서

SAE/SUSAR·식약처 보고 기한은 방문 리포트에서 가장 자주 치는 질문인데 지금 코퍼스에 없어 빈 답이 난다.

넣을 것 (우선순위):

- KGCP 별표 4 안전성 보고 항 (법령 본문에 있으면 청크만 살리면 됨)
- 식약처 임상시험 안전성 보고 안내가 임상 키워드 필터를 통과하는지 확인
- FDA 쪽은 21 CFR 312.32를 통째 넣지 말고, 보고 기한 절만 시드로 발췌해도 된다

골든: `SAE는 며칠 안에 보고하나?` → 기한이 있는 조항, 빈 답 아님.

---

## Phase D — 현장에서 더 빨리 쓰게 하는 UX

검색이 맞는 조항을 준 다음에만 한다.

### Task 8: 출처 범위와 조항 번호 점프

- 필터: `국내(법령·KGCP·식약처)` / `FDA` / `둘 다`. 기본 `둘 다`.
- 질문이 `^\d+(\.\d+)+$` 또는 `^제\d+조`이면 유사도보다 섹션 정확 일치/접두를 먼저 둔다.

### Task 9: 인용 한 줄 복사

답변 카드에 버튼 하나. 클립보드 예:

```
[E6(R2) Good Clinical Practice, 5.5.3] https://www.fda.gov/media/93884/download
법적 자문이 아님. 원문을 확인할 것.
```

여러 출처면 줄바꿈으로 이어 붙인다. 모니터링 리포트·사이트 메일에 바로 붙는 것이 검색 횟수보다 효율이다.

### Task 10: 한국어 답을 기본으로

키가 있을 때 SYSTEM_PROMPT 5번(한국어)은 이미 있다. 키 없는 extractive는 영어 청크를 그대로 붙인다. 시드 한국어 룩업(`lib/llm/seed-lookup.ts`)이 있는 조항은 발췌 전에 치환하고, 나머지는 답이 영어이면 기존 번역 토글을 기본 켜짐으로 두지 말고 **답변 탭은 한국어 실패 시 원문 + 짧은 안내**.

번역 `max_tokens: 1200`은 검색 한도와 별개다. 이 계획의 비용 표에 넣지 않는다. 남용되면 나중에 번역 한도를 따로 둔다.

### Task 11: 개정 피드를 조항 키와 맞춘다

`summarizeDiff` 결과를 “별표 4 · 모니터링 항 문구 변경”처럼 검색 섹션과 같은 키로 보여 준다. 해시만 바뀐 로그는 접는다.

---

## 하지 않는 것 (이번 계획)

- 벡터DB / pgvector
- 전면 OCR (MFDS 스캔은 R3·청킹 안정 후)
- 검색 한도를 방문일용으로 다시 20으로 올리기 (캐시 제외로 대체)
- 인증 도입
- 번역 토큰 상한 일괄 삭감 (검색 비용과 다른 축)

---

## 배포 체크

1. Phase A verify + GitHub/origin push + `npx vercel --prod --yes`
2. Vercel env `RATE_LIMIT_IP_DAILY=5`, `RATE_LIMIT_GLOBAL_DAILY=50` 저장 후 재배포
3. 같은 프리셋을 6번 호출: 1번은 생성(또는 캐시), 이후는 200 + `cacheHit: true`, 429 아님
4. 다른 질문 6개: 6번째 새 질문은 429, 문구에 5건
5. Phase B 후 감사추적 프리셋 curl: 답/1위 섹션이 BACKGROUND가 아님
6. `GET /api/health` 문서·청크 수가 갑자기 0이 아닌지

---

## Spec coverage

- IP 한도 5, 봇이 전역 예산을 못 비움 → Task 1
- 전역 50 (표의 $4.5 행) → Task 1, env는 Task 3 Step 6
- 검색 6 / 답변 3 → Task 3
- max_tokens 400 → Task 3
- 실무에서 의미 있게: 맞는 조항, R3, SAE, 필터, 인용 복사, 한국어, 조항 단위 개정 → Tasks 4–11
- 캐시가 한도를 잡아먹지 않음 → Task 2 (IP 5와 함께여야 함)
