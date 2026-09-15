# GCP 가이드라인 검색기

임상 데이터를 다루다 보면 필드 검증이든 감사추적이든 "이거 GCP나 식약처에 근거가 있나?"를 찾아볼 일이 자주 생깁니다. 문제는 그 근거가 FDA ICH, FDA 가이던스, 식약처 안내서, KGCP로 흩어져 있고, 개정이라도 되면 예전에 열어둔 PDF가 여전히 맞는 버전인지부터 불안해진다는 겁니다.

그래서 검색창보다 먼저 만든 건 **문서가 바뀌었는지 알아채는 쪽**이었습니다. 자연어로 조항을 물어보는 화면은 그 위에 얹은 것에 가깝습니다.

## 뭘 하는 도구인가

- FDA·식약처·법령 목록을 주기적으로 다시 받아와서, 새 문서나 개정 사항(고시일 또는 파일 해시 기준)을 기록에 남깁니다.
- "전자기록 감사추적에 뭘 남겨야 하나?" 같은 질문을 하면, 실제로 적재된 조항만 근거로 답하고 문서·조항·원문 링크를 함께 보여줍니다.
- 다만 이건 공식 해석이 아닙니다. 답변만 믿지 말고 링크로 원문을 한 번 더 확인하는 걸 권합니다.

지금 들어가 있는 문서는 ICH E6(R2), Part 11, eSource, 위험기반 모니터링, Informed Consent, 식약처 ICH GCP 안내서, KGCP 별표 4 정도입니다.

## 실행해보기

```bash
npm install
cp .env.example .env.local
npm run dev
```

이후 http://127.0.0.1:43123 에서 확인할 수 있습니다. API 키가 없어도 시드 문서로 검색과 개정 피드는 그냥 돌아갑니다. 답변까지 제대로 받아보려면 `.env.local`에 `OPENAI_API_KEY`와 `ANTHROPIC_API_KEY`만 넣어주면 됩니다.

테스트와 벤치마크는 이렇게 돌립니다.

```bash
npm test
npm run bench   # 벡터 검색을 안 쓰기로 한 이유는 BENCHMARK.md에 정리했습니다
```

## Vercel에 올리기

GitHub 레포를 Vercel에 Import하면 됩니다. Hobby 플랜으로 충분합니다.

1. https://vercel.com/new 에서 `sikim07/gcp-guidance-search`를 Import
2. Root는 저장소 루트 그대로 두면 됩니다
3. 환경변수는 아래 것만 있으면 일단 사이트는 뜹니다. 키는 나중에 넣어도 괜찮습니다

없어도 되는 값은 없어도 되는 이유까지 같이 적어뒀습니다.

| 이름 | 없어도 되나 | 없으면 어떻게 되나 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 예 | 시드용 목(mock) 임베딩으로 대체됨 |
| `ANTHROPIC_API_KEY` | 예 | 추출형 답변(요약 없이 원문 발췌)으로 대체됨 |
| `CRON_SECRET` | 가능하면 넣기 | 매일 도는 개정 확인 크론이 인증 없이 열려 있게 됨 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 예 | 인스턴스 메모리에만 저장되어, 재시작하면 시드 데이터부터 다시 시작됨 |

키를 실제로 넣을 거면 OpenAI·Anthropic 콘솔에서 월 지출 한도를 걸어두는 걸 추천합니다. 크론 설정은 `vercel.json`에 이미 들어 있습니다.

## 출처

- [FDA ICH](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents)
- [FDA Clinical Trials Guidance](https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents)
- [식약처 민원인안내서](https://www.mfds.go.kr/brd/m_1060/list.do) (임상시험 관련만 발췌)
- [국가법령정보센터](https://www.law.go.kr) — 의약품 등의 안전에 관한 규칙 **별표 4** (별표 1 GMP와 헷갈리지 않도록 주의)

스캔본 PDF는 아직 OCR을 붙이지 않아서 텍스트 추출이 안 됩니다.
