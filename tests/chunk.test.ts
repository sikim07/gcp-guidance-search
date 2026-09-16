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
});
