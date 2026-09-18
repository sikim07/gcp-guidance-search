# GCP 가이드라인 검색기

사이드 프로젝트 · skim88.1942@gmail.com

**한줄 요약.** 임상시험 규제 문서 — ICH GCP, FDA 가이던스, 식약처 안내서, 관련 법령 — 는 여러 사이트에 흩어져 있고, 그마저도 수시로 바뀐다. 이 문제를 자연어 검색과 자동 개정 감지 파이프라인으로 풀어봤다. 프론트엔드만이 아니라 백엔드(임베딩, 검색 랭킹, 개정 감지 배치), 인프라(캐시 전략, 비용 통제), 운영(테스트·lint·빌드를 자동으로 강제하는 파이프라인)까지 다 엮여 있는 프로젝트다.

- 레포: https://github.com/sikim07/gcp-guidance-search
- 서비스: https://gcp-guidance-search.vercel.app

## 배경 — 어떤 문제를 발견했는가

현장(CRA/QA/RA)에서는 "이 절차가 GCP나 식약처 기준에 근거가 있나?"를 확인해야 할 일이 수시로 생긴다. 근거가 한 곳에 있으면 좋을 텐데, 그렇지가 않다. FDA ICH, FDA 가이던스, 식약처 민원인안내서, 국내 법령(약사법, 의료기기법 등)에 흩어져 있고, 개정도 제각각 이루어진다. 그러니 지금 보고 있는 문서가 현행본인지조차 원문 사이트를 하나하나 들어가 확인해야 알 수 있다.

이게 얼마나 흔한 수작업이냐면, 회사 내부에도 이 개정 현황을 사람이 직접 모니터링해서 정리해 공유하는 페이지가 따로 있을 정도다. "개정 여부를 추적하고 근거 조항을 찾는 일"을 자동화할 수 있겠다 싶어서 만들기 시작했다.

다만 이 프로젝트는 공개 규제 문서(FDA, 식약처, 국가법령정보센터)만 다룬다. 환자 개인정보나 임상적 판단은 애초에 대상이 아니다.

지금 들어가 있는 가이드라인은 ICH E6(R2) 전문, E6(R3) 발췌, Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서, 안전성 보고 기한 발췌. 법령 쪽은 개인정보 보호법, 의료기기법, 약사법, 첨단재생바이오법, 그리고 「의약품 등의 안전에 관한 규칙」 **별표 4 KGCP 전문**이다.

E6(R2)와 별표 4는 손으로 옮겨 적지 않았다. `scripts/refresh-seed-corpus.ts`가 `lib/pipeline/fetch.ts`, `parse-pdf.ts`, 법령 Open API로 원문을 받아서 `lib/pipeline/seed/extracted/`에 저장해두면, 시드는 그 파일을 그대로 읽는 구조다.

```bash
npx tsx scripts/refresh-seed-corpus.ts   # FDA가 막히면 ICH E6(R2) PDF로 받고, LAW_OC로 별표 4를 받음
```

## 기술적 의사결정

### 전체 구조

핵심은 개정 감지 파이프라인이다. 크롤·API·법령 API로 문서를 받아 청크·임베딩으로 쪼개 저장하는 흐름을 먼저 잡고, 그 위에 검색과 답변 화면을 얹었다. 프론트엔드는 Next.js App Router(React 19), 백엔드는 Vercel Serverless Functions와 Vercel Cron, 저장은 Supabase(Postgres)다. 관리자 화면은 따로 `/admin` 대시보드로 뒀다.

### 벡터 DB 대신 브루트포스

임상시험 규제 문서는 청크 수가 많아 봐야 수백~수천 개다. "그럼 당연히 벡터 DB지" 싶었지만, 그냥 그렇게 믿고 넘어가고 싶지 않았다. 그래서 100/1,000/10,000/100,000 청크 기준으로 브루트포스와 ANN을 직접 벤치마킹해서 `BENCHMARK.md`에 근거를 남겼다. 결과는 명확했다. 실제 코퍼스 721개 기준 브루트포스 cosine 유사도 계산이 2ms 내외인데, 임계치로 잡은 500ms보다 자릿수 자체가 다를 만큼(약 250배) 빠르다. 전환 조건(청크 5,000개 또는 검색 500ms 초과)은 코드 주석과 `AGENTS.md`에 못 박아뒀다. 나중에 근거 없이 "그래도 벡터 DB가 낫지 않을까"로 되돌아가지 않도록.

### 조항 단위 청킹과 검색 품질 튜닝

문단 단위로 쪼개면 안 됐다. 조항(제 N조, 별표 N, dotted clause number, Q&A 번호) 단위로 청킹해야 "이 조항이 답이다"를 정확히 짚을 수 있었다. 단순 임베딩 유사도만 쓰니까 문제가 하나 생겼는데, ICH·FDA 가이던스에 흔한 로마숫자 목차(I, II, III…)나 BACKGROUND·INTRODUCTION 같은 절 제목, 각주 주소, 목차성 문장이 정작 본문 조항보다 위로 올라오는 것이었다. 그래서 조항번호가 정확히 일치하면 가중치를 주고(`sectionBoost`), 이런 노이즈에는 감점을 주는(`qualityPenalty`) 로직을 직접 만들었다. 6개 프리셋 질문과, 일부러 심어둔 노이즈 조항을 포함한 골드 테스트(`tests/retrieval-gold.test.ts`)로 이 동작을 계속 회귀 검증한다.

### 이중 신호로 개정 감지

가이드라인은 고시일이나 파일 해시(SHA-256)로, 법령은 법령일련번호(MST)·공포일·시행일로 개정 여부를 잡아낸다. 신호가 다른 이유는 문서 성격이 다르기 때문이다. 변경이 감지되면 문서 전체를 다시 훑지 않는다. 단락 단위 diff로 바뀐 조항만 찾아서 그 부분만 재임베딩하고, 변경 이력은 `/updates` 피드로 보여준다. 전체 문서를 매번 재임베딩하지 않아도 되는 것, 그게 원래 목표였다.

### LLM은 기본으로 꺼둔다

검색에서 중요한 건 랭킹이지 긴 추론이 아니다. 답변은 적재된 조항 두세 개를 근거로 두세 문장이면 충분하다. 그래서 채팅 API 키가 아예 없어도 제품이 완결되게 만들었고, 기본값도 꺼둔 채로 뒀다. 이유는 세 가지다.

하나, 오답 위험이 비용보다 크다. 규제 조항은 원문 그대로 인용해야 맞다. LLM이 요약하거나 재구성하면 없는 내용을 있는 것처럼 말하거나 표현이 미묘하게 바뀔 수 있는데, 이건 그냥 넘어갈 수 있는 리스크가 아니다.

둘, 비용을 예측할 수 없는 구조는 애초에 만들고 싶지 않았다. 개인이 무상으로 운영하는 프로젝트라 트래픽이 갑자기 늘면 얼마가 나올지 알 수 없다. rate limit이나 캐싱으로 막아도 결국 기본값이 0원인 게 제일 안전하다.

셋, 발췌만으로도 이미 쓸모가 있다. 검색과 랭킹만 잘 되면 CRA가 여러 사이트를 돌아다니는 문제는 그걸로 풀린다. 생성형 응답은 가독성을 조금 더할 뿐이지, 없어도 제품은 완결된다.

- 답변: 키가 없으면 조항 발췌와 시드 한국어 룩업으로 대응
- 번역: 시드 한국어가 있으면 그걸 쓰고, 없으면 공개 기계 번역 + 규제 용어 후처리
- 임베딩: `OPENAI_API_KEY`가 있으면 `text-embedding-3-small`, 없으면 결정적 mock 벡터

유료 합성을 켤 때도 GPT-5.4 nano 하나만 쓴다. 한도를 꽉 채운 달(신규 검색 약 1,500회) 기준으로도 비용은 1달러대다.

### 테스트·lint·빌드를 자동으로 강제하기

구현 자체는 AI 에이전트(Cursor)에게 맡겼다. 대신 결과물 품질까지 매번 사람이 리뷰하고 싶지는 않았다. 그래서 자동 게이트로 대신하게 했고, 세 단계로 나눴다.

1. **규칙을 텍스트로 명문화한다.** `AGENTS.md`에 벡터 DB 금지, KGCP는 별표 4(별표 1 아님), OCR 금지, 근거 없는 답변 금지, 답변 LLM은 기본 발췌·유료면 GPT-5.4 nano 같은 제약을 적어두고, AI 에이전트가 매번 이걸 참조하게 했다.
2. **자동 게이트로 강제한다.** TypeScript strict, ESLint, Vitest 단위 테스트를 `npm run verify`로 묶어 git push 훅에 걸었다. 하나라도 실패하면 푸시 자체가 안 된다.
3. **구현이 끝나는 시점에 교차 검증한다.** Claude Code의 Stop 훅으로 구현이 끝날 때마다 git diff를 다른 모델(Gemini)에게 자동으로 검토시키고, 문제가 있으면 `{decision: "block"}`으로 재수정을 강제한다(`.claude/hooks/stop-review.mjs`).

AI가 만든 코드를 믿고 쓰는 게 아니라, 이 게이트를 통과하지 못하면 아예 반영이 안 되는 구조를 만드는 데 초점을 맞췄다.

### SEO와 성능, 둘 다 잡으려다 생긴 트레이드오프

검색형 앱은 크롤러에게 보여줄 텍스트가 없어서 SEO에 약하다. 그래서 모든 페이지를 `force-dynamic`으로 서버 렌더링했더니, 이번엔 라우트 캐시와 `<Link>` 프리페치가 꺼지면서 체감 속도가 눈에 띄게 떨어졌다. 결국 가이드라인 문서 목록과 조항 페이지를 ISR(`revalidate = 3600`)로 바꾸고, 시드 로직은 `instrumentation.ts`의 `register()`로 옮겨 프로세스가 부팅될 때 딱 한 번만 돌게 했다. 빌드 단계(`NEXT_PHASE=phase-production-build`)에서는 시드를 아예 돌리지 않는다.

## 겪은 어려움과 돌파 과정

### 1) 조항 페이지를 빌드타임에 전부 생성했더니 배포가 오래 걸렸다

**상황.** SEO를 위해 `generateStaticParams`로 조항 페이지를 전부 정적 생성하게 했다. 문제는 빌드할 때마다 약 1,000개 페이지와 전체 임베딩 테이블을 다시 읽어야 한다는 것. 배포 시간도, 빌드 비용도 같이 늘었다.

**돌파.** 모든 조항을 빌드타임에 만들 필요는 없었다. `clauseStaticParams()`가 의도적으로 빈 배열을 반환하게 바꾸고, 조항 페이지는 `dynamicParams = true`와 ISR로 첫 요청이 들어올 때만 생성되게 했다. URL은 `sitemap.xml`에 담아 크롤러가 알아서 찾아가게 두면 그만이었다. 이 결정은 커밋 메시지와 코드 주석에 남겨서, 나중에 또 "전부 SSG로 돌리자"는 얘기가 나오지 않게 해뒀다.

### 2) 벡터 DB를 안 쓴다면 근거가 뭐냐

**상황.** 초기 설계 단계에서 "문서 수가 적으니 벡터 DB는 불필요하다"라고 그냥 써버릴 뻔했다. 다시 보니 이건 근거가 아니라 그냥 느낌이었다.

**돌파.** 100/1,000/10,000/100,000 청크 기준으로 브루트포스와 ANN 계열을 직접 벤치마킹해서 `BENCHMARK.md`에 수치를 남기고, 전환 임계치(청크 5,000개 또는 500ms)를 코드 주석으로 박아뒀다. "안 쓴다"가 아니라 "이 수치까지는 안 쓴다"로 문장을 고친 셈이다.

### 3) LLM 비용 통제

**상황.** 실제로 쓰인다면 CRA들이 감사추적, SAE 보고기한처럼 겹치는 질문을 반복해서 던질 텐데, 그때마다 임베딩과 LLM API를 다시 호출하는 건 느리고 낭비다. 채팅 모델을 기본값으로 켜두면 한도 안에서도 비용이 튈 수 있었다.

**돌파.**

1. 질문을 정규화한 뒤 정확히 캐시에 걸리면 임베딩·LLM 호출과 일일 한도 체크를 전부 건너뛴다. 유사도 캐시 임계치는 느슨하게 잡지 않았다.
2. IP별 하루 새 질문 5건, 전체 하루 50건으로 호출량 자체를 막아뒀다.
3. 채팅 모델은 기본적으로 꺼두고 발췌로 대체한다. 유료로 켤 때만 GPT-5.4 nano.

## 결과 — 측정 가능한 지표

- **검색 정확도:** 6개 핵심 질문(감사추적, 서면동의, 모니터링 범위, 민감정보, 의료기기 승인, SAE 보고기한)에서 top-1 조항 정확 일치와, 일부러 심은 노이즈 조항 배제를 회귀 테스트로 고정(`tests/retrieval-gold.test.ts`, `tests/search-quality.test.ts`).
- **검색 성능:** 실제 코퍼스 721청크 기준 브루트포스 유사도 검색이 약 2ms. 500ms 임계치와 비교하면 250배쯤 여유가 있다. 벡터 DB 없이도 서비스 수준 응답 속도가 나온다.
- **코드 품질:** 단위 테스트 142개 통과, lint·타입체크 에러 0개. `AGENTS.md` 스펙 → `npm run verify` push 훅 → Stop 훅 교차 검토, 이 세 단계를 다 통과하지 못하면 AI가 만든 코드도 반영되지 않는다.
- **콘텐츠 규모:** `sitemap.xml` 기준 253개 URL, 그중 약 240개가 조항 단위 페이지다. ICH E6(R2) 전문(4만자 이상)과 국내 별표 4(KGCP) 전문(8천자 이상)을 발췌 파이프라인으로 적재했고, 이 기준은 `tests/corpus-coverage.test.ts`로 고정해뒀다.
- **SEO/성능:** `force-dynamic`에서 ISR로 옮기면서 라우트 캐시와 프리페치를 되살렸다. 문서·조항 페이지는 빌드 때 만들지 않고 첫 요청 이후 1시간 ISR로 캐시한다.
- **비용 통제:** IP별 일 5건, 전체 일 50건으로 새 질문 수를 제한한다. 같은 질문은 캐시로 응답하고 한도에도 안 들어간다. 답변 LLM은 기본이 0원, 유료 nano에 한도 상한까지 걸어도 월 1달러대다.
- **운영 자동화:** 개정 감지부터 재임베딩, 캐시 무효화(`revalidatePath`), 관리자 대시보드 로그까지 사람이 손댈 일 없이 돌아간다.

## 실질적 도움

CRA·QA·RA가 "이 절차가 근거가 있나"를 확인할 때, 여러 사이트를 돌아다니며 PDF를 여는 대신 그냥 자연어로 물어보면 된다. 가이드라인과 법령 조항을 함께 찾아 출처와 원문 링크를 붙여준다. 답변은 항상 적재된 조항에 근거하고, 근거가 없으면 답 대신 거절한다. 공식 해석이 아니라는 면책 고지와 원문 링크도 같이 붙여서 오용 위험을 줄였다.

검색창 아래 프리셋과, 브라우저에 남은 최근 질문으로 다시 검색할 수 있다. 답변 카드에는 답변 탭과 원문 탭이 따로 있어서, 영어 조항이 있으면 답변은 한국어로 먼저 보여주고 원문 보기로 영어도 확인할 수 있게 했다. 도움이 됐는지는 도움됨/도움되지 않음으로 남길 수 있고, 이 기록은 구글 시트(Apps Script 웹앱)로 쌓인다.

문서가 개정될 때마다 사람이 원문 사이트를 재방문해서 버전을 비교하던 일도 있었다. 그걸 날짜·해시 이중 신호로 자동 감지해서 개정 이력 피드로 바꿨다. 회사 내부에서 사람이 반복하던 관리 업무를 자동화한 거라고 보면 된다.

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

이후 http://127.0.0.1:43123 에서 확인하면 된다. API 키가 없어도 시드 문서와 시드 조문으로 검색, 개정 피드, 한국어 보기는 그대로 동작한다. 답변은 발췌로 나온다. 합성 답을 붙이고 싶으면 채팅 API 키를 넣으면 되고, 모델은 GPT-5.4 nano다. 국가법령정보센터 현행 본문을 매일 다시 받고 싶다면 `LAW_OC`를 넣는다.

```bash
npm run verify   # lint + unit test + production build. git push 훅이 이 명령을 쓴다
npm run bench    # 벡터 검색을 안 쓰기로 한 이유는 BENCHMARK.md에 있다
```

## 데이터 모델

가이드라인과 법령은 처음부터 테이블을 나눴다. 가이드라인은 `documents` → `document_versions` → `chunks` 순서고, 개정은 발행일과 파일 해시(SHA-256)로 식별한다. 법령은 `statutes` → `statute_revisions` → `statute_articles` 순서고, 개정은 법령일련번호(MST)·공포일·시행일·제개정구분으로 식별한다. 왜 이력 테이블 구조까지 다르냐면, 두 문서군이 개정을 알리는 방식 자체가 다르기 때문이다. `0002_statutes.sql`에도 법령은 `file_hash`를 쓰지 않는다고 적혀 있다.

`chunks.embedding`과 `statute_articles.embedding`은 pgvector 컬럼이 아니다. jsonb float 배열이다. `0001_init.sql`부터 vector 컬럼을 만들지 말라고 못 박아뒀고, 전환 조건(청크 5,000개 초과 또는 유사도 계산 500ms 초과)은 `BENCHMARK.md`, `lib/retrieval/cosine.ts`와 같다. 지금 규모에서는 브루트포스 cosine이 그 임계치보다 자릿수가 다를 만큼 빠르다는 게 근거다.

옛 청크와 조문은 지우지 않는다. `chunks`와 `statute_articles` 모두 `is_current`로 현재 버전만 표시하고, 이전 행은 버전 이력과 단락 diff를 위해 그대로 둔다.

`change_log`도 처음부터 지금 모습은 아니었다. 원래는 `document_id`가 `documents`만 참조했는데, 법령을 추가하면서(`0002_statutes.sql`) 이 FK를 없애고 `entity_kind` 컬럼을 넣었다. 그래서 지금은 같은 테이블이 문서 id와 법령 id를 함께 가리킬 수 있다.

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

이미 https://gcp-guidance-search.vercel.app 에 올라가 있다. 키가 없어도 시드 문서로 검색, 개정 피드, 한국어 보기는 된다. Vercel 빌드 명령은 `next build`뿐이고, lint와 테스트는 git push 훅(`npm run verify`)에서 미리 막는다. 문서와 조항 페이지는 빌드 때 전부 만들지 않고, 첫 요청 이후 1시간 ISR로 캐시한다. 물론 `sitemap.xml`에는 이 URL들이 다 들어간다.

검색은 IP당 하루 새 질문 5건, 전체 하루 50건까지만 된다. 같은 질문은 캐시에서 다시 열리니까 한도에는 안 들어간다. Vercel 환경변수 `RATE_LIMIT_IP_DAILY`, `RATE_LIMIT_GLOBAL_DAILY`를 넣으면 그 값이 코드 기본값보다 우선한다.

의견을 구글 시트에 남기고 싶다면 시트를 하나 만들고 `scripts/feedback-sheet.gs`를 Apps Script 웹앱으로 배포한 다음, Vercel에 `FEEDBACK_SHEETS_WEBHOOK_URL`을 넣으면 된다.

검색엔진과 AI 크롤러를 위해 `robots.txt`, `sitemap.xml`, `/llms.txt`, Open Graph를 제공한다. `sitemap.xml`에는 문서 목록뿐 아니라 조항별 페이지(`/documents/[id]/[section]`)도 들어간다. 홈에는 자주 찾는 질문의 근거 조항 요약이 서버에서 렌더링된다.

배포 후에는 Google Search Console에서 색인을 다시 요청하는 게 좋다.

1. [Search Console](https://search.google.com/search-console)에서 속성 `https://gcp-guidance-search.vercel.app`을 연다.
2. Sitemaps에 `https://gcp-guidance-search.vercel.app/sitemap.xml`을 다시 제출한다.
3. URL 검사에 홈(`/`), `/documents`, 조항 페이지 하나를 넣고 색인 생성을 요청한다.
4. `site:gcp-guidance-search.vercel.app` 결과가 비어 있으면, 며칠 두고 다시 본다.

합성 답을 켜려면 채팅 API 키를 넣고 재배포하면 그만이다. 모델은 GPT-5.4 nano. 임베딩만 올리려면 `OPENAI_API_KEY`만 있어도 충분하다. 법령 실시간 개정 조회에는 `LAW_OC`가 필요하고, 월 한도는 각 API 콘솔에서 걸어두는 편이 안전하다. `CRON_SECRET`을 넣으면 매일 도는 개정 확인 크론이 그 값으로만 실행되고, 안 넣으면 Vercel 크론의 User-Agent만 통과시킨다. 그리고 Supabase — 이건 재검증 이력만이 아니라 문서·청크·검색 로그를 포함한 데이터 전체가 배포 사이에도 남게 해주는, 이 프로젝트의 유일한 영속 저장소다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만 발췌)
- [국가법령정보센터 Open API](https://open.law.go.kr) — 현행법령 JSON. KGCP는 「의약품 등의 안전에 관한 규칙」 **별표 4** (별표 1 GMP 아님)

스캔본 PDF는 아직 OCR을 붙이지 않아서 텍스트 추출이 안 된다. 이건 공식 해석이 아니니, 답변만 믿지 말고 링크로 원문을 한 번 더 확인해보길 권한다.
