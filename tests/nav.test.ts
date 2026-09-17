import { describe, expect, it } from "vitest";
import { isNavActive, navIndex, navTransitionType } from "@/lib/nav";

describe("navIndex", () => {
  it("maps routes to 검색 → 개정 피드 → 문서 → 안내", () => {
    expect(navIndex("/")).toBe(0);
    expect(navIndex("/updates")).toBe(1);
    expect(navIndex("/documents")).toBe(2);
    expect(navIndex("/documents/abc/5.18")).toBe(2);
    expect(navIndex("/about")).toBe(3);
  });
});

describe("isNavActive", () => {
  it("treats nested document routes as the 문서 tab", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/updates", "/")).toBe(false);
    expect(isNavActive("/documents/abc/5.18", "/documents")).toBe(true);
  });
});

describe("navTransitionType", () => {
  it("slides forward when the tab index increases", () => {
    expect(navTransitionType("/", "/updates")).toBe("nav-forward");
    expect(navTransitionType("/updates", "/about")).toBe("nav-forward");
  });

  it("slides back when the tab index decreases", () => {
    expect(navTransitionType("/about", "/")).toBe("nav-back");
    expect(navTransitionType("/documents", "/updates")).toBe("nav-back");
  });

  it("skips animation when staying on the same tab", () => {
    expect(navTransitionType("/documents", "/documents/abc/5.18")).toBe(null);
  });
});
