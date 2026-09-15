import * as cheerio from "cheerio";
import type { CatalogEntry } from "@/lib/types";
import { isoDate } from "@/lib/utils";

/**
 * KGCP is [별표 4] of 「의약품 등의 안전에 관한 규칙」, not 별표 1 (GMP).
 */
export function parseKgcpPage(html: string, pageUrl: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const title =
    $("h1, .law-title, caption").first().text().replace(/\s+/g, " ").trim() ||
    "의약품 임상시험 관리기준 (KGCP)";
  const issued =
    isoDate($("[data-enforcement]").attr("data-enforcement") ?? "") ??
    isoDate($(".enforcement, .revision-date, time").first().text()) ??
    isoDate($("body").text());

  const lawId = $("[data-law-id]").attr("data-law-id") ?? "kgcp-annex-4";

  return [
    {
      source: "kgcp",
      title: title.includes("별표 4") ? title : `${title} [별표 4]`,
      url: pageUrl,
      issuedDate: issued,
      category: "법령 / KGCP",
      externalId: `kgcp:${lawId}:annex-4`,
    },
  ];
}

export function extractKgcpText(html: string): string {
  const $ = cheerio.load(html);
  const articles = $("[data-article], .article, .pgroup, p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t.length > 20);
  if (articles.length) return articles.join("\n\n");
  return $("body").text().replace(/\s+\n/g, "\n").trim();
}
