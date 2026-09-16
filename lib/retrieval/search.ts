import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { sha256 } from "@/lib/pipeline/hasher";
import { embedTexts } from "@/lib/pipeline/embed";
import { cosine } from "@/lib/retrieval/cosine";
import {
  decorateRetrieved,
  generateAnswer,
  isUngroundedAnswer,
  type Retrieved,
} from "@/lib/llm/answer";
import type { Passage, QueryCacheRecord, SearchResponse, SourceKind } from "@/lib/types";
import { detectPassageLanguage } from "@/lib/llm/translate";
import { expandQuery } from "@/lib/retrieval/expand-query";
import { readableText } from "@/lib/text/readable";
import { normalizeQuery } from "@/lib/utils";
import { ANSWER_K, CACHE_GEN, TOP_K, chunksForAnswer } from "@/lib/retrieval/limits";
import {
  filterByScope,
  lexicalScore,
  originOf,
  phraseBoost,
  qualityPenalty,
  sectionBoost,
  tokenize,
  type SearchScope,
} from "@/lib/retrieval/rank";

export { ANSWER_K, TOP_K, chunksForAnswer } from "@/lib/retrieval/limits";

const CACHE_SIMILARITY = 0.97;

export function searchCacheKey(
  normalizedQuery: string,
  scope: SearchScope = "all",
): string {
  return `${CACHE_GEN}${scope}:${normalizedQuery}`;
}

export async function peekExactSearchCache(
  store: AppStore,
  query: string,
  scope: SearchScope = "all",
): Promise<QueryCacheRecord | undefined> {
  const cacheKey = searchCacheKey(normalizeQuery(query), scope);
  const exact = await store.getCachedAnswer(cacheKey);
  if (exact && new Date(exact.expiresAt).getTime() > Date.now()) return exact;
  return undefined;
}

export async function hitCachedSearch(
  store: AppStore,
  query: string,
  ipHash: string,
  cached: QueryCacheRecord,
): Promise<SearchResponse> {
  const started = Date.now();
  await store.bumpCacheHit(cached.queryHash);
  const searchLogId = randomUUID();
  await store.addSearchLog({
    id: searchLogId,
    query,
    normalizedQuery: normalizeQuery(query),
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
    sources: isUngroundedAnswer(cached.answer) ? [] : cached.sources,
    passages: isUngroundedAnswer(cached.answer)
      ? []
      : (cached.passages ?? []).map((row) => ({
          ...row,
          original: readableText(row.original),
          language: detectPassageLanguage(readableText(row.original)),
        })),
    cacheHit: true,
    searchLogId,
  };
}

export async function searchGuidelines(
  store: AppStore,
  query: string,
  ipHash: string,
  scope: SearchScope = "all",
): Promise<SearchResponse> {
  const started = Date.now();
  const normalized = normalizeQuery(query);
  const cacheKey = searchCacheKey(normalized, scope);
  const expanded = expandQuery(query);
  const [queryEmbedding] = await embedTexts([expanded]);
  const cached = await findCache(store, cacheKey, queryEmbedding ?? []);
  if (cached?.passages) {
    return hitCachedSearch(store, query, ipHash, cached);
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
  const pool: Retrieved[] = filterByScope(
    [
      ...decorateRetrieved(chunks, docs),
      ...articles.map((article) => {
        const statute = statutes.find((row) => row.id === article.statuteId);
        return {
          title: statute?.title ?? "법령",
          section: article.section,
          url: statute?.url ?? "",
          text: article.text,
          kind: "statute" as SourceKind,
          origin: originOf("statute", statute?.url ?? "", "kgcp"),
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
    ],
    scope,
  );
  const simStarted = Date.now();
  const expandedTokens = tokenize(expanded);
  const ranked = pool
    .map((item) => ({
      item,
      score:
        0.5 * cosine(queryEmbedding ?? [], item.chunk.embedding) +
        0.5 * lexicalScore(expandedTokens, item.section, item.text) +
        phraseBoost(query, item.section, item.text) +
        sectionBoost(query, item.section) -
        qualityPenalty(item.section, item.text, query),
    }))
    .filter((row) => row.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
  const similarityMs = Date.now() - simStarted;

  const retrieved = ranked.map((r) => r.item);
  const { answer, sources } = await generateAnswer(
    query,
    chunksForAnswer(retrieved, ANSWER_K),
  );
  const passages = isUngroundedAnswer(answer) ? [] : toPassages(retrieved);
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

async function findCache(store: AppStore, cacheKey: string, embedding: number[]) {
  const exact = await store.getCachedAnswer(cacheKey);
  if (exact && new Date(exact.expiresAt).getTime() > Date.now()) return exact;
  if (embedding.length === 0) return undefined;
  const all = await store.listQueryCache();
  const prefix = `${cacheKey.split(":").slice(0, 2).join(":")}:`;
  let best = exact;
  let bestScore = 0;
  for (const row of all) {
    if (new Date(row.expiresAt).getTime() <= Date.now()) continue;
    if (!row.embedding?.length) continue;
    if (!row.normalizedQuery.startsWith(prefix)) continue;
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
