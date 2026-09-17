import { describe, expect, it } from "vitest";
import { PRESET_INDEX_CLASS } from "@/components/preset-index";
import {
  buildSitemapEntries,
  clauseHref,
  clausePageTitle,
  pickPresetSummaries,
} from "@/lib/seo";
import { PRESET_QUERIES } from "@/lib/search/presets";
import { SITE_URL } from "@/lib/site";

describe("clause href and title", () => {
  it("encodes a Korean section into a unique document path", () => {
    expect(clauseHref("doc-1", "7. 시험자 · 아. 대상자의 동의")).toBe(
      `/documents/doc-1/${encodeURIComponent("7. 시험자 · 아. 대상자의 동의")}`,
    );
  });

  it("builds a crawler title with the clause number", () => {
    expect(
      clausePageTitle(
        "E6(R2) Good Clinical Practice: Integrated Addendum to ICH E6(R1)",
        "5.18 Monitoring",
      ),
    ).toBe("ICH E6(R2) 5.18 Monitoring");
  });
});

describe("sitemap entries", () => {
  it("includes document and clause URLs, not only the four fixed routes", () => {
    const entries = buildSitemapEntries({
      documents: [
        {
          id: "d1",
          status: "active",
          issuedDate: "2018-03-01",
        },
        {
          id: "gone",
          status: "withdrawn",
          issuedDate: "2001-01-01",
        },
      ],
      chunks: [
        { documentId: "d1", isCurrent: true, section: "5.5.3" },
        { documentId: "gone", isCurrent: true, section: "old" },
      ],
      statutes: [
        {
          id: "s1",
          status: "active",
          effectiveDate: "2026-03-10",
        },
      ],
      articles: [{ statuteId: "s1", isCurrent: true, section: "제23조" }],
    });
    const urls = entries.map((row) => row.url);
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/documents`);
    expect(urls).toContain(`${SITE_URL}/documents/d1`);
    expect(urls).toContain(`${SITE_URL}/documents/d1/5.5.3`);
    expect(urls).toContain(`${SITE_URL}/documents/s1/${encodeURIComponent("제23조")}`);
    expect(urls.some((url) => url.includes("/gone"))).toBe(false);
    expect(urls.length).toBeGreaterThan(4);
  });
});

describe("preset summaries for the home index", () => {
  it("picks a matching clause snippet for each preset question", () => {
    const summaries = pickPresetSummaries(PRESET_QUERIES, [
      {
        id: "c-audit",
        entityId: "d1",
        title: "E6(R2) Good Clinical Practice",
        section: "5.5.3",
        text: "Ensure that the systems maintain an audit trail of data changes.",
        kind: "guideline",
      },
      {
        id: "c-privacy",
        entityId: "s1",
        title: "개인정보 보호법",
        section: "제23조(민감정보의 처리 제한)",
        text: "건강 등 민감정보는 별도 동의를 받은 경우에만 처리할 수 있다.",
        kind: "statute",
      },
    ]);
    const audit = summaries.find((row) => row.id === "audit-trail");
    expect(audit?.section).toMatch(/5\.5\.3/);
    expect(audit?.snippet).toMatch(/audit trail/i);
    expect(audit?.href).toContain("/documents/d1/");
    const sensitive = summaries.find((row) => row.id === "sensitive");
    expect(sensitive?.section).toMatch(/제23조/);
  });

  it("keeps the home clause index in HTML but off-screen", () => {
    expect(PRESET_INDEX_CLASS).toBe("sr-only");
  });
});
