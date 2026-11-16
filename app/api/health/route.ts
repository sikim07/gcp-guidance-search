import { VECTOR_DB_THRESHOLDS } from "@/lib/types";
import { getStore, usingSupabase } from "@/lib/db/store";
import { isStoreUnavailableError } from "@/lib/db/supabase-errors";

export async function GET() {
  if (!usingSupabase()) {
    return Response.json({
      ok: true,
      store: "local-json",
      degraded: false,
      pgvectorThresholds: VECTOR_DB_THRESHOLDS,
    });
  }
  try {
    const store = getStore();
    const documents = await store.listDocuments();
    const chunks = await store.currentChunks();
    const statutes = await store.listStatutes();
    const articles = await store.currentStatuteArticles();
    return Response.json({
      ok: true,
      store: "supabase",
      degraded: false,
      documents: documents.length,
      chunks: chunks.length,
      statutes: statutes.length,
      articles: articles.length,
      pgvectorThresholds: VECTOR_DB_THRESHOLDS,
    });
  } catch (error) {
    const unavailable = isStoreUnavailableError(error);
    return Response.json(
      {
        ok: false,
        store: "supabase",
        degraded: true,
        code: unavailable ? "store_unavailable" : "store_error",
        error:
          error instanceof Error ? error.message : "store health check failed",
        pgvectorThresholds: VECTOR_DB_THRESHOLDS,
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
