import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { sha256 } from "@/lib/pipeline/hasher";
import { embedTexts } from "@/lib/pipeline/embed";
import { cosine } from "@/lib/retrieval/cosine";
import { decorateRetrieved, generateAnswer, type Retrieved } from "@/lib/llm/answer";
import type { Passage, SearchResponse, SourceKind } from "@/lib/types";
import { detectPassageLanguage } from "@/lib/llm/translate";
import { expandQuery } from "@/lib/retrieval/expand-query";
import { readableText } from "@/lib/text/readable";
import { normalizeQuery } from "@/lib/utils";

const CACHE_SIMILARITY = 0.97;
const TOP_K = 6;
const CACHE_GEN = "v2:";

export async function searchGuidelines(
  store: AppStore,
  query: string,
  ipHash: string,
): Promise<SearchResponse> {
  const started = Date.now();
  const normalized = normalizeQuery(query);
  const cacheKey = `${CACHE_GEN}${normalized}`;
  const expanded = expandQuery(query);
  const [queryEmbedding] = await embedTexts([expanded]);
  const cached = await findCache(store, cacheKey, queryEmbedding ?? []);
  if (cached?.passages) {
    await store.bumpCacheHit(cached.queryHash);
    const searchLogId = randomUUID();
    await store.addSearchLog({
      id: searchLogId,
      query,
      normalizedQuery: normalized,
      ipHash,
      cacheHit: true,
      latencyMs: Date.now() - started,
      similarityMs: 0,
      topChunkIds: [],
      answer: cached.answer,
      createdAt: new Date().toISOString(),
    });
    return {
      answer: readableText(cached.answer),
      sources: cached.sources,
      passages: (cached.passages ?? []).map((row) => ({
        ...row,
        original: readableText(row.original),
        language: detectPassageLanguage(readableText(row.original)),
      })),
      cacheHit: true,
      searchLogId,
    };
  }

  const docs = await store.listDocuments();
  const statutes = await store.listStatutes();
  const activeDocIds = new Set(
    docs.filter((d) => d.status === "active").map((d) => d.id),
  );
  const activeStatuteIds = new Set(
    statutes.filter((s) => s.status === "active").map((s) => s.id),
  );
  const chunks = (await store.currentChunks()).filter(
    (c) => c.embedding.length > 0 && activeDocIds.has(c.documentId),
  );
  const articles = (await store.currentStatuteArticles()).filter(
    (a) => a.embedding.length > 0 && activeStatuteIds.has(a.statuteId),
  );
  const pool: Retrieved[] = [
    ...decorateRetrieved(chunks, docs),
    ...articles.map((article) => {
      const statute = statutes.find((row) => row.id === article.statuteId);
      return {
        title: statute?.title ?? "법령",
        section: article.section,
        url: statute?.url ?? "",
        text: article.text,
        kind: "statute" as SourceKind,
        chunk: {
          id: article.id,
          versionId: article.revisionId,
          documentId: article.statuteId,
          section: article.section,
          text: article.text,
          embedding: article.embedding,
          isCurrent: article.isCurrent,
        },
      };
    }),
  ];
  const simStarted = Date.now();
  const expandedTokens = tokenize(expanded);
  // Still O(n) over every current chunk — not a vector index.
  const ranked = pool
    .map((item) => ({
      item,
      score:
        0.5 * cosine(queryEmbedding ?? [], item.chunk.embedding) +
        0.5 * lexicalScore(expandedTokens, item.section, item.text) +
        phraseBoost(query, item.section, item.text),
    }))
    .filter((row) => row.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
  const similarityMs = Date.now() - simStarted;

  const retrieved = ranked.map((r) => r.item);
  const passages = toPassages(retrieved);
  const { answer, sources } = await generateAnswer(query, retrieved);
  const searchLogId = randomUUID();
  await store.addSearchLog({
    id: searchLogId,
    query,
    normalizedQuery: normalized,
    ipHash,
    cacheHit: false,
    latencyMs: Date.now() - started,
    similarityMs,
    topChunkIds: ranked.map((r) => r.item.chunk.id),
    answer,
    createdAt: new Date().toISOString(),
  });
  await store.putQueryCache({
    queryHash: sha256(cacheKey),
    normalizedQuery: cacheKey,
    embedding: queryEmbedding ?? [],
    answer,
    sources,
    passages,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    hitCount: 0,
  });
  return { answer, sources, passages, cacheHit: false, searchLogId };
}

async function findCache(store: AppStore, normalized: string, embedding: number[]) {
  const exact = await store.getCachedAnswer(normalized);
  if (exact && new Date(exact.expiresAt).getTime() > Date.now()) return exact;
  if (embedding.length === 0) return undefined;
  const all = await store.listQueryCache();
  let best = exact;
  let bestScore = 0;
  for (const row of all) {
    if (new Date(row.expiresAt).getTime() <= Date.now()) continue;
    if (!row.embedding?.length) continue;
    const score = cosine(embedding, row.embedding);
    if (score >= CACHE_SIMILARITY && score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return best;
}

function toPassages(retrieved: Retrieved[]): Passage[] {
  return retrieved.map((row) => ({
    chunkId: row.chunk.id,
    title: row.title,
    section: row.section,
    url: row.url,
    kind: row.kind ?? "guideline",
    original: readableText(row.text),
    language: detectPassageLanguage(readableText(row.text)),
  }));
}

function tokenize(text: string): string[] {
  const hangul = text.match(/[\p{Script=Hangul}]{2,}/gu) ?? [];
  const latin = text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return [...hangul, ...latin];
}

function lexicalScore(tokens: string[], section: string, text: string): number {
  if (tokens.length === 0) return 0;
  const hay = `${section} ${text}`.toLowerCase();
  const sectionHay = section.toLowerCase();
  let hits = 0;
  let sectionHits = 0;
  for (const token of tokens) {
    const needle = token.toLowerCase();
    if (hay.includes(needle)) hits += 1;
    if (sectionHay.includes(needle)) sectionHits += 1;
  }
  return Math.min(1, hits / tokens.length + 0.25 * (sectionHits / tokens.length));
}

function phraseBoost(query: string, section: string, text: string): number {
  const q = query.toLowerCase();
  const hay = `${section}\n${text}`.toLowerCase();
  const head = text.trim().slice(0, 80);
  let boost = 0;
  if (
    /서면\s*동의|informed consent|동의/.test(q) &&
    /서면\s*동의|informed consent/.test(hay)
  ) {
    boost += 0.14;
  }
  if (/감사추적|audit trail/.test(q) && /감사추적|audit trail/.test(hay)) {
    boost += 0.12;
  }
  if (/임상시험계획/.test(q) && /임상시험계획/.test(hay)) {
    boost += 0.1;
  }
  if (/4\.8/.test(section) && /동의|consent/.test(q)) {
    boost += 0.18;
  }
  if (
    (/용어의 정의|definitions/i.test(section) || /^용어의 정의/.test(head)) &&
    !/정의|definition/i.test(q)
  ) {
    boost -= 0.28;
  }
  return boost;
}
