import { describe, expect, it } from "vitest";
import { chunkByClause } from "@/lib/pipeline/chunk";

describe("chunkByClause", () => {
  it("splits ICH-style numbered clauses instead of whole paragraphs", () => {
    const chunks = chunkByClause(`
4.8 Informed Consent of Trial Subjects
The investigator should obtain consent.

4.9 Records and Reports
Source data should be attributable.
`);
    expect(chunks.map((c) => c.section)).toEqual(["4.8", "4.9"]);
    expect(chunks[0]?.text).toContain("consent");
  });

  it("splits KGCP 조/호 markers", () => {
    const chunks = chunkByClause(`
제5호 시험대상자 동의
서면 동의를 받는다.

제6호 기록 및 자료
감사추적을 남긴다.
`);
    expect(chunks.map((c) => c.section)).toEqual([
      "제5호 시험대상자 동의",
      "제6호 기록 및 자료",
    ]);
  });

  it("keeps KGCP numbered headings in the section label", () => {
    const chunks = chunkByClause(`
2. 용어의 정의
임상시험 대상자란 사람을 말한다.

5. 시험대상자 동의
서면 동의를 받는다.
`);
    expect(chunks.map((c) => c.section)).toEqual([
      "2. 용어의 정의",
      "5. 시험대상자 동의",
    ]);
    expect(chunks[1]?.text).toContain("서면 동의");
  });

  it("keeps Korean chapter titles as section labels", () => {
    const chunks = chunkByClause(`
제1장 목적
이 안내서는 ICH E6를 설명한다.

제4장 전자자료와 필수문서
감사추적을 남긴다.
`);
    expect(chunks.map((c) => c.section)).toEqual([
      "제1장 목적",
      "제4장 전자자료와 필수문서",
    ]);
  });

  it("keeps two-digit ICH clause numbers like 1.24 and 4.8.10", () => {
    const chunks = chunkByClause(`
1.24 Good Clinical Practice (GCP)
A standard for the design of clinical trials.

1.51 Source Data
All information in original records.

4.8.10 Both the informed consent discussion and the written informed consent form
should be recorded.
`);
    expect(chunks.map((c) => c.section)).toEqual(["1.24", "1.51", "4.8.10"]);
    expect(chunks[1]?.text).toContain("original records");
  });

  it("does not treat table-of-contents leader dots as clause bodies", () => {
    const chunks = chunkByClause(`
4.8 Informed Consent of Trial Subjects ............................................................................ 16
5.18 Monitoring .............................................................................................................. 29
4.8 Informed Consent of Trial Subjects
The investigator should obtain consent.
`);
    expect(chunks.map((c) => c.section)).toEqual(["4.8"]);
    expect(chunks[0]?.text).toContain("obtain consent");
    expect(chunks[0]?.text).not.toMatch(/\.{5,}/);
  });

  it("keeps a bare ADDENDUM line inside the current clause", () => {
    const chunks = chunkByClause(`
1.62 Well-being (of the trial subjects)
The physical and mental integrity of the subjects.
ADDENDUM
1.63 Certified Copy
A copy of the original record that has been verified.
`);
    expect(chunks.map((c) => c.section)).toEqual(["1.62", "1.63"]);
    expect(chunks[0]?.text).toContain("ADDENDUM");
    expect(chunks[1]?.text).toContain("verified");
  });

  it("does not treat wrapped Korean statute lines as headings", () => {
    const chunks = chunkByClause(`
1. 목적
이 기준은 의약품 임상시험 실시에 필요한 임상시험의 준비, 실시, 모니터링,
점검, 자료의 기록 및 보고 등에 관한 기준을 정함으로써, 정확하고 신뢰할 수
있는 자료와 결과를 얻고 시험대상자의 권익 보호와 비밀 보장이 적정하게 이
루어질 수 있도록 하는 것을 목적으로 한다.

2. 용어의 정의
이 기준에서 사용하는 용어의 뜻은 다음과 같다.
`);
    expect(chunks.map((c) => c.section)).toEqual(["1. 목적", "2. 용어의 정의"]);
    expect(chunks[0]?.text).toContain("적정하게 이");
    expect(chunks[0]?.text).toContain("목적으로 한다");
  });

  it("splits KGCP 가/나 headings under the parent numbered clause", () => {
    const chunks = chunkByClause(`
7. 시험자
가. 시험자의 자격요건 등
시험자는 교육을 받아야 한다.

아. 대상자의 동의
시험책임자는 서면 동의를 받아야 한다.
`);
    expect(chunks.map((c) => c.section)).toEqual([
      "7. 시험자 · 가. 시험자의 자격요건 등",
      "7. 시험자 · 아. 대상자의 동의",
    ]);
    expect(chunks[1]?.text).toContain("서면 동의");
  });

  it("splits E6(R3) named principles from packed paragraphs", () => {
    const chunks = chunkByClause(`
Principles
Quality by design means building quality into the protocol.

Quality Management
The sponsor should implement a quality management system.
`);
    expect(chunks.map((c) => c.section)).toEqual(["Principles", "Quality Management"]);
    expect(chunks[0]?.text).toContain("Quality by design");
  });

  it("splits Q&A identifiers", () => {
    const chunks = chunkByClause(`
Q7. What should be considered when validating?
Use a risk-based approach.

Q8. What about audit trails?
Keep them enabled.
`);
    expect(chunks.map((c) => c.section)).toEqual(["Q7", "Q8"]);
  });

  it("splits Korean SAE clock headings and 312.32 fatal/15-day headings", () => {
    const korean = chunkByClause(`
중대한 예상하지 못한 약물이상반응 보고
의뢰자는 7일 이내에 보고한다.

그 밖의 중대한 예상하지 못한 약물이상반응
그 밖의 경우는 15일 이내에 보고한다.
`);
    expect(korean.map((c) => c.section)).toEqual([
      "중대한 예상하지 못한 약물이상반응 보고",
      "그 밖의 중대한 예상하지 못한 약물이상반응",
    ]);
    const clocks = chunkByClause(`
Fatal or life-threatening unexpected suspected adverse reactions
The sponsor must notify FDA no later than 7 calendar days.

Other serious unexpected suspected adverse reactions
The sponsor must notify FDA no later than 15 calendar days.
`);
    expect(clocks.map((c) => c.section)).toEqual([
      "Fatal or life-threatening unexpected suspected adverse reactions",
      "Other serious unexpected suspected adverse reactions",
    ]);
  });
});
