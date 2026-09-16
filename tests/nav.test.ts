import { describe, expect, it } from "vitest";
import { navIndex } from "@/lib/nav";

describe("navIndex", () => {
  it("maps routes to 검색 → 개정 피드 → 문서 → 안내", () => {
    expect(navIndex("/")).toBe(0);
    expect(navIndex("/updates")).toBe(1);
    expect(navIndex("/documents")).toBe(2);
    expect(navIndex("/documents/abc")).toBe(2);
    expect(navIndex("/about")).toBe(3);
  });
});
