import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFdaGuidanceListing, parseFdaIchListing } from "@/lib/pipeline/sources/fda-parser";
import { isPriorityTitle } from "@/lib/pipeline/seed/corpus";
import { filterCatalog } from "@/lib/pipeline/fetch";

const ich = readFileSync(path.join(__dirname, "fixtures/fda-ich.html"), "utf8");
const guidance = readFileSync(path.join(__dirname, "fixtures/fda-guidance.html"), "utf8");

describe("fda-parser", () => {
  it("parses ICH listing titles, pdf urls, and issued dates", () => {
    const entries = parseFdaIchListing(ich, "https://www.fda.gov/ich");
    const e6 = entries.find((e) => e.title.includes("E6(R2)"));
    expect(e6?.pdfUrl).toContain("/media/93884/");
    expect(e6?.issuedDate).toBe("2018-03-01");
    expect(e6?.externalId).toContain("93884");
  });

  it("parses the six v1 FDA guidance documents from the listing fixture", () => {
    const entries = parseFdaGuidanceListing(
      guidance,
      "https://www.fda.gov/clinical-trials-guidance-documents",
    );
    const titles = entries.map((e) => e.title);
    expect(titles.some((t) => t.includes("Electronic Systems"))).toBe(true);
    expect(titles.some((t) => t.includes("Electronic Source Data"))).toBe(true);
    expect(titles.some((t) => t.includes("Part 11"))).toBe(true);
    expect(titles.some((t) => t.includes("Risk-Based Approach to Monitoring"))).toBe(true);
    expect(titles.some((t) => t.includes("Informed Consent"))).toBe(true);
    expect(entries.find((e) => e.title.includes("Electronic Systems"))?.issuedDate).toBe(
      "2024-10-02",
    );
  });

  it("priority filter drops unrelated FDA guidances", () => {
    const parsed = parseFdaGuidanceListing(guidance, "https://www.fda.gov/");
    const filtered = filterCatalog("fda-guidance", parsed);
    expect(filtered.every((e) => isPriorityTitle(e.title))).toBe(true);
    expect(filtered.some((e) => e.title.includes("Patient-Focused"))).toBe(false);
  });
});
