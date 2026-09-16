import { describe, expect, it } from "vitest";
import { seedNeedsRefresh } from "@/lib/pipeline/seed/bootstrap";

describe("seedNeedsRefresh", () => {
  it("refreshes only when the stored text is still the seed and clause cuts changed", () => {
    expect(
      seedNeedsRefresh({
        fileHash: "aaa",
        seedHash: "bbb",
        currentSections: ["§1"],
        nextSections: ["§1"],
      }),
    ).toBe(false);
    expect(
      seedNeedsRefresh({
        fileHash: "h",
        seedHash: "h",
        currentSections: ["§1"],
        nextSections: ["7일 보고", "15일 보고"],
      }),
    ).toBe(true);
    expect(
      seedNeedsRefresh({
        fileHash: "h",
        seedHash: "h",
        currentSections: ["7일 보고"],
        nextSections: ["7일 보고"],
      }),
    ).toBe(false);
  });
});
