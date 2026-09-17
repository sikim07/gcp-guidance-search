import { describe, expect, it } from "vitest";
import { formatCitations } from "@/lib/retrieval/cite";

describe("formatCitations", () => {
  it("builds a one-block citation for a monitoring report", () => {
    const text = formatCitations([
      {
        title: "E6(R2) Good Clinical Practice",
        section: "5.5.3",
        url: "https://www.fda.gov/media/93884/download",
        kind: "guideline",
      },
    ]);
    expect(text).toContain("[E6(R2) Good Clinical Practice, 5.5.3]");
    expect(text).toContain("https://www.fda.gov/media/93884/download");
    expect(text).toMatch(/법적 자문이 아님/);
    expect(text).not.toMatch(/발행|공포번호|시행/);
  });

  it("puts the guideline issued date on the same line as the URL", () => {
    const text = formatCitations([
      {
        title:
          "Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations",
        section: "Q8",
        url: "https://www.fda.gov/media/166215/download",
        kind: "guideline",
        issuedDate: "2024-10-02",
      },
    ]);
    expect(text).toContain(
      "[Electronic Systems, Electronic Records, and Electronic Signatures in Clinical Investigations, Q8] (2024-10-02 발행) https://www.fda.gov/media/166215/download",
    );
  });

  it("puts statute MST and effective date on the same line", () => {
    const text = formatCitations([
      {
        title: "개인정보 보호법",
        section: "제23조(민감정보의 처리 제한)",
        url: "https://www.law.go.kr/법령/개인정보보호법",
        kind: "statute",
        currentMst: "21445",
        promulgatedDate: "2026-03-10",
        effectiveDate: "2026-03-10",
      },
    ]);
    expect(text).toContain(
      "[개인정보 보호법, 제23조(민감정보의 처리 제한)] (공포번호 21445, 2026-03-10 시행) https://www.law.go.kr/법령/개인정보보호법",
    );
  });
});
