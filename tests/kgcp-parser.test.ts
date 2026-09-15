import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractKgcpText, parseKgcpPage } from "@/lib/pipeline/sources/kgcp-parser";

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
});
