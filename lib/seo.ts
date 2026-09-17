import type { MetadataRoute } from "next";
import type { AppStore } from "@/lib/db/types";
import { clipAtSentence, readableText } from "@/lib/text/readable";
import { lexicalRankScore } from "@/lib/retrieval/rank";
import { SITE_URL } from "@/lib/site";

export type SitemapDoc = {
  id: string;
  status: string;
  issuedDate?: string | null;
};

export type SitemapChunk = {
  documentId: string;
  isCurrent: boolean;
  section: string;
};

export type SitemapStatute = {
  id: string;
  status: string;
  effectiveDate?: string | null;
};

export type SitemapArticle = {
  statuteId: string;
  isCurrent: boolean;
  section: string;
};

export type ClausePoolItem = {
  id: string;
  entityId: string;
  title: string;
  section: string;
  text: string;
  kind: "guideline" | "statute";
};

export function clauseHref(id: string, section: string): string {
  return `/documents/${id}/${encodeURIComponent(section)}`;
}

export function decodeClauseSection(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function shortDocumentTitle(title: string): string {
  if (/e6\(r2\)/i.test(title)) return "ICH E6(R2)";
  if (/e6\(r3\)/i.test(title)) return "ICH E6(R3)";
  if (/part 11/i.test(title)) return "Part 11";
  if (/전자기록|electronic source/i.test(title) && /source data/i.test(title)) {
    return "eSource";
  }
  if (/informed consent/i.test(title)) return "Informed Consent";
  if (/risk-based approach to monitoring/i.test(title)) return "위험기반 모니터링";
  if (/개인정보 보호법/.test(title)) return "개인정보 보호법";
  if (/의료기기법/.test(title)) return "의료기기법";
  if (/약사법/.test(title) && !/규칙/.test(title)) return "약사법";
  if (/첨단재생/.test(title)) return "첨단재생바이오법";
  if (/별표 4|임상시험 관리기준|의약품 등의 안전에 관한 규칙/.test(title)) {
    return "별표 4 KGCP";
  }
  const cut = title.split(/[:—–]/)[0]?.trim() ?? title;
  return cut.length > 48 ? `${cut.slice(0, 48).trim()}…` : cut;
}

export function clausePageTitle(docTitle: string, section: string): string {
  return `${shortDocumentTitle(docTitle)} ${section}`.replace(/\s+/g, " ").trim();
}

export function clausePageDescription(
  docTitle: string,
  section: string,
  text: string,
): string {
  const snippet = clipAtSentence(readableText(text), 150);
  return `${clausePageTitle(docTitle, section)} 원문. ${snippet}`.slice(0, 180);
}

export function buildSitemapEntries(input: {
  documents: SitemapDoc[];
  chunks: SitemapChunk[];
  statutes: SitemapStatute[];
  articles: SitemapArticle[];
}): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  const push = (
    path: string,
    extra?: Pick<
      MetadataRoute.Sitemap[number],
      "changeFrequency" | "priority" | "lastModified"
    >,
  ) => {
    const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({
      url,
      lastModified: extra?.lastModified ?? lastModified,
      changeFrequency: extra?.changeFrequency ?? "weekly",
      priority: extra?.priority ?? 0.5,
    });
  };

  push("/", { changeFrequency: "daily", priority: 1 });
  push("/about", { priority: 0.7 });
  push("/updates", { changeFrequency: "daily", priority: 0.7 });
  push("/documents", { priority: 0.7 });

  const activeDocs = new Set(
    input.documents.filter((row) => row.status === "active").map((row) => row.id),
  );
  const activeStatutes = new Set(
    input.statutes.filter((row) => row.status === "active").map((row) => row.id),
  );

  for (const doc of input.documents) {
    if (doc.status !== "active") continue;
    push(`/documents/${doc.id}`, {
      lastModified: doc.issuedDate ? new Date(doc.issuedDate) : lastModified,
      priority: 0.6,
    });
  }
  for (const chunk of input.chunks) {
    if (!chunk.isCurrent || !activeDocs.has(chunk.documentId)) continue;
    push(clauseHref(chunk.documentId, chunk.section), { priority: 0.55 });
  }
  for (const statute of input.statutes) {
    if (statute.status !== "active") continue;
    push(`/documents/${statute.id}`, {
      lastModified: statute.effectiveDate
        ? new Date(statute.effectiveDate)
        : lastModified,
      priority: 0.6,
    });
  }
  for (const article of input.articles) {
    if (!article.isCurrent || !activeStatutes.has(article.statuteId)) continue;
    push(clauseHref(article.statuteId, article.section), { priority: 0.55 });
  }

  return entries;
}

export function pickPresetSummaries(
  presets: readonly { id: string; label: string; query: string }[],
  pool: ClausePoolItem[],
): Array<{
  id: string;
  question: string;
  title: string;
  section: string;
  snippet: string;
  href: string;
  kind: "guideline" | "statute";
}> {
  return presets.map((preset) => {
    const ranked = pool
      .map((item) => ({
        item,
        score: lexicalRankScore(preset.query, item.section, item.text),
      }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (!top || top.score <= 0) {
      return {
        id: preset.id,
        question: preset.label,
        title: "",
        section: "",
        snippet: "",
        href: "/documents",
        kind: "guideline" as const,
      };
    }
    return {
      id: preset.id,
      question: preset.label,
      title: top.item.title,
      section: top.item.section,
      snippet: clipAtSentence(readableText(top.item.text), 280),
      href: clauseHref(top.item.entityId, top.item.section),
      kind: top.item.kind,
    };
  });
}

export async function clausePoolFromStore(store: AppStore): Promise<ClausePoolItem[]> {
  const documents = await store.listDocuments();
  const statutes = await store.listStatutes();
  const activeDocs = new Set(
    documents.filter((row) => row.status === "active").map((row) => row.id),
  );
  const activeStatutes = new Set(
    statutes.filter((row) => row.status === "active").map((row) => row.id),
  );
  const pool: ClausePoolItem[] = [];
  for (const chunk of await store.currentChunks()) {
    if (!activeDocs.has(chunk.documentId)) continue;
    const doc = documents.find((row) => row.id === chunk.documentId);
    pool.push({
      id: chunk.id,
      entityId: chunk.documentId,
      title: doc?.title ?? "문서",
      section: chunk.section,
      text: chunk.text,
      kind: "guideline",
    });
  }
  for (const article of await store.currentStatuteArticles()) {
    if (!activeStatutes.has(article.statuteId)) continue;
    const statute = statutes.find((row) => row.id === article.statuteId);
    pool.push({
      id: article.id,
      entityId: article.statuteId,
      title: statute?.title ?? "법령",
      section: article.section,
      text: article.text,
      kind: "statute",
    });
  }
  return pool;
}
