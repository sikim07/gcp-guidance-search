import { VECTOR_DB_THRESHOLDS } from "@/lib/types";
import { getStore, usingSupabase } from "@/lib/db/store";

export async function GET() {
  const store = await getStore();
  const documents = await store.listDocuments();
  const chunks = await store.currentChunks();
  const statutes = await store.listStatutes();
  const articles = await store.currentStatuteArticles();
  return Response.json({
    ok: true,
    store: usingSupabase() ? "supabase" : "local-json",
    documents: documents.length,
    chunks: chunks.length,
    statutes: statutes.length,
    articles: articles.length,
    pgvectorThresholds: VECTOR_DB_THRESHOLDS,
  });
}
