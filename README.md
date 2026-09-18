# GCP 가이드라인 검색기

사이드 프로젝트 · skim88.1942@gmail.com

**한줄 요약.** 임상시험 규제 문서(ICH GCP, FDA 가이던스, 식약처 안내서, 관련 법령)는 여러 사이트에 흩어져 있고 수시로 개정된다. 이 문제를 자연어 검색과 자동 개정 감지 파이프라인으로 풀어본 프로젝트다. 프론트엔드, 백엔드(임베딩·검색 랭킹·개정 감지 배치), 인프라(캐시 전략·비용 통제), 운영(테스트·lint·빌드를 자동으로 강제하는 파이프라인)까지 하나로 이어지는 구조로 만들었다.

- 레포: https://github.com/sikim07/gcp-guidance-search
- 서비스: https://gcp-guidance-search.vercel.app

## 배경 — 어떤 문제를 발견했는가

현장(CRA/QA/RA)에서는 "이 절차가 GCP나 식약처 기준에 근거가 있나?"를 확인해야 할 일이 수시로 생긴다. 문제는 근거가 한 곳에 모여 있지 않다는 것이다. FDA ICH, FDA 가이던스, 식약처 민원인안내서, 국내 법령(약사법, 의료기기법 등)에 흩어져 있고, 각 문서는 수시로 개정되는데 어느 것이 현행본인지는 직접 원문 사이트를 일일이 다니며 확인해야 알 수 있다.

실제로 회사 내부에도 이 개정 현황을 사람이 직접 모니터링해서 정리해 공유하는 페이지가 따로 있을 정도로, "개정 여부를 추적하고 근거 조항을 찾는 일"은 이 도메인에서 흔한 수작업이다. 이걸 자동화할 수 있겠다고 판단해 시작했다.

이 프로젝트는 공개 규제 문서(FDA, 식약처, 국가법령정보센터)만을 대상으로 하고, 환자 개인정보나 임상적 판단은 다루지 않는다.

지금 들어가 있는 가이드라인은 ICH E6(R2) 전문, E6(R3) 발췌, Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서, 안전성 보고 기한 발췌다. 법령은 개인정보 보호법, 의료기기법, 약사법, 첨단재생바이오법, 「의약품 등의 안전에 관한 규칙」 **별표 4 KGCP 전문**이다.

E6(R2)와 별표 4는 `scripts/refresh-seed-corpus.ts`가 `lib/pipeline/fetch.ts`·`parse-pdf.ts`·법령 Open API로 받아온 원문을 `lib/pipeline/seed/extracted/`에 저장해두고, 시드가 그 파일을 그대로 읽는 방식이다. 조항을 손으로 옮겨 적지는 않는다.

```bash
npx tsx scripts/refresh-seed-corpus.ts   # FDA가 막히면 ICH E6(R2) PDF로 받고, LAW_OC로 별표 4를 받음
```

## 기술적 의사결정

### 전체 구조

개정 감지 파이프라인(크롤·API·법령 API → 청크·임베딩 → 저장)을 핵심으로 놓고, 그 위에 검색과 답변 화면을 올렸다. 프론트엔드는 Next.js App Router(React 19), 백엔드는 Vercel Serverless Functions와 Vercel Cron, 저장은 Supabase(Postgres)를 쓰고, 관리자 화면은 `/admin` 대시보드로 따로 두었다.

### 벡터 DB 대신 브루트포스 (실증 기반)

임상시험 규제 문서는 청크 수가 수백~수천 개 선에서 그친다. 그래서 "당연히 벡터 DB를 써야 한다"는 통념을 그대로 받아들이는 대신, 직접 벤치마크(100/1,000/10,000/100,000 청크 기준 브루트포스 vs ANN)를 돌려서 `BENCHMARK.md`에 근거를 남겼다. 실제 코퍼스 721개 기준으로 브루트포스 cosine 유사도 계산이 2ms 내외라, 임계치로 잡은 500ms보다 자릿수 자체가 다를 만큼(약 250배) 빠르다. 전환 조건(청크 5,000개 또는 검색 500ms 초과)은 코드 주석과 `AGENTS.md`에 명문화해서, 이후에도 근거 없이 되돌리지 않도록 해두었다.

### 조항 단위 청킹과 검색 품질 튜닝

문단 단위가 아니라 조항(제 N조, 별표 N, dotted clause number, Q&A 번호) 단위로 청킹해야 "이 조항이 답이다"를 정확히 짚을 수 있다. 단순 임베딩 유사도만 쓰면 ICH·FDA 가이던스에 흔한 로마숫자 목차(I, II, III…), BACKGROUND·INTRODUCTION 같은 절 제목, 각주 주소, 목차성 문장이 정작 본문 조항보다 위로 올라오는 문제가 있었다. 그래서 조항번호가 정확히 일치하면 가중치를 주는 로직(`sectionBoost`)과 이런 노이즈에 감점을 주는 로직(`qualityPenalty`)을 직접 만들어 보정했다. 이 로직은 6개 프리셋 질문과, 일부러 심어둔 노이즈 조항을 포함한 골드 테스트(`tests/retrieval-gold.test.ts`)로 회귀 검증한다.

### 이중 신호로 개정 감지

가이드라인은 고시일 또는 파일 해시(SHA-256)로, 법령은 법령일련번호(MST)·공포일·시행일로 개정 여부를 이중으로 추적한다. 변경이 감지되면 문서 전체가 아니라 단락 단위 diff로 바뀐 조항만 찾아 그 부분만 다시 임베딩하고, 변경 이력은 `/updates` 피드로 보여준다. 전체 문서를 매번 재임베딩하지 않아도 되게 만드는 것이 원래 목표였다.

### LLM은 기본으로 꺼두고, 켤 때만 켠다

검색에서 중요한 건 랭킹이지 긴 추론이 아니다. 답변은 적재된 조항 두세 개를 근거로 두세 문장만 쓰면 충분하다. 그래서 채팅 API 키가 없어도 제품이 완결되도록 만들었고, 기본값도 꺼둔 채로 뒀다. 이유는 세 가지다.

첫째, 오답 위험보다는 발췌가 안전하다. 규제 조항은 원문 그대로 인용하는 게 맞고, LLM이 요약하거나 재구성하면 없는 내용을 있는 것처럼 답하거나 표현이 미묘하게 바뀔 수 있다. 이건 비용보다 더 큰 리스크다.

둘째, 비용을 예측할 수 없는 구조를 만들고 싶지 않았다. 개인이 무상으로 운영하는 프로젝트라 트래픽이 갑자기 늘면 API 비용이 얼마나 나올지 알 수 없다. rate limit과 캐싱으로 막아도, 기본값 자체가 0원인 편이 가장 안전하다.

셋째, 발췌만으로도 실사용 가치가 이미 있다. 검색과 랭킹 품질이 핵심이라, 조항을 그대로 찾아 보여주는 것만으로도 CRA가 여러 사이트를 돌아다니는 문제는 이미 해결된다. 생성형 응답은 가독성을 더할 뿐, 없어도 제품은 완결된다.

- 답변: 키가 없으면 조항 발췌와 시드 한국어 룩업으로 대응
- 번역: 시드 한국어가 있으면 그걸 쓰고, 없으면 공개 기계 번역에 규제 용어 후처리를 붙임
- 임베딩: `OPENAI_API_KEY`가 있으면 `text-embedding-3-small`, 없으면 결정적 mock 벡터

유료 합성을 켤 때는 GPT-5.4 nano 하나만 쓴다. 한도를 꽉 채운 달(신규 검색 약 1,500회)에도 비용은 대략 1달러대다.

### 테스트·lint·빌드를 자동으로 강제하기

구현은 AI 에이전트(Cursor)에게 맡기되, 결과물 품질은 매번 사람이 리뷰하는 대신 자동 게이트로 확인하도록 만들었다. 세 단계로 구성했다.

1. **규칙을 텍스트로 명문화한다.** `AGENTS.md`에 벡터 DB 금지, KGCP는 별표 4(별표 1이 아님), OCR 금지, 근거 없는 답변 금지, 답변 LLM은 기본 발췌·유료면 GPT-5.4 nano 같은 프로젝트 제약을 적어두고, AI 에이전트가 매번 이걸 참조하게 했다.
2. **자동 게이트로 강제한다.** TypeScript strict, ESLint, Vitest 단위 테스트를 `npm run verify`로 묶어 git push 훅에 걸어서, 하나라도 실패하면 푸시 자체가 막히게 했다.
3. **구현이 끝나는 시점에 교차 검증한다.** Claude Code의 Stop 훅으로 구현이 끝날 때마다 git diff를 다른 모델(Gemini)에게 자동으로 검토시키고, 문제가 있으면 `{decision: "block"}`으로 재수정을 강제한다(`.claude/hooks/stop-review.mjs`).

AI가 만든 코드를 그대로 신뢰하는 게 아니라, 게이트를 통과하지 못하면 반영되지 않는 구조를 만드는 데 초점을 맞췄다.

### SEO와 성능 사이의 트레이드오프

검색형 앱은 크롤러에게 보여줄 텍스트가 없어서 SEO에 약하다. 그래서 모든 페이지를 `force-dynamic`으로 서버 렌더링했더니, 이번엔 라우트 캐시와 `<Link>` 프리페치가 꺼지면서 체감 속도가 떨어지는 대가를 치렀다. 그래서 가이드라인 문서 목록과 조항 페이지를 ISR(`revalidate = 3600`)로 바꾸고, 시드 로직은 `instrumentation.ts`의 `register()`로 옮겨 프로세스가 부팅되는 시점에만 한 번 돌게 했다. 빌드 단계(`NEXT_PHASE=phase-production-build`)에서는 시드를 돌리지 않는다.

## 겪은 어려움과 돌파 과정

### 1) 조항 페이지를 빌드타임에 전부 생성했더니 배포가 오래 걸렸다

**상황.** SEO를 위해 `generateStaticParams`로 조항 페이지를 전부 정적 생성하도록 했더니, 빌드 때마다 약 1,000개 페이지와 전체 임베딩 테이블까지 다시 읽어 들여야 해서 배포 시간이 길어지고 빌드 비용도 커졌다.

**돌파.** 모든 조항을 빌드타임에 만들 필요는 없다고 판단해서, `clauseStaticParams()`가 의도적으로 빈 배열을 반환하도록 바꾸고, 조항 페이지는 `dynamicParams = true`와 ISR로 첫 요청이 들어올 때만 생성되게 했다. 대신 모든 URL은 `sitemap.xml`에 담아서 크롤러가 찾아가게 했다. 이 결정은 커밋 메시지와 코드 주석에 남겨서 나중에 다시 되돌아가지 않도록 해두었다.

### 2) 벡터 DB를 안 쓴다면 근거가 뭐냐

**상황.** 초기 설계 단계에서 "문서 수가 적으니 벡터 DB는 불필요하다"라고 그냥 넘어가려다가, 이게 근거 없는 주장이라는 걸 깨달았다.

**돌파.** 100/1,000/10,000/100,000 청크 기준으로 브루트포스와 ANN 계열을 직접 벤치마킹해서 `BENCHMARK.md`에 수치로 남기고, 전환 임계치(청크 5,000개 또는 500ms)를 코드 주석으로 박아두었다. "안 쓴다"가 아니라 "이 수치까지는 안 쓴다"로 말을 바꾼 셈이다.

### 3) LLM 비용 통제

**상황.** 실제로 쓰인다면 CRA들이 감사추적, SAE 보고기한처럼 겹치는 질문을 반복해서 던질 텐데, 그때마다 임베딩과 LLM API를 다시 호출하면 응답도 느려지고 비효율적이다. 채팅 모델을 기본값으로 켜두면 한도 안에서도 비용이 커질 수 있었다.

**돌파.**

1. 질문을 정규화한 뒤 정확히 캐시에 걸리면 임베딩·LLM 호출과 일일 한도 체크를 모두 건너뛴다. 유사도 캐시 임계치는 느슨하게 잡지 않았다.
2. IP별 하루 새 질문 5건, 전체 하루 50건으로 호출량 자체에 상한을 두었다.
3. 채팅 모델은 기본적으로 꺼두고(발췌로 대체), 유료로 켤 때는 GPT-5.4 nano만 쓴다.

## 결과 — 측정 가능한 지표

- **검색 정확도:** 6개 핵심 질문(감사추적, 서면동의, 모니터링 범위, 민감정보, 의료기기 승인, SAE 보고기한)에 대해 top-1 조항 정확 일치와, 의도적으로 심은 노이즈 조항 배제를 회귀 테스트로 고정했다(`tests/retrieval-gold.test.ts`, `tests/search-quality.test.ts`).
- **검색 성능:** 실제 코퍼스 721청크 기준 브루트포스 유사도 검색이 약 2ms — 500ms 임계치 대비 약 250배 여유가 있다. 벡터 DB 없이도 서비스 수준 응답 속도가 나온다.
- **코드 품질:** 단위 테스트 142개가 통과하고, lint·타입체크 에러는 0개다. `AGENTS.md` 스펙 → `npm run verify` push 훅 → Stop 훅 교차 검토로 이어지는 구조라, AI가 만든 코드가 이 게이트를 통과하지 못하면 반영되지 않는다.
- **콘텐츠 규모:** `sitemap.xml` 기준 253개 URL 중 약 240개가 조항 단위 페이지다. ICH E6(R2) 전문(4만자 이상)과 국내 별표 4(KGCP) 전문(8천자 이상)을 발췌 파이프라인으로 적재했고, 이 기준을 `tests/corpus-coverage.test.ts`로 고정해두었다.
- **SEO/성능:** `force-dynamic`에서 ISR로 옮기면서 라우트 캐시와 프리페치를 되살렸다. 문서·조항 페이지는 빌드 때 만들지 않고 첫 요청 이후 1시간 ISR로 캐시한다.
- **비용 통제:** IP별 일 5건, 전체 일 50건으로 새 질문 수를 제한한다. 같은 질문은 캐시로 응답하고 한도에 넣지 않는다. 답변 LLM은 기본이 0원이고, 유료 nano와 한도 상한을 같이 쓰면 월 1달러대다.
- **운영 자동화:** 개정 감지부터 재임베딩, 캐시 무효화(`revalidatePath`), 관리자 대시보드 로그까지 사람 개입 없이 돌아가는 파이프라인이다.

## 실질적 도움

CRA·QA·RA가 "이 절차가 근거가 있나"를 확인할 때, 여러 사이트를 돌아다니며 PDF를 여는 대신 자연어로 질문하면 가이드라인과 법령 조항을 함께 찾아 출처와 원문 링크를 붙여준다. 답변은 항상 적재된 조항에 근거하고(근거 없는 질문은 거절한다), 공식 해석이 아니라는 면책 고지와 원문 링크를 함께 붙여서 오용 위험을 줄였다.

검색창 아래 프리셋과, 브라우저에 남은 최근 질문으로 다시 검색할 수 있다. 답변 카드에는 답변 탭과 원문 탭이 따로 있고, 영어 조항이 있으면 답변은 한국어로 먼저 나오되 원문 보기로 영어도 확인할 수 있다. 도움이 됐는지는 도움됨/도움되지 않음으로 남길 수 있고, 이 기록은 구글 시트(Apps Script 웹앱)로 저장된다.

문서가 개정될 때마다 사람이 원문 사이트를 재방문해 버전을 비교하던 작업을, 날짜·해시 이중 신호로 자동 감지해 개정 이력 피드로 바꿨다. 회사 내부에서 사람이 반복하던 관리 업무를 자동화한 결과라고 보면 된다.

## 기술 스택 요약

| 계층 | 기술 | 역할 |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind, HeroUI | 검색/답변 UI, ISR 페이지, View Transition 기반 페이지 전환 |
| Backend | Vercel Serverless Functions, Vercel Cron | 검색/번역/피드백 API, 일별 개정 감지 배치 |
| Data | Supabase (Postgres) | 문서·청크·법령조문·버전 이력·검색 로그 |
| AI/검색 | OpenAI 임베딩(`text-embedding-3-small`, 선택), 브루트포스 cosine, 발췌 답변. 유료 합성은 GPT-5.4 nano | 질문 임베딩, 근거 기반 답변 |
| 외부 연동 | FDA/ICH, 식약처, 국가법령정보센터(law.go.kr) Open API | 원문 수집, 법령 현행본/개정 이력 조회 |
| 품질 게이트 | `AGENTS.md`, TypeScript strict, ESLint, Vitest, git push 훅, Claude Code Stop 훅 | 스펙 명문화 → verify 실패 시 푸시 차단 → 구현 종료 시점 교차 모델 리뷰 |
| 운영 | 시드 버전 이력·`BENCHMARK.md`, `/admin`, sitemap/robots/llms.txt | 의사결정 근거 기록, 운영 가시성, SEO |

## 실행해보기

```bash
npm install
cp .env.example .env.local
npm run dev
```

이후 http://127.0.0.1:43123 에서 확인할 수 있다. API 키가 없어도 시드 문서와 시드 조문으로 검색, 개정 피드, 한국어 보기는 그대로 동작한다. 답변은 발췌로 나온다. 합성 답을 붙이려면 채팅 API 키를 넣으면 되고, 모델은 GPT-5.4 nano를 쓴다. 국가법령정보센터 현행 본문을 매일 다시 받으려면 `LAW_OC`를 넣는다.

```bash
npm run verify   # lint + unit test + production build. git push 훅이 이 명령을 쓴다
npm run bench    # 벡터 검색을 안 쓰기로 한 이유는 BENCHMARK.md에 있다
```

## 데이터 모델

가이드라인과 법령은 처음부터 테이블을 나눠서 설계했다. 가이드라인은 `documents` → `document_versions` → `chunks` 순서고 개정은 발행일과 파일 해시(SHA-256)로 식별한다. 법령은 `statutes` → `statute_revisions` → `statute_articles` 순서고 개정은 법령일련번호(MST), 공포일, 시행일, 제개정구분으로 식별한다. 이력 테이블 구조 자체가 다른 이유는 두 문서군이 개정을 알리는 방식이 다르기 때문이다. `0002_statutes.sql`에도 법령은 `file_hash`를 쓰지 않는다고 명시되어 있다.

`chunks.embedding`과 `statute_articles.embedding`은 pgvector 컬럼이 아니라 jsonb float 배열이다. `0001_init.sql`에서부터 vector 컬럼을 만들지 말라고 못 박아두었고, 전환 조건(청크 5,000개 초과 또는 유사도 계산 500ms 초과)은 `BENCHMARK.md`, `lib/retrieval/cosine.ts`와 동일하다. 현재 규모에서는 브루트포스 cosine이 이 임계치보다 자릿수가 다를 만큼 빠르다는 게 근거다.

옛 청크와 조문은 지우지 않는다. `chunks`와 `statute_articles` 모두 `is_current`로 현재 버전만 표시하고, 이전 행은 버전 이력과 단락 diff를 위해 그대로 남겨둔다.

`change_log`는 처음엔 `document_id`가 `documents`만 참조하는 구조였다. 법령을 추가하면서(`0002_statutes.sql`) 이 FK를 없애고 `entity_kind` 컬럼을 추가해서, 같은 테이블이 문서 id와 법령 id를 함께 가리킬 수 있게 바꿨다.

| 테이블 | 역할 |
| --- | --- |
| `documents` | 가이드라인 메타(출처, URL, 발행일, `file_hash`, 현행 버전 id) |
| `document_versions` | 가이드라인 버전 본문·해시·추출 상태·diff 요약 |
| `chunks` | 조항 단위 청크. `embedding`은 jsonb float 배열, `is_current`로 현행 표시 |
| `statutes` | 법령 메타(law_id, 현행 MST, 공포일·시행일, 제개정구분) |
| `statute_revisions` | 법령 개정 이력(MST, 공포일·시행일, diff 요약) |
| `statute_articles` | 법령 조문/별표. `embedding`은 jsonb, `is_current`로 현행 표시 |
| `change_log` | 문서·법령 개정 이벤트. `entity_kind`로 구분하고 `document_id`가 둘 다 담는다 |
| `query_cache` | 정규화 질문, 질문 임베딩, 답변, 출처, passages를 담는 질문 임베딩 유사도 캐시 |
| `rate_limits` | `(bucket, day)`별 카운터. IP·전역 일일 새 질문 한도에 쓴다 |
| `ingest_jobs` | 수집 큐. `status`·`attempts`·`last_error`로 재시도를 관리한다 |
| `search_logs` | 질문·답변·캐시 여부·`latency_ms`·`similarity_ms`·상위 청크 id |
| `translated_chunks` | 청크 id별 한국어 번역 캐시 |
| `feedback` | 검색 답변 도움됨/안됨과 선택적인 의견(`comment`) |
| `revalidation_logs` | 온디맨드 ISR 재검증 이유와 대상 경로·문서/법령 id |

## Vercel

이미 https://gcp-guidance-search.vercel.app 에 올라가 있다. 키 없이도 시드 문서로 검색, 개정 피드, 한국어 보기는 동작한다. Vercel 빌드 명령은 `next build`만 쓰고, lint와 테스트는 git push 훅(`npm run verify`)에서 미리 막는다. 문서와 조항 페이지는 빌드 때 전부 만들지 않고, 첫 요청 이후 1시간 ISR로 캐시한다. `sitemap.xml`에는 이 URL들이 그대로 들어간다.

검색은 IP당 하루 새 질문 5건, 전체 하루 50건으로 제한된다. 같은 질문은 캐시에서 다시 열리며 한도에 들어가지 않는다. Vercel 환경변수 `RATE_LIMIT_IP_DAILY`, `RATE_LIMIT_GLOBAL_DAILY`가 있으면 그 값이 코드 기본값보다 우선한다.

의견을 구글 시트에 남기려면 시트를 하나 만들고 `scripts/feedback-sheet.gs`를 Apps Script 웹앱으로 배포한 다음, Vercel에 `FEEDBACK_SHEETS_WEBHOOK_URL`을 넣으면 된다.

검색엔진과 AI 크롤러를 위해 `robots.txt`, `sitemap.xml`, `/llms.txt`, Open Graph를 제공한다. `sitemap.xml`에는 문서 목록뿐 아니라 조항별 페이지(`/documents/[id]/[section]`)도 들어간다. 홈에는 자주 찾는 질문의 근거 조항 요약이 서버에서 렌더링된다.

배포 후에는 Google Search Console에서 색인을 다시 요청하는 게 좋다.

1. [Search Console](https://search.google.com/search-console)에서 속성 `https://gcp-guidance-search.vercel.app`을 연다.
2. Sitemaps에 `https://gcp-guidance-search.vercel.app/sitemap.xml`을 다시 제출한다.
3. URL 검사에 홈(`/`), `/documents`, 조항 페이지 하나를 넣고 색인 생성을 요청한다.
4. `site:gcp-guidance-search.vercel.app` 결과가 비어 있으면, 요청 이후 며칠을 두고 다시 확인한다.

합성 답을 켜려면 채팅 API 키를 넣고 재배포하면 된다. 모델은 GPT-5.4 nano다. 임베딩만 올리려면 `OPENAI_API_KEY`만으로 충분하다. 법령 실시간 개정 조회에는 `LAW_OC`가 필요하고, 월 한도는 각 API 콘솔에서 걸어두는 게 안전하다. `CRON_SECRET`을 넣으면 매일 도는 개정 확인 크론이 그 값으로만 실행되고, 넣지 않으면 Vercel 크론의 User-Agent만 통과시킨다. Supabase는 재검증 이력뿐 아니라 문서·청크·검색 로그를 포함한 전체 데이터가 배포 사이에도 남게 해주는, 이 프로젝트의 유일한 영속 저장소다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만 발췌)
- [국가법령정보센터 Open API](https://open.law.go.kr) — 현행법령 JSON. KGCP는 「의약품 등의 안전에 관한 규칙」 **별표 4** (별표 1 GMP 아님)

스캔본 PDF는 아직 OCR을 붙이지 않아서 텍스트 추출이 안 된다. 이건 공식 해석이 아니니, 답변만 믿지 말고 링크로 원문을 한 번 더 확인하는 것을 권한다.
