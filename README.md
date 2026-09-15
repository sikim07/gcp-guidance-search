# GCP 가이드라인 검색기

쓰는 곳: https://gcp-guidance-search.vercel.app

EDC 프론트를 만들다 보면 필드 검증이든 감사추적이든, “이거 GCP나 식약처에 근거가 있나?”를 자주 찾게 됩니다. 문서는 FDA ICH, FDA 가이던스, 식약처 안내서, KGCP에 흩어져 있고 개정되면 예전에 열어둔 PDF가 맞는지부터 불안합니다.

검색창보다 먼저 만들고 싶었던 건 **문서가 바뀌었는지 알아채는 쪽**입니다. 그다음에 자연어로 조항을 물어보는 화면이 붙습니다.

## 뭐가 되나요

- FDA / 식약처 / 법령 목록을 다시 받아서 새 문서·개정(고시일 또는 파일 해시)을 남깁니다.
- “전자기록 감사추적에 뭘 남기나?”처럼 물으면 적재된 조항만 근거로 답하고, 문서·조항·원문 링크를 같이 줍니다.
- 공식 해석이 아닙니다. 답만 보지 말고 링크의 원문을 확인하면 됩니다.

지금은 ICH E6(R2), Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서, KGCP 별표 4 정도를 넣어 둔 상태입니다.

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://127.0.0.1:43123 를 엽니다. API 키가 없어도 시드 문서로 검색이랑 개정 피드는 돌아갑니다. 답변을 제대로 쓰려면 `.env.local`에 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`를 넣으면 됩니다.

```bash
npm test
npm run bench   # 벡터 검색을 안 쓰는 이유, BENCHMARK.md
```

## Vercel

공개 주소는 https://gcp-guidance-search.vercel.app 입니다. GitHub `main`에 푸시하면 다시 배포됩니다.

키 없이 시드 문서로 검색·개정 피드는 됩니다. 답변을 키로 돌리려면 Vercel 프로젝트 Environment Variables에 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`를 넣고 재배포하면 됩니다. 월 한도는 각 콘솔에서 거는 게 안전합니다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만)
- [국가법령정보센터](https://www.law.go.kr) — 의약품 등의 안전에 관한 규칙 **별표 4** (별표 1 GMP 아님)

스캔된 PDF는 아직 OCR하지 않습니다.
