import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CatalogEntry, SourceId } from "@/lib/types";
import { parseFdaGuidanceListing, parseFdaIchListing } from "@/lib/pipeline/sources/fda-parser";
import { parseKgcpPage, extractKgcpText } from "@/lib/pipeline/sources/kgcp-parser";
import { isMfdsClinicalGuidance, parseMfdsList } from "@/lib/pipeline/sources/mfds-parser";
import { isPriorityTitle, SEED_CORPUS } from "@/lib/pipeline/seed/corpus";

export const SOURCE_URLS: Record<SourceId, string> = {
  "fda-ich":
    "https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/ich-guidance-documents",
  "fda-guidance":
    "https://www.fda.gov/science-research/clinical-trials-and-human-subject-protection/clinical-trials-guidance-documents",
  mfds: "https://www.mfds.go.kr/brd/m_1060/list.do",
  kgcp: "https://www.law.go.kr/법령/의약품등의안전에관한규칙",
};

const FIXTURE_NAMES: Record<SourceId, string> = {
  "fda-ich": "fda-ich.html",
  "fda-guidance": "fda-guidance.html",
  mfds: "mfds-list.html",
  kgcp: "kgcp.html",
};

async function readFixtureHtml(source: SourceId): Promise<string> {
  const file = path.join(process.cwd(), "tests", "fixtures", FIXTURE_NAMES[source]);
  return readFile(file, "utf8");
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gcp-guideline-watcher/0.1 (personal research; contact via repo)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }
  return response.text();
}

export async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gcp-guideline-watcher/0.1 (personal research; contact via repo)",
    },
  });
  if (!response.ok) {
    throw new Error(`Download failed ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function loadSourceHtml(source: SourceId): Promise<{ html: string; pageUrl: string }> {
  const pageUrl = SOURCE_URLS[source];
  if (process.env.USE_FIXTURE_SOURCES === "true") {
    return { html: await readFixtureHtml(source), pageUrl };
  }
  try {
    return { html: await fetchHtml(pageUrl), pageUrl };
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return { html: await readFixtureHtml(source), pageUrl };
    }
    return { html: "", pageUrl };
  }
}

export function parseCatalog(source: SourceId, html: string, pageUrl: string): CatalogEntry[] {
  switch (source) {
    case "fda-ich":
      return parseFdaIchListing(html, pageUrl);
    case "fda-guidance":
      return parseFdaGuidanceListing(html, pageUrl);
    case "mfds":
      return parseMfdsList(html, pageUrl);
    case "kgcp":
      return parseKgcpPage(html, pageUrl);
  }
}

export function filterCatalog(source: SourceId, entries: CatalogEntry[]): CatalogEntry[] {
  const priorityOnly = process.env.PRIORITY_ONLY !== "false";
  if (source === "mfds") {
    return entries.filter((e) => isMfdsClinicalGuidance(e.title, e.category));
  }
  if (priorityOnly && (source === "fda-ich" || source === "fda-guidance")) {
    return entries.filter((e) => isPriorityTitle(e.title));
  }
  return entries;
}

export function seedFallbackCatalog(source: SourceId): CatalogEntry[] {
  return SEED_CORPUS.filter((s) => s.source === source).map((s) => ({
    source: s.source,
    title: s.title,
    url: s.url,
    pdfUrl: s.pdfUrl,
    issuedDate: s.issuedDate,
    category: s.category,
    externalId: s.externalId,
  }));
}

export { extractKgcpText };
