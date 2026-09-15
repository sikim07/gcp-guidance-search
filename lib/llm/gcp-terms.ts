/** Soften public machine translation toward ICH/식약처 wording. */

const REPLACEMENTS: Array<readonly [RegExp, string]> = [
  [/시험대상자의 고지된 동의/g, "시험대상자 동의"],
  [/고지된 동의/g, "시험대상자 동의"],
  [/사전 동의/g, "시험대상자 동의"],
  [/인간 피험자/g, "시험대상자"],
  [/임상시험 피험자/g, "시험대상자"],
  [/피험자/g, "시험대상자"],
  [/조사자\/기관/g, "시험책임자/실시기관"],
  [/조사자는/g, "시험책임자는"],
  [/조사자/g, "시험책임자"],
  [/연구자는/g, "시험책임자는"],
  [/연구자/g, "시험책임자"],
  [/소스 데이터/g, "원본자료"],
  [/원본 데이터/g, "원본자료"],
  [/소스 문서/g, "원본문서"],
  [/원본 문서/g, "원본문서"],
  [/인증 사본/g, "인증등본"],
  [/감사 추적/g, "감사추적"],
  [/임상 조사/g, "임상시험"],
  [/품질경영/g, "품질관리"],
  [/조건부 규칙/g, "선행규정"],
  [/파트 11/g, "Part 11"],
  [/우호적인 의견/g, "찬성 의견"],
  [/호의적인 의견/g, "찬성 의견"],
  [/독창적이고/g, "원본이고"],
  [/동시대적이며/g, "동시성이 있으며"],
  [/귀속 가능하고/g, "귀속성이 있고"],
  [/시험대상자의\s*시험대상자 동의/g, "시험대상자 동의"],
];

export function applyGcpKoreanTerms(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
