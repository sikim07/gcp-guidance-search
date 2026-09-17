import { describe, expect, it } from "vitest";
import { chunkByClause } from "@/lib/pipeline/chunk";
import { SEED_CORPUS } from "@/lib/pipeline/seed/corpus";
import { SEED_STATUTES } from "@/lib/pipeline/seed/statutes";

describe("E6(R2) seed coverage", () => {
  const e6 = SEED_CORPUS.find((row) => row.externalId === "fda-ich:93884");

  it("is a full-clause extract, not a handful of excerpts", () => {
    expect(e6?.text.length).toBeGreaterThan(40_000);
    const sections = chunkByClause(e6?.text ?? "", e6?.title ?? "E6").map(
      (c) => c.section,
    );
    expect(sections.length).toBeGreaterThan(80);
    expect(sections.some((s) => /^4\.8\b/.test(s))).toBe(true);
    expect(sections.some((s) => /5\.5\.3/.test(s))).toBe(true);
    expect(sections.some((s) => /5\.18/.test(s))).toBe(true);
    expect(e6?.text).toMatch(/4\.8\.2/);
    expect(e6?.text).toMatch(/1\.51 Source Data/);
    expect(e6?.text).toMatch(/6\.\d/);
    expect(e6?.text).toMatch(/Essential Documents|필수문서/i);
  });
});

describe("KGCP annex 4 seed coverage", () => {
  const annex = SEED_STATUTES.find((row) => row.lawId === "011794")?.articles.find(
    (row) => row.kind === "annex",
  );

  it("keeps the full 별표 4 body, not the eight-paragraph summary", () => {
    expect(annex?.text.length).toBeGreaterThan(8_000);
    expect(annex?.text).toMatch(/시험책임자/);
    expect(annex?.text).toMatch(/의뢰자/);
    expect(annex?.text).toMatch(/대상자의 동의|서면동의|서면 동의/);
    expect(annex?.text).toMatch(/모니터링/);
    const sections = chunkByClause(annex?.text ?? "", annex?.section ?? "별표 4").map(
      (c) => c.section,
    );
    expect(sections.length).toBeGreaterThan(8);
  });
});
