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
    expect(chunks.map((c) => c.section)).toEqual(["제5호", "제6호"]);
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
