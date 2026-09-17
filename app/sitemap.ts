import type { MetadataRoute } from "next";
import { getStore } from "@/lib/db/store";
import { buildSitemapEntries } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getStore();
  return buildSitemapEntries({
    documents: await store.listDocuments(),
    chunks: await store.currentChunks(),
    statutes: await store.listStatutes(),
    articles: await store.currentStatuteArticles(),
  });
}
