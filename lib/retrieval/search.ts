import { randomUUID } from "node:crypto";
import type { AppStore } from "@/lib/db/types";
import { sha256 } from "@/lib/pipeline/hasher";
import { embedTexts } from "@/lib/pipeline/embed";
import { cosine } from "@/lib/retrieval/cosine";
import { decorateRetrieved, generateAnswer } from "@/lib/llm/answer";
import type { SearchResponse } from "@/lib/types";
import { expandQuery } from "@/lib/retrieval/expand-query";
import { normalizeQuery } from "@/lib/utils";

const CACHE_SIMILARITY = 0.97;
const TOP_K = 6;

export async function searchGuidelines(
  store: AppStore,
  query: string,
  ipHash: string,
): Promise<SearchResponse> {
  const started = Date.now();
  const normalized = normalizeQuery(query);
  const expanded = expandQuery(query);
  const [queryEmbedding] = await embedTexts([expanded]);
  const cached = await findCache(store, normalized, queryEmbedding ?? []);
  if (cached) {
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
      answer: cached.answer,
      sources: cached.sources,
      cacheHit: true,
      searchLogId,
    };
  }

  const docs = await store.listDocuments();
  const chunks = (await store.currentChunks()).filter((c) => c.embedding.length > 0);
  const simStarted = Date.now();
  const expandedTokens = tokenize(expanded);
  // Still O(n) over every current chunk — not a vector index.
  const ranked = chunks
    .map((item) => ({
      item,
      score:
        0.55 * cosine(queryEmbedding ?? [], item.embedding) +
        0.45 * lexicalScore(expandedTokens, `${item.section} ${item.text}`),
    }))
    .filter((row) => row.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
  const similarityMs = Date.now() - simStarted;

  const retrieved = decorateRetrieved(
    ranked.map((r) => r.item),
    docs,
  );
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
    topChunkIds: ranked.map((r) => r.item.id),
    answer,
    createdAt: new Date().toISOString(),
  });
  await store.putQueryCache({
    queryHash: sha256(normalized),
    normalizedQuery: normalized,
    embedding: queryEmbedding ?? [],
    answer,
    sources,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    hitCount: 0,
  });
  return { answer, sources, cacheHit: false, searchLogId };
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

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
}

function lexicalScore(tokens: string[], text: string): number {
  if (tokens.length === 0) return 0;
  const hay = text.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / tokens.length;
}
