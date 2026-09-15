<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GCP 가이드라인 검색기

우선순위: 개정 감지 파이프라인 > 검색/답변 품질 > UI.

- 벡터DB / pgvector 컬럼을 추가하지 말 것. 전환 조건은 청크 5,000개 또는 유사도 계산 500ms 초과 (`lib/retrieval/cosine.ts`).
- KGCP는 「의약품 등의 안전에 관한 규칙」 별표 4다. 별표 1(GMP)이 아니다.
- 식약처 m_1060 전체 게시판을 적재하지 말 것. 임상시험 관련만.
- v1에서 OCR하지 말 것.
- 답변은 청크 근거만. 출처(문서, 조항, URL)를 붙일 것.
- Stop 훅과 벤치마크 스크립트를 제거하지 말 것.

