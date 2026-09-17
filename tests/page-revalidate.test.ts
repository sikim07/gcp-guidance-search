import { describe, expect, it } from "vitest";
import {
  PAGE_REVALIDATE_SECONDS,
  collectRevalidatePaths,
} from "@/lib/cache/revalidate-pages";

describe("ISR page revalidation", () => {
  it("uses a one-hour revalidate window", () => {
    expect(PAGE_REVALIDATE_SECONDS).toBe(3600);
  });

  it("busts home, feed, catalog, sitemap, and the changed document trees", () => {
    const paths = collectRevalidatePaths({
      documentIds: ["d1"],
      statuteIds: ["s1"],
    });
    expect(paths).toEqual(
      expect.arrayContaining([
        { path: "/", type: "page" },
        { path: "/updates", type: "page" },
        { path: "/documents", type: "page" },
        { path: "/documents/d1", type: "layout" },
        { path: "/documents/s1", type: "layout" },
        { path: "/sitemap.xml", type: "page" },
      ]),
    );
  });

  it("still refreshes shared routes when nothing specific changed", () => {
    const paths = collectRevalidatePaths({ documentIds: [], statuteIds: [] });
    expect(paths.map((row) => row.path)).toEqual([
      "/",
      "/updates",
      "/documents",
      "/sitemap.xml",
    ]);
  });
});

describe("static section params", () => {
  it("does not prerender document or clause pages at build time", async () => {
    const { clauseStaticParams, documentStaticParams } = await import(
      "@/lib/cache/static-params"
    );
    expect(await documentStaticParams()).toEqual([]);
    expect(await clauseStaticParams()).toEqual([]);
  });

  it("rejects statute headings that would overflow the prerender folder name", async () => {
    const { isSafeStaticSection } = await import("@/lib/cache/static-params");
    expect(isSafeStaticSection("5.18")).toBe(true);
    expect(
      isSafeStaticSection(
        "제46조(동물용 의료기기에 대한 특례) 이 법에 따른 보건복지부장관 및 식품의약품안전처장의 소관 사항 중 동물용으로 전용할 것을 목적으로 하는 의료기기에 관하여는 농림축산식품부장관의 소관으로 하며, 이 법의 해당 규",
      ),
    ).toBe(false);
  });
});
