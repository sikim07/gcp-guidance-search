import { describe, expect, it } from "vitest";
import { PRESET_QUERIES } from "@/lib/search/presets";

describe("preset queries", () => {
  it("covers the questions an EDC developer actually types", () => {
    const blob = PRESET_QUERIES.map((row) => `${row.label} ${row.query}`).join("\n");
    expect(PRESET_QUERIES.length).toBeGreaterThanOrEqual(5);
    expect(blob).toMatch(/감사추적/);
    expect(blob).toMatch(/동의/);
    expect(blob).toMatch(/모니터링/);
    expect(blob).toMatch(/민감정보|건강정보/);
    expect(blob).toMatch(/의료기기/);
  });
});
