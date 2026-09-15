# GCP 가이드라인 검색기

공개 주소: https://gcp-guidance-search.vercel.app

임상 데이터를 다루다 보면 필드 검증이든 감사추적이든 "이거 GCP나 식약처에 근거가 있나?"를 찾아볼 일이 자주 생깁니다. 문제는 그 근거가 FDA ICH, FDA 가이던스, 식약처 안내서, KGCP로 흩어져 있고, 개정이라도 되면 예전에 열어둔 PDF가 여전히 맞는 버전인지부터 불안해진다는 겁니다.

그래서 검색창보다 먼저 만든 건 **문서가 바뀌었는지 알아채는 쪽**이었습니다. 자연어로 조항을 물어보는 화면은 그 위에 얹은 것에 가깝습니다.

## 뭘 하는 도구인가

- FDA·식약처 가이드라인은 고시일 또는 파일 해시로, 법령은 법령일련번호(MST)·공포일·시행일로 개정을 기록에 남깁니다. 법령은 PDF 해시를 쓰지 않습니다.
- "전자기록 감사추적은 어떤 항목을 남겨야 하나?" 같은 질문을 하면, 적재된 가이드라인 조항과 법령 조문을 함께 찾아 출처 배지(법령/가이드라인)와 원문 링크를 붙입니다.
- 다만 이건 공식 해석이 아닙니다. 답변만 믿지 말고 링크로 원문을 한 번 더 확인하는 걸 권합니다.

지금 들어가 있는 가이드라인은 ICH E6(R2), Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서입니다. 법령은 개인정보 보호법, 의료기기법, 약사법, 첨단재생바이오법, 「의약품 등의 안전에 관한 규칙」(별표 4 KGCP)입니다.

## 실행해보기

```bash
npm install
cp .env.example .env.local
npm run dev
```

이후 http://127.0.0.1:43123 에서 확인할 수 있습니다. API 키가 없어도 시드 문서·시드 조문으로 검색과 개정 피드는 돌아갑니다. 답변까지 모델로 받으려면 `OPENAI_API_KEY`와 `ANTHROPIC_API_KEY`를 넣습니다. 국가법령정보센터 현행 본문을 매일 다시 받으려면 `LAW_OC`를 넣습니다.

테스트와 벤치마크는 이렇게 돌립니다.

```bash
npm test
npm run bench   # 벡터 검색을 안 쓰기로 한 이유는 BENCHMARK.md에 정리했습니다
```

## Vercel

이미 https://gcp-guidance-search.vercel.app 에 올라가 있습니다. 키 없이 시드 문서로 검색·개정 피드는 됩니다.

답변을 모델로 돌리려면 Vercel 프로젝트 Environment Variables에 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`를 넣고 재배포하면 됩니다. 법령 실시간 개정 조회는 `LAW_OC`입니다. 월 한도는 각 콘솔에서 거는 게 안전합니다. `CRON_SECRET`을 넣으면 매일 개정 확인 크론이 외부에서 함부로 안 돕니다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만 발췌)
- [국가법령정보센터 Open API](https://open.law.go.kr) — 현행법령 JSON. KGCP는 「의약품 등의 안전에 관한 규칙」 **별표 4** (별표 1 GMP 아님)

스캔본 PDF는 아직 OCR을 붙이지 않아서 텍스트 추출이 안 됩니다.
