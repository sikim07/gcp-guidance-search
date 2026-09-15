const PAIRS: Array<[RegExp, string]> = [
  [/감사추적/g, "audit trail 감사추적"],
  [/전자서명/g, "electronic signature 전자서명 part 11"],
  [/전자기록/g, "electronic records 전자기록 part 11"],
  [/원자료|원본기록/g, "source data source documents 원자료"],
  [/모니터링/g, "monitoring risk-based 모니터링"],
  [/동의/g, "informed consent 시험대상자 동의"],
  [/검증|밸리데이션/g, "validation 검증"],
  [/필수문서/g, "essential documents TMF 필수문서"],
  [/이탈/g, "protocol deviation 이탈"],
  [/이상반응|sae/gi, "serious adverse event 중대한 이상반응"],
];

/** Expand Korean regulatory terms so they retrieve English FDA chunks. */
export function expandQuery(query: string): string {
  let expanded = query;
  for (const [pattern, extra] of PAIRS) {
    if (pattern.test(query)) expanded = `${expanded} ${extra}`;
    pattern.lastIndex = 0;
  }
  return expanded;
}
