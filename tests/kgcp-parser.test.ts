import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractKgcpText, parseKgcpPage } from "@/lib/pipeline/sources/kgcp-parser";
import { SEED_STATUTES } from "@/lib/pipeline/seed/statutes";

const html = readFileSync(path.join(__dirname, "fixtures/kgcp.html"), "utf8");

describe("kgcp-parser", () => {
  it("treats KGCP as 별표 4 and captures the enforcement date", () => {
    const [entry] = parseKgcpPage(html, "https://www.law.go.kr/kgcp");
    expect(entry.title).toContain("별표 4");
    expect(entry.issuedDate).toBe("2025-02-21");
    expect(entry.externalId).toContain("annex-4");
  });

  it("extracts article text including 시험대상자 동의", () => {
    const text = extractKgcpText(html);
    expect(text).toContain("서면 동의");
  });

  it("uses the law-api 별표 4 extract, not the eight-paragraph summary", () => {
    const annex = SEED_STATUTES.find((row) => row.lawId === "011794")?.articles.find(
      (row) => row.kind === "annex",
    );
    expect(annex?.text.length).toBeGreaterThan(8_000);
    expect(annex?.text).toMatch(/7\. 시험자/);
    expect(annex?.text).toMatch(/8\. 임상시험 의뢰자/);
    expect(annex?.text).toMatch(/아\. 대상자의 동의/);
    expect(annex?.text).toMatch(/머\. 모니터링/);
  });
});
