import { describe, expect, it } from "vitest";
import { bruteForceTopK, cosine, l2Normalize } from "@/lib/retrieval/cosine";

describe("cosine brute force", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("ranks the nearest item first", () => {
    const query = l2Normalize([1, 1, 0]);
    const items = [
      { id: "far", v: l2Normalize([0, 0, 1]) },
      { id: "near", v: l2Normalize([1, 0.9, 0]) },
    ];
    const ranked = bruteForceTopK(query, items, (i) => i.v, 1);
    expect(ranked[0]?.item.id).toBe("near");
  });
});
