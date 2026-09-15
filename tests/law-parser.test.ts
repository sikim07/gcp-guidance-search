import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  articlesFromLawBody,
  pickExactLaw,
  publicLawUrl,
  yyyymmddToIso,
} from "@/lib/pipeline/sources/law-parser";

const list = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/law-search.json"), "utf8"),
) as unknown;
const body = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/law-body.json"), "utf8"),
) as unknown;

describe("law-parser", () => {
  it("picks the exact statute name and ignores 시행령", () => {
    const hit = pickExactLaw(list, "약사법");
    expect(hit?.lawId).toBe("001783");
    expect(hit?.mst).toBe("283893");
    expect(hit?.title).toBe("약사법");
    expect(hit?.amendmentType).toBe("타법개정");
    expect(hit?.promulgatedDate).toBe("2026-03-10");
    expect(hit?.effectiveDate).toBe("2026-09-11");
    expect(hit?.detailPath).not.toMatch(/OC=/);
  });

  it("does not treat 약사법 시행령 as 약사법", () => {
    expect(pickExactLaw(list, "약사법")?.title).toBe("약사법");
  });

  it("flattens 조문 항/호 and skips 전문, GMP 별표 1", () => {
    const articles = articlesFromLawBody(body, {
      includeAnnexTitle: "의약품 임상시험 관리기준",
    });
    expect(articles.map((a) => a.section)).toEqual([
      "제30조(임상시험의 실시 기준 등)",
      "별표 4 의약품 임상시험 관리기준",
    ]);
    expect(articles[0]?.text).toMatch(/별표 4의 의약품 임상시험 관리기준/);
    expect(articles[0]?.text).toMatch(/원래 기록이 가려지지 않도록/);
    expect(articles[1]?.kind).toBe("annex");
    expect(articles[1]?.text).toMatch(/1\. 목적/);
    expect(articles.some((a) => a.text.includes("GMP"))).toBe(false);
    expect(articles.some((a) => a.text.includes("KGCP가 아니다"))).toBe(false);
  });

  it("builds a public law.go.kr URL without the OC key", () => {
    expect(publicLawUrl("약사법")).toBe("https://www.law.go.kr/법령/약사법");
    expect(yyyymmddToIso("20260310")).toBe("2026-03-10");
  });
});
