# GCP 가이드라인 검색기

사이드 프로젝트 · skim88.1942@gmail.com

**한줄 요약.** 임상시험 규제 문서(ICH GCP, FDA 가이던스, 식약처 안내서, 관련 법령)가 여러 사이트에 흩어져 있고 수시로 개정되는 문제를, 자연어 검색 + 자동 개정 감지 파이프라인으로 풀어본 개인 프로젝트다. 프론트엔드부터 백엔드(임베딩·검색 랭킹·개정 감지 배치), 인프라(캐시 전략·비용 통제), 운영(자동 코드 리뷰 파이프라인)까지 혼자 설계하고 만들었다.

- 레포: https://github.com/sikim07/gcp-guidance-search
- 서비스: https://gcp-guidance-search.vercel.app

## 배경 — 어떤 문제를 발견했는가

현장(CRA/QA/RA)에서는 "이 절차가 GCP나 식약처 기준에 근거가 있나?"를 확인해야 할 일이 수시로 생긴다. 문제는 근거가 한 곳에 있지 않고 ICH, FDA 가이던스, 식약처 민원인안내서, 국내 법령(약사법, 의료기기법 등)에 흩어져 있고, 각 문서는 수시로 개정되는데 어느 것이 현행본인지는 직접 원문 사이트를 일일이 다니며 확인해야 알 수 있다.

실제로 회사 내부에도 이 개정 현황을 사람이 직접 모니터링해서 정리해 공유하는 페이지가 따로 있을 정도로, "개정 여부를 추적하고 근거 조항을 찾는 일"은 이 도메인에서 공통적으로 존재하는 수작업이다. 이를 자동화할 수 있겠다고 판단해 시작했다.

이 프로젝트는 공개 규제 문서(FDA, 식약처, 국가법령정보센터)만을 대상으로 하고, 환자 개인정보나 임상적 판단은 다루지 않는다.

지금 들어가 있는 가이드라인은 ICH E6(R2) 전문, E6(R3) 발췌, Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서, 안전성 보고 기한 발췌다. 법령은 개인정보 보호법, 의료기기법, 약사법, 첨단재생바이오법, 「의약품 등의 안전에 관한 규칙」 **별표 4 KGCP 전문**이다.

E6(R2)와 별표 4는 `scripts/refresh-seed-corpus.ts`가 `lib/pipeline/fetch.ts`·`parse-pdf.ts`·법령 Open API로 받은 원문을 `lib/pipeline/seed/extracted/`에 두고 시드가 그 파일을 읽는다. 조항을 손으로 옮겨 적지 않는다.

```bash
npx tsx scripts/refresh-seed-corpus.ts   # FDA가 막히면 ICH E6(R2) PDF로 받고, LAW_OC로 별표 4를 받음
```

## 기술적 의사결정

### 전체 구조

개정 감지 파이프라인(크롤·API·법령 API → 청크·임베딩 → 저장)을 핵심으로 놓고, 그 위에 검색/답변 화면을 올렸다. FE는 Next.js App Router(React 19), BE는 Vercel Serverless Functions + Vercel Cron, 저장은 Supabase(Postgres), 관리자 화면은 `/admin` 대시보드로 구성했다.

### 벡터 DB 대신 브루트포스 (실증 기반)

임상시험 규제 문서는 수백~수천 청크 그대로를 유지하므로, "당연히 벡터 DB를 써야 한다"는 통념을 그대로 받아들이지 않고 직접 벤치마크(100/1,000/10,000/100,000 청크 기준 브루트포스 vs ANN)를 돌려 `BENCHMARK.md`로 근거를 남겼다. 실제 코퍼스 721개 기준 브루트포스 cosine 유사도 계산이 2ms 내외로 임계치(500ms)보다 자릿수가 다른 만큼(약 250배) 빠르다는 걸 확인하고, 전환 조건(청크 5,000개 또는 검색 500ms 초과)을 코드 주석과 `AGENTS.md`에 명문화해 이후에도 근거 없이 되돌리지 않도록 못박았다.

### 조항 단위 청킹 + 검색 품질 튜닝

문단 단위가 아니라 조항(제 N조, 별표 N, dotted clause number, Q&A 번호) 단위로 청킹해야 "이 조항이 답이다"를 정확히 집을 수 있다. 단순 임베딩 유사도만으로는 ICH·FDA 가이던스에 흔한 로마숫자 목차(I, II, III…), BACKGROUND·INTRODUCTION 같은 절 제목, 각주 주소, 목차성 문장이 본문 조항보다 상위로 잘못 잡히는 것을 확인하고, 조항번호 정확 일치 가중치(`sectionBoost`)와 노이즈 패널티(`qualityPenalty`)를 직접 만들어 보정했다. 이 로직은 6개 프리셋 질문 + 의도적으로 심은 노이즈 조항을 포함한 골드 테스트(`tests/retrieval-gold.test.ts`)로 회귀 검증된다.

### 이중 신호 개정 감지

가이드라인은 고시일 또는 파일 해시(SHA-256)로, 법령은 법령일련번호(MST)·공포일·시행일로 개정을 이중 추적한다. 변경이 감지되면 단락 단위 diff로 바뀐 조항만 찾아 그 부분만 재임베딩하고, 변경 이력을 `/updates` 피드로 노출한다. 전체 문서를 매번 재임베딩하지 않아도 되는 것이 핵심 설계 목표였다.

### LLM은 기본 끄고, 켤 때는 가장 싼 모델만

검색의 핵심은 랭킹이지 긴 추론이 아니다. 답변은 적재된 조항 2~3개를 근거로 두세 문장만 쓰면 된다. 그래서 채팅 API 키 없이도 제품이 돌아가게 했다.

- 답변: 키가 없으면 조항 발췌 + 시드 한국어 룩업
- 번역: 시드 한국어 → 없으면 공개 기계 번역(규제 용어 후처리)
- 임베딩: `OPENAI_API_KEY`가 있으면 `text-embedding-3-small`, 없으면 결정적 mock 벡터

유료 합성을 붙일 때는 **GPT-5.4 nano**(입력 $0.20 / 출력 $1.25 per 1M 토큰)를 쓴다. 같은 작업에 Claude Haiku 4.5는 입력이 약 5배, Sonnet·Opus는 이 제품에 맞지 않는다. GPT-5 mini는 nano가 한국어·출처 형식을 자주 깨는 경우에만 한 단계 올린다.

### 자동 코드 검증 파이프라인

구현을 AI 에이전트(Cursor)에 맡기면서도 품질을 스스로 담보하기 위해, Claude Code의 Stop 훅으로 구현이 종료될 때마다 git diff를 다른 모델(Gemini)에게 자동으로 교차 검토하고, 문제가 있으면 `{decision:"block"}`로 강제로 재수정하도록 했다(`.claude/hooks/stop-review.mjs`). TypeScript strict, ESLint, Vitest를 `npm run verify`로 묶어 git push 훅으로 강제했다.

### SEO·성능 트레이드오프

검색형 앱은 크롤러에게 보여줄 텍스트가 없어 SEO에 취약하다. 모든 페이지를 `force-dynamic`으로 서버렌더링했더니 라우트 캐시와 `<Link>` 프리페치가 꺼져 체감 속도가 떨어지는 대가를 치렀다. 가이드라인 문서 목록과 조항 페이지를 ISR(`revalidate = 3600`)으로 전환하고, 시드 로직은 `instrumentation.ts`의 `register()`로 프로세스 부팅 시점으로 분리해 렌더링과 거리를 둔다. 빌드 단계(`NEXT_PHASE=phase-production-build`)에서는 시드를 돌리지 않는다.

## 겪은 어려움과 돌파 과정

### 1) 조항 페이지를 빌드타임에 전부 생성했더니 배포가 오래 걸렸다

**상황.** SEO를 위해 `generateStaticParams`로 조항 페이지를 전부 정적 생성하도록 했더니, 빌드 때마다 약 1,000개 페이지와 전체 임베딩 테이블까지 다시 읽어 들여 배포 시간이 길어지고 빌드 비용도 커졌다.

**돌파.** 모든 조항을 빌드타임에 만들 필요가 없다고 판단해, `clauseStaticParams()`가 의도적으로 빈 배열을 반환하도록 바꾸고 조항 페이지는 `dynamicParams = true` + ISR로 첫 요청 시에만 생성되게 했다. 모든 URL은 `sitemap.xml`에 따로 담아 크롤러가 찾아가게 했다. 이 결정은 커밋 메시지와 코드 주석에 남겨 이후 회귀를 막았다.

### 2) 벡터 DB를 안 쓴다면 근거가 뭐냐

**상황.** 초기 설계에서 "문서 수가 적으니 벡터 DB는 불필요하다"라고 말하려다, 근거 없는 주장이라는 것을 깨달았다.

**돌파.** 100/1,000/10,000/100,000 청크 기준으로 브루트포스 vs ANN 계열을 벤치마킹해 `BENCHMARK.md`에 수치로 남기고, 전환 임계치(청크 5,000개 또는 500ms)를 코드 주석으로 박아 두었다. "안 쓴다"가 아니라 "이 수치까지는 안 쓴다"로 바꿨다.

### 3) LLM 비용 통제

**상황.** 실제로 쓰인다면 CRA들이 겹치는 질문(감사추적, SAE 보고기한 등)을 반복해서 던질 텐데, 그때마다 임베딩·LLM API를 다시 호출하면 응답도 느려지고 비효율적이다. 비싼 채팅 모델을 기본값으로 두면 한도 안에서도 비용이 커진다.

**돌파.**

1. 질문 정규화 후 정확 캐시 히트면 임베딩·LLM·일일 한도를 건너뛴다. 유사도 캐시 임계치는 느슨하게 잡지 않는다.
2. IP별 하루 새 질문 5건, 전체 하루 50건으로 호출량 상한을 둔다.
3. 채팅 모델은 기본 비활성(발췌). 유료로 켤 때는 GPT-5.4 nano만 쓴다.

한도를 꽉 채운 달(신규 검색 약 1,500회)에도 nano 합성은 대략 1달러대다. Haiku를 같은 한도에 쓰면 입력이 약 5배다.

## 결과 — 측정 가능한 지표

- **검색 정확도:** 6개 핵심 질문(감사추적, 서면동의, 모니터링 범위, 민감정보, 의료기기 승인, SAE 보고기한)에 대해 top-1 조항 정확 일치 + 의도적으로 심은 노이즈 조항 배제를 회귀 테스트로 고정(`tests/retrieval-gold.test.ts`, `tests/search-quality.test.ts`).
- **검색 성능:** 실제 코퍼스 721청크 기준 브루트포스 유사도 검색 약 2ms — 500ms 임계치 대비 약 250배 여유. 벡터 DB 없이 서비스 수준 응답 속도.
- **코드 품질:** 단위 테스트 142개 통과, lint·타입체크 에러 0. Stop 훅으로 AI 구현 커밋이 다른 모델의 교차 검토를 거치도록 강제.
- **콘텐츠 규모:** `sitemap.xml` 기준 253개 URL, 그중 약 240개가 조항 단위 페이지. ICH E6(R2) 전문(4만자 이상), 국내 별표 4(KGCP) 전문(8천자 이상)을 발췌 파이프라인으로 적재하고 `tests/corpus-coverage.test.ts`로 고정.
- **SEO/성능:** `force-dynamic` → ISR로 라우트 캐시와 프리페치 복구. 조항 전체 SSG 제거로 빌드 정적 페이지 약 1,000개 → 33개.
- **비용 통제:** IP별 일 5건·전체 일 50건 새 질문. 동일 질문은 캐시로 응답하고 한도에 넣지 않음. 답변 LLM은 기본 $0. 유료 nano + 한도 상한이면 월 약 1달러대.
- **운영 자동화:** 개정 감지부터 재임베딩, 캐시 무효화(`revalidatePath`), 관리자 대시보드 로그까지 사람 개입 없이 돌아가는 파이프라인.

## 실질적 도움

CRA·QA·RA가 "이 절차가 근거가 있나"를 확인할 때 여러 사이트를 돌아다니며 PDF를 여는 대신, 자연어로 질문하면 가이드라인·법령 조항을 함께 찾아 출처와 원문 링크를 붙여 준다. 답변은 항상 적재된 조항에 근거하며(근거 없는 질문은 거절), 공식 해석이 아니라는 면책 고지와 원문 링크를 함께 녹여 오용 위험을 줄였다.

검색창 아래 프리셋과 이 브라우저에 남은 최근 질문으로 다시 넣을 수 있다. 답변 카드에는 **답변 / 원문** 탭이 있다. 영어 조항이 있으면 답변은 한국어로 먼저 나오고, **원문 보기**로 영어를 볼 수 있다. 도움이 됐는지는 **도움됨 / 도움되지 않음**으로 남길 수 있고, 저장은 구글 시트(Apps Script 웹앱)로 간다.

문서가 개정될 때마다 사람이 원문 사이트를 재방문해 버전을 비교하던 작업을, 날짜·해시 이중 신호로 자동 감지해 개정 이력 피드로 바꿨다. 회사 내부에서 사람이 반복하던 관리 업무와 같은 일을 자동화한 결과다.

## 기술 스택 요약

| 계층 | 기술 | 역할 |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind, HeroUI | 검색/답변 UI, ISR 페이지, View Transition 기반 페이지 전환 |
| Backend | Vercel Serverless Functions, Vercel Cron | 검색/번역/피드백 API, 일별 개정 감지 배치 |
| Data | Supabase (Postgres). 없으면 로컬 JSON | 문서·청크·법령조문·버전 이력·검색 로그 |
| AI/검색 | OpenAI 임베딩(`text-embedding-3-small`, 선택), 브루트포스 cosine, 발췌 답변. 유료 합성은 GPT-5.4 nano | 질문 임베딩, 근거 기반 답변. Haiku/Sonnet/Opus는 쓰지 않음 |
| 외부 연동 | FDA/ICH, 식약처, 국가법령정보센터(law.go.kr) Open API | 원문 수집 · 법령 현행본/개정 이력 |
| 품질 게이트 | TypeScript strict, ESLint, Vitest, Claude Code Stop 훅 | 단위 테스트 142개, 구현 완료 시점 교차 검토 |
| 운영 | 시드 버전 이력·`BENCHMARK.md`, `/admin`, sitemap/robots/llms.txt | 의사결정 근거, 운영 가시성, SEO |

## 실행해보기

```bash
npm install
cp .env.example .env.local
npm run dev
```

이후 http://127.0.0.1:43123 에서 확인할 수 있다. API 키가 없어도 시드 문서·시드 조문으로 검색, 개정 피드, 한국어 보기는 돌아간다. 답변은 발췌다. 합성 답을 붙일 때는 채팅 API 키를 넣고, 모델은 GPT-5.4 nano를 쓴다. 국가법령정보센터 현행 본문을 매일 다시 받으려면 `LAW_OC`를 넣는다.

```bash
npm run verify   # lint + unit test + production build. git push 훅이 이 명령을 쓴다
npm run bench    # 벡터 검색을 안 쓰기로 한 이유는 BENCHMARK.md
```

## Vercel

이미 https://gcp-guidance-search.vercel.app 에 올라가 있다. 키 없이 시드 문서로 검색·개정 피드·한국어 보기는 된다. Vercel 빌드 명령은 `next build`다. lint·테스트는 git push 훅(`npm run verify`)에서 막는다. 조항 페이지는 빌드 때 전부 만들지 않고, 첫 요청 이후 1시간 ISR로 캐시한다. `sitemap.xml`에 URL은 그대로 들어간다.

검색은 IP당 하루 **새 질문 5건**, 전체 하루 50건이다. 같은 질문은 캐시에서 다시 열리며 한도에 들어가지 않는다. Vercel 환경변수 `RATE_LIMIT_IP_DAILY` / `RATE_LIMIT_GLOBAL_DAILY`가 있으면 그 값이 코드 기본값보다 이긴다.

의견을 구글 시트에 남기려면 시트를 하나 만들고 `scripts/feedback-sheet.gs`를 Apps Script 웹앱으로 배포한 다음, Vercel에 `FEEDBACK_SHEETS_WEBHOOK_URL`을 넣는다.

검색엔진·AI 크롤러용 `robots.txt`, `sitemap.xml`, `/llms.txt`, Open Graph를 제공한다. `sitemap.xml`에는 문서 목록뿐 아니라 **조항별 페이지**(`/documents/[id]/[section]`)도 들어간다. 홈에는 자주 찾는 질문의 근거 조항 요약이 서버에서 렌더링된다.

배포 후 Google Search Console에서 색인을 다시 요청한다.

1. [Search Console](https://search.google.com/search-console)에서 속성 `https://gcp-guidance-search.vercel.app`을 연다.
2. Sitemaps에 `https://gcp-guidance-search.vercel.app/sitemap.xml`을 다시 제출한다.
3. URL 검사에 홈(`/`), `/documents`, 조항 페이지 하나를 넣고 **색인 생성 요청**을 보낸다.
4. `site:gcp-guidance-search.vercel.app` 결과가 비어 있으면 위 요청 이후 며칠을 두고 다시 본다.

합성 답을 켜려면 채팅 API 키를 넣고 재배포한다. 모델은 GPT-5.4 nano. 임베딩만 올리려면 `OPENAI_API_KEY`만으로 충분하다. 법령 실시간 개정 조회는 `LAW_OC`다. 월 한도는 각 콘솔에서 거는 게 안전하다. `CRON_SECRET`을 넣으면 매일 개정 확인 크론이 그 값으로만 돌고, 없으면 Vercel 크론 User-Agent만 통과한다. 개정 기록을 서버 재시작 뒤에도 남기려면 Supabase가 필요하다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만 발췌)
- [국가법령정보센터 Open API](https://open.law.go.kr) — 현행법령 JSON. KGCP는 「의약품 등의 안전에 관한 규칙」 **별표 4** (별표 1 GMP 아님)

스캔본 PDF는 아직 OCR을 붙이지 않아서 텍스트 추출이 안 된다. 이건 공식 해석이 아니다. 답변만 믿지 말고 링크로 원문을 한 번 더 확인하는 것을 권한다.
