import { unstable_cache } from "next/cache";
import {
  PAGE_REVALIDATE_SECONDS,
  PUBLIC_CATALOG_TAG,
} from "@/lib/cache/revalidate-pages";
import { getStore } from "@/lib/db/store";

/**
 * Cache only small catalog tables. Full chunk/article text exceeds Vercel’s
 * 2MB Data Cache item limit (~3.8MB observed), so those reads stay per-request
 * and use document-scoped queries on clause pages instead.
 */
export const listCachedDocuments = unstable_cache(
  async () => getStore().listDocuments(),
  ["public-documents"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedStatutes = unstable_cache(
  async () => getStore().listStatutes(),
  ["public-statutes"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedChangeLogs = unstable_cache(
  async () => getStore().listChangeLogs(),
  ["public-change-logs"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

/** Not Data-Cached — full text can exceed 2MB. Prefer document-scoped helpers. */
export async function listPublicCurrentChunks() {
  return getStore().currentChunks();
}

export async function listPublicCurrentStatuteArticles() {
  return getStore().currentStatuteArticles();
}

export const listCachedChunkIndex = unstable_cache(
  async () => getStore().currentChunkIndex(),
  ["public-chunk-index"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedStatuteArticleIndex = unstable_cache(
  async () => getStore().currentStatuteArticleIndex(),
  ["public-statute-article-index"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export async function listPublicChunksForDocument(documentId: string) {
  return getStore().listCurrentChunksByDocument(documentId);
}

export async function listPublicArticlesForStatute(statuteId: string) {
  return getStore().listCurrentArticlesByStatute(statuteId);
}
