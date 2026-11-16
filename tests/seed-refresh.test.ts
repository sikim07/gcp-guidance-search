import { describe, expect, it } from "vitest";
import { sameSectionSet, seedNeedsRefresh } from "@/lib/pipeline/seed/bootstrap";

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
        fileHash: "pdf-bytes-hash",
        seedHash: "new-full-seed",
        currentSections: Array.from({ length: 200 }, (_, i) => `§${i}`),
        nextSections: Array.from({ length: 400 }, (_, i) => `§${i}`),
      }),
    ).toBe(false);
    expect(
      seedNeedsRefresh({
        fileHash: "old-excerpt-hash",
        seedHash: "new-full-seed",
        currentSections: Array.from({ length: 14 }, (_, i) => `§${i}`),
        nextSections: Array.from({ length: 400 }, (_, i) => `§${i}`),
      }),
    ).toBe(true);
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

  it("does not treat Supabase row-order shuffle as a clause-boundary change", () => {
    expect(sameSectionSet(["15일", "7일", "Follow-up"], ["Follow-up", "15일", "7일"])).toBe(
      true,
    );
    expect(
      seedNeedsRefresh({
        fileHash: "h",
        seedHash: "h",
        currentSections: ["15일", "7일", "Follow-up"],
        nextSections: ["Follow-up", "15일", "7일"],
      }),
    ).toBe(false);
  });
});
