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
  });
});
