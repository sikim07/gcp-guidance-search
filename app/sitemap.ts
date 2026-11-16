import type { MetadataRoute } from "next";
import {
  listCachedCurrentChunks,
  listCachedCurrentStatuteArticles,
  listCachedDocuments,
  listCachedStatutes,
} from "@/lib/cache/public-catalog";
import { buildSitemapEntries } from "@/lib/seo";

/** Keep in sync with `PAGE_REVALIDATE_SECONDS` — Next requires a literal. */
export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [documents, chunks, statutes, articles] = await Promise.all([
    listCachedDocuments(),
    listCachedCurrentChunks(),
    listCachedStatutes(),
    listCachedCurrentStatuteArticles(),
  ]);
  return buildSitemapEntries({
    documents,
    chunks,
    statutes,
    articles,
  });
}
