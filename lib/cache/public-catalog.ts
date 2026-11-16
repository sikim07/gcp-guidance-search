import { unstable_cache } from "next/cache";
import {
  PAGE_REVALIDATE_SECONDS,
  PUBLIC_CATALOG_TAG,
} from "@/lib/cache/revalidate-pages";
import { getStore } from "@/lib/db/store";

/**
 * Shared Data Cache for public ISR routes. Clause pages used to each pull the
 * full chunks/articles tables from Supabase; one cached payload serves them all
 * until the daily window or a revision `revalidateTag`.
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

export const listCachedCurrentChunks = unstable_cache(
  async () => getStore().currentChunks(),
  ["public-chunks"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedCurrentStatuteArticles = unstable_cache(
  async () => getStore().currentStatuteArticles(),
  ["public-statute-articles"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);

export const listCachedChangeLogs = unstable_cache(
  async () => getStore().listChangeLogs(),
  ["public-change-logs"],
  { revalidate: PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
);
