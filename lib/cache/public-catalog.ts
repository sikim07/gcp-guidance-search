import { unstable_cache } from "next/cache";
import {
  PAGE_REVALIDATE_SECONDS,
  PUBLIC_CATALOG_TAG,
} from "@/lib/cache/revalidate-pages";
import { getFallbackStore } from "@/lib/db/fallback-store";
import { getStore } from "@/lib/db/store";
import { isStoreUnavailableError } from "@/lib/db/supabase-errors";
import type { AppStore } from "@/lib/db/types";
import { isNextProductionBuild } from "@/lib/runtime/next-phase";

/**
 * Public catalog reads for pages/sitemap.
 * - `next build`: seed corpus only — deploy must not depend on Supabase.
 * - runtime: live store first; on quota/pause/network, seed fallback.
 */
export async function readPublicStore<T>(
  run: (store: AppStore) => Promise<T>,
): Promise<T> {
  if (isNextProductionBuild()) {
    return run(await getFallbackStore());
  }
  try {
    return await run(getStore());
  } catch (error) {
    if (!isStoreUnavailableError(error)) throw error;
    return run(await getFallbackStore());
  }
}

/**
 * Cache only small catalog tables. Full chunk/article text exceeds Vercel’s
 * 2MB Data Cache item limit (~3.8MB observed), so those reads stay per-request
 * and use document-scoped queries on clause pages instead.
 */
export const listCachedDocuments = unstable_cache(
  async () => readPublicStore((store) => store.listDocuments()),
  ["public-documents"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedStatutes = unstable_cache(
  async () => readPublicStore((store) => store.listStatutes()),
  ["public-statutes"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedChangeLogs = unstable_cache(
  async () => readPublicStore((store) => store.listChangeLogs()),
  ["public-change-logs"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

/** Not Data-Cached — full text can exceed 2MB. Prefer document-scoped helpers. */
export async function listPublicCurrentChunks() {
  return readPublicStore((store) => store.currentChunks());
}

export async function listPublicCurrentStatuteArticles() {
  return readPublicStore((store) => store.currentStatuteArticles());
}

export const listCachedChunkIndex = unstable_cache(
  async () => readPublicStore((store) => store.currentChunkIndex()),
  ["public-chunk-index"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedStatuteArticleIndex = unstable_cache(
  async () => readPublicStore((store) => store.currentStatuteArticleIndex()),
  ["public-statute-article-index"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export async function listPublicChunksForDocument(documentId: string) {
  return readPublicStore((store) =>
    store.listCurrentChunksByDocument(documentId),
  );
}

export async function listPublicArticlesForStatute(statuteId: string) {
  return readPublicStore((store) =>
    store.listCurrentArticlesByStatute(statuteId),
  );
}
