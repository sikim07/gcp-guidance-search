import { describe, expect, it } from "vitest";
import { loadingCopy, loadingPhase } from "@/lib/search/loading";

describe("search loading copy", () => {
  it("starts with retrieving clauses, then writing the answer", () => {
    expect(loadingCopy(loadingPhase(0))).toBe("조항 고르는 중");
    expect(loadingCopy(loadingPhase(400))).toBe("조항 고르는 중");
    expect(loadingCopy(loadingPhase(900))).toBe("답변 쓰는 중");
    expect(loadingCopy(loadingPhase(4000))).toBe("답변 쓰는 중");
  });
});
