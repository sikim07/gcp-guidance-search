# Claude Code 구현 프롬프트 (세션 분할용)

확정된 스펙을 단계별 프롬프트로 고정한다. 새 세션을 열 때 해당 단계만 붙여 넣는다.

## 0단계 — 전체 개요 (세션 시작 시 1회)

프로젝트 본질은 검색이 아니라 개정 감지 파이프라인이다. 우선순위: 개정 감지 > 검색/답변 > UI.

스택: Next.js + TypeScript strict, Vercel, Supabase Postgres, OpenAI text-embedding-3-small, Claude Haiku. 벡터DB 금지. 청크 5,000 또는 유사도 500ms 초과 시에만 pgvector 검토.

비용: IP/전역 일일 한도, 제공사 월 한도, 반복 질문 캐시.

0-1에서 Stop 훅을 먼저 심는다.

## 0-1단계 — Stop 훅

`.claude/settings.json` Stop 훅 → `node .claude/hooks/stop-review.mjs`

- 세션 diff를 Gemini 또는 GPT-4에 전달
- 고정 프롬프트: 버그, 타입 불일치, 엣지케이스 검토
- 심각하면 `{ "decision": "block", "reason": "..." }`
- 결과는 `.claude/review-log.jsonl` 에 누적
- API 키는 환경변수, 키 없으면 통과

구현 파일: `.claude/hooks/stop-review.mjs`

## 1단계 — 문서 수집

소스별 파서 분리 (`fda-parser.ts`, `mfds-parser.ts`, `kgcp-parser.ts`). 신규 문서는 PDF SHA-256 저장. 이번 단계에서 임베딩 없음.

시드 6종: E6(R2), Electronic Systems/Records/Signatures Q&A, Electronic Source Data, Part 11 Scope and Application, Risk-Based Approach to Monitoring, Informed Consent + 식약처 KGCP 관련.

픽스처 HTML 유닛 테스트 필수.

## 2단계 — 청크·임베딩·벤치마크

조항 단위 청크. 임베딩은 jsonb/real[]. `scripts/bench-cosine.ts` 로 100/1k/10k/100k 측정, `BENCHMARK.md` 생성. 브루트포스 함수 채택.

## 3단계 — 검색 API

`POST /api/search` → 임베딩 → 브루트포스 top-N → Haiku. 청크 외 근거 금지, 문장마다 출처. 응답 `{ answer, sources }`. IP 20 / 전역 200 (환경변수). query_cache. 프롬프트 인젝션·무관 질문 테스트.

## 4단계 — 챗 UI + 피드백

질문, 답변, 출처, 로딩, 👍/👎. Playwright로 입력→답변→피드백.

## 5단계 — 개정 파이프라인 (핵심)

신규 URL/제목 감지. 날짜 1차, SHA-256 2차. 조항 diff 후 변경 조항만 재임베딩. `document_versions` + `change_log`. Vercel Cron 매일 1회. Slack/이메일 알림. 날짜만/내용만/둘 다 아님 통합 테스트.

## 6단계 — 배포 준비

README, mermaid, 벤치마크 링크, `/admin` 로그, 2–3주 실사용 가능 상태 점검.
