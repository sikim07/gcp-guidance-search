import * as cheerio from "cheerio";
import type { CatalogEntry, SourceId } from "@/lib/types";
import { isoDate } from "@/lib/utils";

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function extractDate(text: string): string | null {
  const iso = isoDate(text);
  if (iso) return iso;
  const month = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2},)?\s*(\d{4})\b/i,
  );
  if (month) {
    const m = MONTHS[month[1].toLowerCase()];
    const day = month[2] ? month[2].replace(",", "").trim().padStart(2, "0") : "01";
    return `${month[3]}-${m}-${day}`;
  }
  const year = text.match(/\b(19|20)\d{2}\b/);
  return year ? `${year[0]}-01-01` : null;
}

function absUrl(href: string, pageUrl: string): string {
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return href;
  }
}

function mediaId(url: string): string | null {
  const match = url.match(/\/media\/(\d+)\//);
  return match?.[1] ?? null;
}

function headingEntries(
  html: string,
  source: SourceId,
  pageUrl: string,
  defaultCategory: string,
): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();

  $("h2, h3").each((_, heading) => {
    const $h = $(heading);
    const title = $h.text().replace(/\s+/g, " ").trim();
    if (!title || title.length < 8) return;

    const blockTexts: string[] = [title];
    let pdfUrl: string | undefined;
    let issuedDate: string | null = $h.attr("data-issued") ?? null;
    let category = $h.attr("data-category") ?? defaultCategory;

    let cursor = $h.next();
    while (cursor.length && !cursor.is("h2, h3")) {
      blockTexts.push(cursor.text());
      if (!pdfUrl) {
        const href = cursor.find('a[href*="/media/"]').attr("href") ?? cursor.filter("a").attr("href");
        if (href?.includes("/media/")) pdfUrl = absUrl(href, pageUrl);
      }
      const time = cursor.find("time").attr("datetime") ?? cursor.filter("time").attr("datetime");
      if (time && !issuedDate) issuedDate = isoDate(time);
      const cat = cursor.find("[data-category]").attr("data-category");
      if (cat) category = cat;
      cursor = cursor.next();
    }

    if (!pdfUrl) {
      const inHeading = $h.find('a[href*="/media/"]').attr("href") ?? $h.find("a").attr("href");
      if (inHeading) {
        const resolved = absUrl(inHeading, pageUrl);
        if (resolved.includes("/media/") || resolved.includes("guidance")) pdfUrl = resolved;
      }
    }

    const blob = blockTexts.join("\n");
    const date = issuedDate ?? extractDate(blob);
    const url = pdfUrl ?? pageUrl;
    const id = mediaId(url) ?? title.toLowerCase().slice(0, 80);
    const externalId = `${source}:${id}`;
    if (seen.has(externalId)) return;
    seen.add(externalId);

    entries.push({
      source,
      title,
      url: pdfUrl ? absUrl(pdfUrl, pageUrl) : absUrl(url, pageUrl),
      pdfUrl: pdfUrl ? absUrl(pdfUrl, pageUrl) : undefined,
      issuedDate: date,
      category,
      externalId,
    });
  });

  return entries;
}

export function parseFdaIchListing(html: string, pageUrl: string): CatalogEntry[] {
  return headingEntries(html, "fda-ich", pageUrl, "ICH");
}

export function parseFdaGuidanceListing(html: string, pageUrl: string): CatalogEntry[] {
  return headingEntries(html, "fda-guidance", pageUrl, "Clinical Trials");
}
