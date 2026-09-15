import * as cheerio from "cheerio";
import type { CatalogEntry } from "@/lib/types";
import { isoDate } from "@/lib/utils";

const CLINICAL_KEYWORDS = [
  "임상시험",
  "gcp",
  "kgcp",
  "irb",
  "시험대상자",
  "모니터링",
  "etmf",
  "ich",
  "동의서",
  "임상연구",
];

export function isMfdsClinicalGuidance(title: string, category = ""): boolean {
  const hay = `${title} ${category}`.toLowerCase();
  return CLINICAL_KEYWORDS.some((kw) => hay.includes(kw.toLowerCase()));
}

export function parseMfdsList(html: string, pageUrl: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();

  $("table tr").each((_, row) => {
    const $row = $(row);
    const anchor = $row.find("a").first();
    if (!anchor.length) return;
    const title = anchor.text().replace(/\s+/g, " ").trim();
    if (!title || title === "제목") return;

    const href = anchor.attr("href") ?? "";
    const seq =
      href.match(/seq=(\d+)/)?.[1] ??
      href.match(/fn_view\('(\d+)'\)/)?.[1] ??
      $row.attr("data-seq") ??
      null;
    const cells = $row
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();
    const dates = cells.map((c) => isoDate(c)).filter((d): d is string => Boolean(d));
    const issuedDate = $row.attr("data-issued") ?? dates[0] ?? null;
    const category =
      $row.attr("data-category") ??
      $row.find("[data-category]").text().trim() ??
      cells.find((c) => c.includes("임상") || c.includes("의약품")) ??
      "";
    const url = seq
      ? new URL(`/brd/m_1060/view.do?seq=${seq}`, pageUrl).toString()
      : new URL(href, pageUrl).toString();
    const externalId = `mfds:m_1060:${seq ?? title}`;
    if (seen.has(externalId)) return;
    seen.add(externalId);

    entries.push({
      source: "mfds",
      title,
      url,
      issuedDate,
      category: category || "민원인안내서",
      externalId,
    });
  });

  return entries;
}
