import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isMfdsClinicalGuidance, parseMfdsList } from "@/lib/pipeline/sources/mfds-parser";
import { filterCatalog } from "@/lib/pipeline/fetch";

const html = readFileSync(path.join(__dirname, "fixtures/mfds-list.html"), "utf8");

describe("mfds-parser", () => {
  it("parses seq, title, and 고시일 from the board table", () => {
    const entries = parseMfdsList(html, "https://www.mfds.go.kr/brd/m_1060/list.do");
    const gcp = entries.find((e) => e.title.includes("ICH GCP"));
    expect(gcp?.externalId).toBe("mfds:m_1060:14675");
    expect(gcp?.issuedDate).toBe("2020-07-22");
    expect(gcp?.url).toContain("seq=14675");
  });

  it("keeps clinical-trial guidances and drops unrelated board posts", () => {
    const parsed = parseMfdsList(html, "https://www.mfds.go.kr/brd/m_1060/list.do");
    const filtered = filterCatalog("mfds", parsed);
    expect(filtered.some((e) => e.title.includes("ICH GCP"))).toBe(true);
    expect(filtered.some((e) => e.title.includes("재심사"))).toBe(false);
    expect(isMfdsClinicalGuidance("임상시험용의약품 GMP 평가 가이드라인", "GMP")).toBe(true);
  });
});
